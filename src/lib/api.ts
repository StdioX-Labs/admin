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
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

// Base fetch function with improved error handling
async function fetchApi<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Important for cookies
    });

    // Try to parse JSON
    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error("Failed to parse JSON response:", e);
      throw new ApiError(500, "Invalid JSON response");
    }

    if (!response.ok) {
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
      console.error("API request failed:", error);
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
    return fetchApi<{ isAuthenticated: boolean, user?: any }>('/auth/status', {
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
