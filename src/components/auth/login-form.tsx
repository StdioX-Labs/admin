'use client';

import { useState, useEffect } from 'react';
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
  const { requestOtp, validateOtp, isRequestingOtp, isValidatingOtp } = useAuth();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    otp: ''
  });
  const [step, setStep] = useState<'email' | 'otp' | 'login'>('email');
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [resendTimer, setResendTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

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
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
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
      const response = await requestOtp(formData.email, 'email');
      if (response.status) {
        setStep('otp');
        setResendCount(1);
        setResendTimer(60);
      } else {
        throw new Error(response.message || 'Failed to send verification code');
      }
    } catch (error) {
      if (error instanceof Error && 'status' in error && (error as { status: number }).status === 429) {
        setError((error as { message: string }).message || 'Too many requests. Please try again later.');
      } else {
        setError(error instanceof Error ? error.message : 'Failed to send verification code');
      }
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
      const response = await validateOtp(formData.otp);
      if (response.status && response.user) {
        if (response.user.role === 'SUPER_ADMIN') {
          setStep('login');
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
    if (resendTimer > 0) return;
    setError('');
    try {
      const response = await requestOtp(formData.email, 'email');
      if (response.status) {
        setResendCount((prev) => prev + 1);
        const nextTimer = Math.pow(2, resendCount - 1) * 60;
        setResendTimer(nextTimer);
      } else {
        throw new Error(response.message || 'Failed to resend verification code');
      }
    } catch (error) {
      if (error instanceof Error && 'status' in error && (error as { status: number }).status === 429) {
        setError((error as { message: string }).message || 'Too many requests. Please try again later.');
      } else {
        setError(error instanceof Error ? error.message : 'Failed to resend verification code');
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (step === 'login') {
    return <FullScreenLoader message="Logging you in..." variant="spinner" />;
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            {step === 'email' ? 'Sign in' : 'Check your email'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {step === 'email'
              ? 'Enter your email to receive a verification code'
              : `We sent a code to ${formData.email}`
            }
          </p>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10 py-2">
            <AlertDescription className="text-sm text-destructive">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Email Step */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isRequestingOtp}
                placeholder="you@example.com"
                className={`h-10 bg-background text-foreground placeholder:text-muted-foreground border-border focus-visible:ring-ring ${
                  validationErrors.email ? 'border-destructive focus-visible:ring-destructive' : ''
                }`}
              />
              {validationErrors.email && (
                <p className="text-xs text-destructive">{validationErrors.email}</p>
              )}
            </div>

            <LoadingButton
              type="submit"
              isLoading={isRequestingOtp}
              loadingText="Sending code..."
              variant="primary"
              className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm rounded-lg transition-colors"
            >
              Continue with email
            </LoadingButton>
          </form>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">
                Verification code
              </Label>
              <OtpInput
                value={formData.otp}
                onChange={(value) => handleInputChange('otp', value)}
                length={4}
                disabled={isValidatingOtp}
                className={`bg-background text-foreground border-border focus:ring-ring ${
                  validationErrors.otp ? 'border-destructive' : ''
                }`}
              />
              {validationErrors.otp && (
                <p className="text-xs text-destructive">{validationErrors.otp}</p>
              )}
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">
                  Didn&apos;t receive it?
                </p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={handleResendOtp}
                  disabled={isRequestingOtp || isValidatingOtp || resendTimer > 0}
                  className="text-xs font-medium text-foreground hover:text-muted-foreground p-0 h-auto transition-colors disabled:opacity-40"
                >
                  {resendTimer > 0
                    ? `Resend in ${formatTime(resendTimer)}`
                    : isRequestingOtp
                      ? 'Resending...'
                      : 'Resend code'}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep('email');
                  setResendTimer(0);
                  setResendCount(0);
                }}
                disabled={isValidatingOtp}
                className="flex-1 h-10 border-border text-foreground bg-transparent hover:bg-accent hover:text-accent-foreground font-medium text-sm rounded-lg transition-colors"
              >
                Back
              </Button>
              <LoadingButton
                type="submit"
                isLoading={isValidatingOtp}
                loadingText="Verifying..."
                variant="primary"
                className="flex-1 h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm rounded-lg transition-colors disabled:opacity-50"
                disabled={formData.otp.length !== 4}
              >
                Verify & sign in
              </LoadingButton>
            </div>
          </form>
        )}
      </div>

    </div>
  );
};
