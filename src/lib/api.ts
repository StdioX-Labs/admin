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

// Shared event type matching /events/get/all response
export interface ActiveEventTicket {
  id: number;
  ticketName: string;
  ticketPrice: number;
  quantityAvailable: number;
  soldQuantity: number;
  isActive: boolean;
  ticketsToIssue: number;
  isSoldOut: boolean;
  isFree: boolean;
  ticketStatus: string;
  createAt: string;
}

export interface ActiveEvent {
  id: number;
  eventName: string;
  eventDescription: string;
  eventPosterUrl: string;
  eventCategoryId: number;
  ticketSaleStartDate: string;
  ticketSaleEndDate: string;
  eventLocation: string;
  eventStartDate: string;
  eventEndDate: string;
  isActive: boolean;
  published: boolean;
  tickets: ActiveEventTicket[];
  createdById: number;
  companyId: number;
  companyName: string;
  comission: number;
  category: string;
  date: string;
  time: string;
  isFeatured: boolean;
  price: number;
  slug: string;
  currency: string;
}

export interface AdminEventTicketSummary {
  ticketId: number;
  ticketName: string;
  ticketPrice: number;
  ticketStatus?: string;
  // Fields returned by /admin/events/get/all
  ticketsSold?: number;
  revenue?: number;
  // Fields returned by /admin/events/all (newer endpoint)
  uniqueTicketCount?: number;
  totalTicketSaleBalance?: number;
  originalTicketCount?: number;
  ticketCount?: number; // remaining available
}

export interface AdminEvent {
  eventId: number;
  eventName: string;
  slug: string;
  eventDescription: string;
  eventPosterUrl: string;
  eventCategory: string;
  eventLocation: string;
  ticketSaleStartDate: string;
  ticketSaleEndDate: string;
  eventStartDate: string;
  eventEndDate: string;
  active: boolean;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  companyId: number;
  companyName: string;
  percentageCommission: number | null;
  totalTicketsSold: number;
  totalRevenue: number;
  totalPlatformFee: number;
  analytics: {
    dailySalesGraph: string;
    currentWeekSales: number;
    totalAttendees: number;
    totalTicketTypes: number;
  };
  ticketSummaries: AdminEventTicketSummary[];
}

