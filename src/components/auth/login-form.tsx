'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingButton, FullScreenLoader } from "@/components/ui/loader";
import { useAuth } from '@/lib/hooks/useAuth';
import { OtpInput } from "@/components/ui/otp-input";

interface LoginFormData {
  email: string;
  otp: string;
}

interface ValidationErrors {
  email?: string;
  otp?: string;
}

export const LoginForm = () => {
  const router = useRouter();
  const { requestOtp, validateOtp, isRequestingOtp, isValidatingOtp } = useAuth();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    otp: ''
  });
  const [step, setStep] = useState<'email' | 'otp' | 'login'>('email');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [otpSent, setOtpSent] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  const validateEmail = (email: string): string | undefined => {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
    return undefined;
  };

  const validateOtpInput = (otp: string): string | undefined => {
    if (!otp) return 'Verification code is required';
    if (otp.length !== 4) return 'Verification code must be 4 digits';
    if (!/^\d{4}$/.test(otp)) return 'Verification code must contain only numbers';
    return undefined;
  };

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation errors when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    if (error) setError('');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(formData.email);
    if (emailError) {
      setValidationErrors({ email: emailError });
      return;
    }

    setError('');
    setValidationErrors({});

    try {
      // Call the API to request OTP
      const response = await requestOtp(formData.email, 'email');

      if (response.status) {
        setOtpSent(true);
        setStep('otp');
        setUserData(response.user);
      } else {
        throw new Error(response.message || 'Failed to send verification code');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send verification code');
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const otpError = validateOtpInput(formData.otp);
    if (otpError) {
      setValidationErrors({ otp: otpError });
      return;
    }

    setError('');
    setValidationErrors({});

    try {
      // Call the API to validate OTP
      const response = await validateOtp(formData.otp, userData?.phoneNumber || '');

      if (response.status && response.user) {
        // Verify if user is a SUPER_ADMIN
        if (response.user.role === 'SUPER_ADMIN') {
          setStep('login');
          // The useAuth hook handles the redirection
        } else {
          throw new Error('Access denied. Only administrators can access this portal.');
        }
      } else {
        throw new Error(response.message || 'Invalid verification code');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verification failed');
    }
  };

  const handleResendOtp = async () => {
    setError('');

    try {
      // Re-request the OTP
      const response = await requestOtp(formData.email, 'email');

      if (response.status) {
        setOtpSent(true);
      } else {
        throw new Error(response.message || 'Failed to resend verification code');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to resend verification code');
    }
  };

  if (step === 'login') {
    return <FullScreenLoader message="Logging you in..." variant="spinner" />;
  }

  return (
    <div className=" bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-2 rounded-2xl">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-xl shadow-xl border border-white/20 p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {step === 'email' ? 'Welcome' : 'Verify Your Identity'}
          </h2>
          <p className="text-gray-600 mt-1 text-sm">
            {step === 'email'
              ? 'Sign in to your admin dashboard'
              : 'Enter the verification code sent to your email'
            }
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-sm text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Email Step */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isRequestingOtp}
                placeholder="Enter your email address"
                className={`h-11 text-base transition-all duration-200 ${
                  validationErrors.email
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                    : 'border-gray-200 focus:border-slate-900 focus:ring-slate-900 hover:border-gray-300'
                }`}
              />
              {validationErrors.email && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>
              )}
            </div>

            <LoadingButton
              type="submit"
              isLoading={isRequestingOtp}
              loadingText="Sending..."
              variant="primary"
              className="w-full h-11 bg-gradient-to-r from-slate-600 to-indigo-600 hover:from-slate-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 focus:from-blue-700 focus:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl active:shadow-md focus:ring-4 focus:ring-blue-100 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Send Verification Code
            </LoadingButton>
          </form>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-sm font-medium text-gray-700">
                Verification Code
              </Label>
              <OtpInput
                id="otp"
                value={formData.otp}
                onChange={(value) => handleInputChange('otp', value)}
                length={4}
                disabled={isValidatingOtp}
                placeholder="••••"
                className={`h-11 text-center text-lg tracking-widest font-mono transition-all duration-200 ${
                  validationErrors.otp
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50'
                    : 'border-gray-200 focus:border-slate-900 focus:ring-slate-900 hover:border-gray-300'
                }`}
              />
              {validationErrors.otp && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.otp}</p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Sent to {formData.email}
                </p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={handleResendOtp}
                  disabled={isRequestingOtp || isValidatingOtp}
                  className="text-xs font-medium text-blue-600 hover:text-slate-900 active:text-blue-700 focus:text-blue-700 p-0 h-auto transition-colors duration-150 hover:underline"
                >
                  {isRequestingOtp ? 'Resending...' : 'Resend'}
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('email')}
                disabled={isValidatingOtp}
                className="flex-1 h-11 border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus:bg-gray-50 hover:border-gray-300 active:border-gray-400 focus:border-gray-300 font-medium rounded-lg transition-all duration-200 hover:shadow-md focus:ring-2 focus:ring-gray-100"
              >
                Back
              </Button>
              <LoadingButton
                type="submit"
                isLoading={isValidatingOtp}
                loadingText="Verifying..."
                variant="primary"
                className="flex-1 h-11 bg-gradient-to-r from-slate-600 to-indigo-600 hover:from-slate-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 focus:from-blue-700 focus:to-indigo-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl active:shadow-md focus:ring-4 focus:ring-blue-100 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                disabled={formData.otp.length !== 4}
              >
                Verify & Sign In
              </LoadingButton>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="text-center mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Need help?{' '}
            <Button variant="link" size="sm" className="text-xs p-0 h-auto text-blue-600 hover:text-slate-900 active:text-blue-700 focus:text-blue-700 transition-colors duration-150 hover:underline">
              Contact Support
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};