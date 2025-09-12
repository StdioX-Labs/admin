/**
 * Rate limiting utilities for API routes
 * Provides IP-based and identifier-based rate limiting
 */

// Store IP request logs with timestamps and counters
const ipRateLimitMap = new Map<string, {
  timestamp: number,
  count: number,
  blockedUntil: number | null,
  backoffTime: number
}>();

// Store identifier-based request logs (like email addresses)
export const identifierRateLimitMap = new Map<string, {
  timestamp: number,
  count: number,
  blockedUntil: number | null,
  backoffTime: number
}>();

// Rate limit configuration
export const INITIAL_BACKOFF = 60 * 1000; // Start with 1 minute (60 seconds)
export const MAX_REQUESTS = 5; // Block after 5 requests
export const BLOCK_DURATION = 60 * 60 * 1000; // 1 hour block
export const IP_MAX_REQUESTS = 10; // Allow more requests per IP than per identifier
export const IP_BLOCK_DURATION = 30 * 60 * 1000; // Block IPs for 30 minutes

/**
 * Check if a request is rate limited based on both IP and identifier
 * @param ip The IP address of the requester
 * @param identifier The identifier (e.g., email) being used
 * @returns Object with status and message if rate limited, or null if not
 */
export function checkRateLimit(ip: string, identifier?: string) {
  const now = Date.now();

  // First check IP-based rate limiting
  const ipLimitResult = checkIpRateLimit(ip, now);
  if (ipLimitResult) {
    return ipLimitResult;
  }

  // Then check identifier-based rate limiting if an identifier is provided
  if (identifier) {
    const identifierLimitResult = checkIdentifierRateLimit(identifier, now);
    if (identifierLimitResult) {
      return identifierLimitResult;
    }

    // Record this request for the identifier
    recordIdentifierRequest(identifier, now);
  }

  // Record this request for the IP
  recordIpRequest(ip, now);

  // Not rate limited
  return null;
}

/**
 * Check if an IP address is rate limited
 */
function checkIpRateLimit(ip: string, now: number) {
  const requestLog = ipRateLimitMap.get(ip);

  if (requestLog) {
    // Check if the IP is blocked
    if (requestLog.blockedUntil && now < requestLog.blockedUntil) {
      const remainingBlockTime = Math.ceil((requestLog.blockedUntil - now) / 60000); // in minutes
      return {
        status: 429,
        message: `Too many requests from this IP. Please try again in ${remainingBlockTime} minute${remainingBlockTime > 1 ? 's' : ''}.`
      };
    }

    // Check if we need to enforce backoff time
    if (now - requestLog.timestamp < requestLog.backoffTime) {
      const waitTime = Math.ceil((requestLog.timestamp + requestLog.backoffTime - now) / 60000); // in minutes
      return {
        status: 429,
        message: `Please wait ${waitTime} minute${waitTime > 1 ? 's' : ''} before sending another request.`
      };
    }
  }

  return null;
}

/**
 * Check if an identifier (like email) is rate limited
 */
function checkIdentifierRateLimit(identifier: string, now: number) {
  const requestLog = identifierRateLimitMap.get(identifier);

  if (requestLog) {
    // Check if the identifier is blocked
    if (requestLog.blockedUntil && now < requestLog.blockedUntil) {
      const remainingBlockTime = Math.ceil((requestLog.blockedUntil - now) / 60000); // in minutes
      return {
        status: 429,
        message: `Too many requests for this account. Please try again in ${remainingBlockTime} minute${remainingBlockTime > 1 ? 's' : ''}.`
      };
    }

    // Check if we need to enforce backoff time
    if (now - requestLog.timestamp < requestLog.backoffTime) {
      const waitTime = Math.ceil((requestLog.timestamp + requestLog.backoffTime - now) / 60000); // in minutes
      return {
        status: 429,
        message: `Please wait ${waitTime} minute${waitTime > 1 ? 's' : ''} before requesting another code.`
      };
    }
  }

  return null;
}

/**
 * Record a request from an IP address and update its rate limiting status
 */
function recordIpRequest(ip: string, now: number) {
  const requestLog = ipRateLimitMap.get(ip);

  if (requestLog) {
    // Update the existing record
    requestLog.timestamp = now;
    requestLog.count += 1;
    requestLog.backoffTime = Math.min(
      INITIAL_BACKOFF * Math.pow(1.5, requestLog.count - 1), // Grow slower than identifier backoff
      10 * 60 * 1000 // Cap at 10 minutes
    );

    // If they've made too many requests, block the IP
    if (requestLog.count >= IP_MAX_REQUESTS) {
      requestLog.blockedUntil = now + IP_BLOCK_DURATION;
    }

    ipRateLimitMap.set(ip, requestLog);
  } else {
    // First request from this IP
    ipRateLimitMap.set(ip, {
      timestamp: now,
      count: 1,
      blockedUntil: null,
      backoffTime: INITIAL_BACKOFF / 2 // Start with a shorter backoff for IPs
    });
  }
}

/**
 * Record a request for an identifier and update its rate limiting status
 */
function recordIdentifierRequest(identifier: string, now: number) {
  const requestLog = identifierRateLimitMap.get(identifier);

  if (requestLog) {
    // Update the existing record
    requestLog.timestamp = now;
    requestLog.count += 1;
    requestLog.backoffTime = INITIAL_BACKOFF * Math.pow(2, requestLog.count - 1);

    // If they've made too many requests, block the identifier
    if (requestLog.count >= MAX_REQUESTS) {
      requestLog.blockedUntil = now + BLOCK_DURATION;
    }

    identifierRateLimitMap.set(identifier, requestLog);
  } else {
    // First request for this identifier
    identifierRateLimitMap.set(identifier, {
      timestamp: now,
      count: 1,
      blockedUntil: null,
      backoffTime: INITIAL_BACKOFF
    });
  }
}

/**
 * Reset rate limiting for an identifier
 */
export function resetRateLimitForIdentifier(identifier: string) {
  identifierRateLimitMap.delete(identifier);
}

/**
 * Clean up old rate limiting data (call this periodically)
 */
export function cleanupRateLimits() {
  const now = Date.now();
  const expiryTime = 24 * 60 * 60 * 1000; // 24 hours

  // Clean up IP map
  for (const [ip, data] of ipRateLimitMap.entries()) {
    if (now - data.timestamp > expiryTime && !data.blockedUntil) {
      ipRateLimitMap.delete(ip);
    }
  }

  // Clean up identifier map
  for (const [id, data] of identifierRateLimitMap.entries()) {
    if (now - data.timestamp > expiryTime && !data.blockedUntil) {
      identifierRateLimitMap.delete(id);
    }
  }
}
