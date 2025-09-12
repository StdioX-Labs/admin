import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api';

interface LoginCredentials {
  email: string;
  password: string;
}

export const useAuth = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  // Request OTP mutation
  const requestOtpMutation = useMutation({
    mutationFn: ({ identifier, method }: { identifier: string; method: 'email' | 'phone' }) =>
      authApi.requestOtp(identifier, method),
    onError: (error) => {
      console.error('OTP request failed:', error);
    }
  });

  // Validate OTP mutation
  const validateOtpMutation = useMutation({
    mutationFn: ({ otp, mobileNumber }: { otp: string; mobileNumber: string }) =>
      authApi.validateOtp(otp, mobileNumber),
    onSuccess: (data) => {
      if (data.status && data.user) {
        // Store user data and token
        if (data.token) {
          localStorage.setItem('authToken', data.token);
        }
        localStorage.setItem('userData', JSON.stringify(data.user));

        // Redirect based on user role
        if (data.user.role === 'SUPER_ADMIN') {
          router.push('/dashboard');
        } else {
          // Redirect non-admin users elsewhere or show access denied
          router.push('/access-denied');
        }
      }
    },
    onError: (error) => {
      console.error('OTP validation failed:', error);
    }
  });

  // Direct login mutation (with email/password)
  const loginMutation = useMutation({
    mutationFn: ({ mobile_number, password }: { mobile_number: string; password: string }) =>
      authApi.login(mobile_number, password),
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userData', JSON.stringify(data.user));

        if (data.user.role === 'SUPER_ADMIN') {
          router.push('/dashboard');
        } else {
          router.push('/access-denied');
        }
      }
    },
    onError: (error) => {
      console.error('Login failed:', error);
    }
  });

  const requestOtp = async (identifier: string, method: 'email' | 'phone' = 'email') => {
    return requestOtpMutation.mutateAsync({ identifier, method });
  };

  const validateOtp = async (otp: string, mobileNumber: string) => {
    return validateOtpMutation.mutateAsync({ otp, mobileNumber });
  };

  const login = async (mobile_number: string, password: string) => {
    return loginMutation.mutateAsync({ mobile_number, password });
  };

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return {
    requestOtp,
    validateOtp,
    login,
    logout,
    isRequestingOtp: requestOtpMutation.isPending,
    isValidatingOtp: validateOtpMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut,
    requestOtpError: requestOtpMutation.error,
    validateOtpError: validateOtpMutation.error,
    loginError: loginMutation.error
  };
};