// Events API
export const eventsApi = {
  // Fetch all events with pagination
  getAllEvents: async (page: number = 0, size: number = 10, searchName?: string, status?: string) => {
    let url = `/events?page=${page}&size=${size}`;
    if (searchName) url += `&searchName=${encodeURIComponent(searchName)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    return fetchApi<{
      data: {
        data: AdminEvent[];
        page: number;
        size: number;
        totalElements: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
      };
      message: string;
      status: boolean;
    }>(url, { method: 'GET' });
  },

  // Fetch ALL pages of active events from the admin API (for sales report)
  getAllActiveAdminEvents: async (): Promise<AdminEvent[]> => {
    const PAGE_SIZE = 50;
    const collected: AdminEvent[] = [];
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const resp = await fetchApi<{
        data: {
          data: AdminEvent[];
          hasNext: boolean;
        };
        status: boolean;
        message: string;
      }>(`/events?page=${page}&size=${PAGE_SIZE}&status=ACTIVE`, { method: 'GET' });
      if (resp.status && resp.data?.data) {
        collected.push(...resp.data.data);
        hasMore = resp.data.hasNext;
        page++;
      } else {
        break;
      }
    }
    return collected;
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
    }>(`/event/update?eventId=${eventId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update ticket
  updateTicket: async (ticketId: string | number, data: Record<string, unknown>) => {
    return fetchApi<{
      data: unknown;
      message: string;
      status: boolean;
    }>(`/ticket/update?ticketId=${ticketId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Request OTP challenge for the currently logged-in admin
  requestChallenge: async () => {
    return fetchApi<{ status: boolean; message: string }>('/user/challenge', {
      method: 'GET',
    });
  },

  // Toggle ticket sale status (suspend / activate)
  toggleTicketStatus: async (ticketId: string | number, data: { otp: string; ticketStatus: string }) => {
    return fetchApi<{
      data: unknown;
      message: string;
      status: boolean;
    }>(`/ticket/status/toggle?ticketId=${ticketId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Create new ticket
  createTicket: async (data: Record<string, unknown>) => {
    return fetchApi<{
      data: unknown;
      message: string;
      status: boolean;
    }>('/tickets/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Fetch all active events from /events/get/all
  getActiveEvents: async () => {
    return fetchApi<{
      events: ActiveEvent[];
      message: string;
      status: boolean;
    }>('/active-events', {
      method: 'GET',
    });
  },

  // Activate event
  activateEvent: async (eventId: string | number, commission: number = 5.0) => {
    return fetchApi<{
      data: unknown;
      message: string;
      status: boolean;
    }>('/events/activate', {
      method: 'POST',
      body: JSON.stringify({ 
        eventId: typeof eventId === 'string' ? parseInt(eventId) : eventId, 
        commission: parseFloat(commission.toString())
      }),
    });
  },
};

// B2B API
export const b2bApi = {
  getActiveSubscriptions: async () => {
    return fetchApi<{
      data: unknown;
      message: string;
      status: boolean;
    }>(`/b2b-subscriptions/active`, {
      method: 'GET',
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

// Transactions API
export interface TransactionRecord {
  id: number;
  companyId: number;
  event: {
    id: number;
    eventName: string;
    eventPosterUrl: string;
    eventLocation: string;
    eventStartDate: string;
    comission: number;
    currency: string;
  };
  ticket: {
    id: number;
    ticketName: string;
    ticketPrice: number;
    soldQuantity: number;
    quantityAvailable: number;
  };
  buyer: {
    id: number;
    email: string | null;
    mobileNumber: string;
    firstName: string | null;
    lastName: string | null;
    createdAt: string;
  };
  barcode: string;
  transactionId: string;
  transactionType: string;
  transactionAmount: number;
  platformFee: number;
  createdAt: string;
}

export interface TransactionStats {
  ticketsSold: number;
  platformLiability: number;
  totalSales: number;
}

export const transactionsApi = {
  fetchDetailed: async (params: {
    id: number;
    idType: 'company' | 'event' | 'user';
    transactionType?: string;
    page?: number;
    size?: number;
  }) => {
    return fetchApi<{
      data: {
        data: TransactionRecord[];
        page: number;
        size: number;
        totalElements: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
      };
      stats: TransactionStats;
      message: string;
      status: boolean;
    }>('/transactions/detailed', {
      method: 'POST',
      body: JSON.stringify({
        id: params.id,
        idType: params.idType,
        transactionType: params.transactionType ?? 'TICKET_SALE',
        page: params.page ?? 0,
        size: params.size ?? 50,
      }),
    });
  },
};

// Company API
export interface Company {
  id: number;
  companyName: string;
  emailAddress: string;
  phoneNumber: string;
  physicalAddress: string;
  postalAddress: string;
  profileType: string;
  currency: string;
  bio: string | null;
  profilePhoto: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const companyApi = {
  getById: async (companyId: number | string) => {
    return fetchApi<{
      company?: Company;
      data?: unknown;
      message: string;
      status: boolean;
    }>(`/company/${companyId}`, { method: 'GET' });
  },

  getAll: async (page = 0, size = 20, search?: string) => {
    let url = `/companies?page=${page}&size=${size}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return fetchApi<{
      data?: {
        companies: Company[];
        page: number;
        size: number;
        totalElements: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
      };
      message: string;
      status: boolean;
    }>(url, { method: 'GET' });
  },
};

// Event creation API
export const createEventApi = {
  createEvent: async (data: {
    eventName: string;
    eventDescription: string;
    eventPosterUrl: string;
    eventCategory: { id: number };
    ticketSaleStartDate: string;
    ticketSaleEndDate: string;
    eventLocation: string;
    eventStartDate: string;
    eventEndDate: string;
    percentageComission: number;
    users: { id: number };
    company: { id: number };
    slug: string;
    currency: string;
  }) => {
    return fetchApi<{
      message: string;
      event_id?: number;
      event?: { id: number; eventName: string; slug: string };
      status: boolean;
    }>('/event/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  createTicket: async (data: {
    event: { id: number };
    ticketName: string;
    ticketPrice: number;
    quantityAvailable: number;
    ticketsToIssue: number;
    ticketLimitPerPerson: number;
    numberOfComplementary: number;
    ticketSaleStartDate: string;
    ticketSaleEndDate: string;
    isFree: boolean;
    smsPurchaseMessageTemplate?: string;
    emailPurchaseMessageTemplate?: string;
  }) => {
    return fetchApi<{
      message: string;
      ticket?: { id: number; ticketName: string };
      status: boolean;
    }>('/tickets/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
