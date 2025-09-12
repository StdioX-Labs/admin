import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api';

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
    mutationFn: (otp: string) => authApi.validateOtp(otp),
    onSuccess: (data) => {
      if (data.status && data.user) {
        // Store minimal user data in localStorage (non-sensitive info only)
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('userName', data.user.company_name || '');

        // Redirect to dashboard
        router.push('/dashboard');
      }
    },
    onError: (error) => {
      console.error('OTP validation failed:', error);
    }
  });

  const requestOtp = async (identifier: string, method: 'email' | 'phone' = 'email') => {
    return requestOtpMutation.mutateAsync({ identifier, method });
  };

  const validateOtp = async (otp: string) => {
    return validateOtpMutation.mutateAsync(otp);
  };

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
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
    logout,
    isRequestingOtp: requestOtpMutation.isPending,
    isValidatingOtp: validateOtpMutation.isPending,
    isLoggingOut,
    requestOtpError: requestOtpMutation.error,
    validateOtpError: validateOtpMutation.error
  };
};