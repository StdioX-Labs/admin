import { QueryClient } from '@tanstack/react-query';

// We'll use the internal API routes instead of the external API directly
const API_BASE_URL = '/api';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// API error handling
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

// Base fetch function with improved error handling and detailed debugging
async function fetchApi<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  // Log the request for debugging
  const requestId = Math.random().toString(36).substring(2, 9);
  console.log(`[API:${requestId}] Request to ${url}`, {
    method: options.method || 'GET',
    headers: options.headers,
    hasBody: !!options.body
  });

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Request-ID': requestId, // Add request ID for tracing
        ...options.headers,
      },
      credentials: 'include', // Important for cookies
    });

    // Log response details for debugging
    console.log(`[API:${requestId}] Response from ${url}`, {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      headers: Object.fromEntries([...response.headers.entries()]),
    });

    // First check if we got a non-JSON response
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Clone the response before reading the text to avoid consuming the body
      const clonedResponse = response.clone();
      const text = await response.text();
      console.error(`[API:${requestId}] Non-JSON response from ${url}:`, {
        status: clonedResponse.status,
        contentType,
        url: clonedResponse.url,
        textPreview: text.substring(0, 500),
        fullText: text, // Include the full text for debugging
      });
      throw new ApiError(
        clonedResponse.status,
        `Expected JSON response but got ${contentType || 'unknown content type'}`
      );
    }

    // Now try to parse JSON
    let data;
    try {
      data = await response.json();
      console.log(`[API:${requestId}] Parsed JSON from ${url}`, {
        success: true,
        dataPreview: JSON.stringify(data).substring(0, 100) + '...'
      });
    } catch (e) {
      console.error(`[API:${requestId}] Failed to parse JSON from ${url}:`, e);
      throw new ApiError(500, "Invalid JSON response");
    }

    if (!response.ok) {
      console.warn(`[API:${requestId}] API error from ${url}:`, {
        status: response.status,
        data
      });
      throw new ApiError(
        response.status,
        data?.message || `HTTP error ${response.status}`,
        data
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors and other fetch failures
    if (error instanceof Error) {
      console.error(`[API:${requestId}] Request to ${url} failed:`, error);
      throw new ApiError(500, error.message || 'Network error');
    }

    throw new ApiError(500, 'Unknown error occurred');
  }
}

// Types for login responses
export interface LoginResponse {
  message: string;
  user: {
    phoneNumber: string;
    role: string;
    is_active: boolean;
    kycStatus: string;
    profile_type: string;
    company_id: number;
    user_id: number;
    company_name: string;
    email: string;
  };
  status: boolean;
}

export interface OtpValidationResponse {
  message: string;
  user?: {
    phoneNumber: string;
    role: string;
    is_active: boolean;
    kycStatus: string;
    profile_type: string;
    company_id: number;
    user_id: number;
    company_name: string;
    email: string;
  };
  status: boolean;
}

// Login API functions
export const authApi = {
  // Request OTP for login
  requestOtp: async (identifier: string, method: 'email' | 'phone' = 'email') => {
    return fetchApi<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        id: identifier,
        method: method
      }),
    });
  },

  // Validate OTP
  validateOtp: async (otp: string) => {
    return fetchApi<OtpValidationResponse>('/auth/validate-otp', {
      method: 'POST',
      body: JSON.stringify({ otp }),
    });
  },

  // Check authentication status
  checkAuth: async () => {
    return fetchApi<{ isAuthenticated: boolean, user?: Record<string, unknown> }>('/auth/status', {
      method: 'GET',
    });
  },

  // Logout
  logout: async () => {
    return fetchApi<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    });
  }
};

// Events API
export const eventsApi = {
  // Fetch all events with pagination
  getAllEvents: async (page: number = 0, size: number = 50) => {
    return fetchApi<{
      data: {
        data: unknown[];
        page: number;
        size: number;
        totalElements: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
      };
      message: string;
      status: boolean;
    }>(`/events?page=${page}&size=${size}`, {
      method: 'GET',
    });
  },

  // Fetch single event by ID with full details including tickets
  getEventById: async (eventId: string | number) => {
    return fetchApi<{
      event?: unknown;
      data?: unknown;
      message: string;
      status: boolean;
    }>(`/events/${eventId}`, {
      method: 'GET',
    });
  },

  // Update event
  updateEvent: async (eventId: string | number, data: Record<string, unknown>) => {
    return fetchApi<{
      data: unknown;
      message: string;
      status: boolean;
    }>(`/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Update ticket
  updateTicket: async (ticketId: string | number, data: Record<string, unknown>) => {
    return fetchApi<{
      data: unknown;
      message: string;
      status: boolean;
    }>(`/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Dashboard API
export const dashboardApi = {
  // Fetch dashboard stats
  getStats: async () => {
    return fetchApi<{
      data: {
        totalCompanies: number;
        activeEvents: number;
        totalRevenue: number;
        totalUsers: number;
        pendingApprovals: number;
        activeB2BSubscriptions: number;
      };
      message: string;
      status: boolean;
    }>('/dashboard/stats', {
      method: 'GET',
    });
  },
};

