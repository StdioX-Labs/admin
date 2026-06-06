'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OtpInput } from './otp-input';

type ActionType = 'suspend' | 'activate';
type Step = 'confirm' | 'otp';

interface SuspendTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: ActionType;
  ticketName: string;
  error: string;
  isLoading: boolean;
  onRequestOtp: () => Promise<void>;
  onConfirm: (otp: string) => void;
}

export function SuspendTicketModal({
  isOpen,
  onClose,
  actionType,
  ticketName,
  error,
  isLoading,
  onRequestOtp,
  onConfirm,
}: SuspendTicketModalProps) {
  const [step, setStep] = useState<Step>('confirm');
  const [otp, setOtp] = useState('');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);

  const handleClose = () => {
    setStep('confirm');
    setOtp('');
    onClose();
  };

  const handleRequestOtp = async () => {
    setIsRequestingOtp(true);
    try {
      await onRequestOtp();
      setStep('otp');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleSubmit = () => {
    if (otp.length === 4) onConfirm(otp);
  };

  if (!isOpen) return null;

  const isBusy = isLoading || isRequestingOtp;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={!isBusy ? handleClose : undefined}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-2xl border border-border p-6 z-50 shadow-2xl mx-4">
        <button
          type="button"
          onClick={handleClose}
          disabled={isBusy}
          className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'confirm' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
                actionType === 'suspend' ? 'bg-red-100 dark:bg-red-950/30' : 'bg-green-100 dark:bg-green-950/30'
              )}>
                <AlertTriangle className={cn(
                  'w-6 h-6',
                  actionType === 'suspend' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                )} />
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {actionType === 'suspend' ? 'Suspend' : 'Activate'} Ticket Sales?
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate max-w-[260px]">{ticketName}</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-4">
                {actionType === 'suspend'
                  ? 'Are you sure you want to suspend sales for this ticket type? No more tickets of this type can be purchased.'
                  : 'Are you sure you want to activate sales for this ticket type? Tickets will be available for purchase again.'}
              </p>
              <div className={cn(
                'p-4 rounded-lg border',
                actionType === 'suspend'
                  ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30'
                  : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30'
              )}>
                <p className={cn(
                  'text-sm',
                  actionType === 'suspend' ? 'text-red-800 dark:text-red-300' : 'text-green-800 dark:text-green-300'
                )}>
                  <span className="font-semibold">{actionType === 'suspend' ? 'Warning:' : 'Note:'}</span>{' '}
                  {actionType === 'suspend'
                    ? "This action can be reversed, but it may affect your event's sales."
                    : 'This will make the ticket immediately available for purchase.'}
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-3 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isBusy}
                className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={isBusy}
                className={cn(
                  'flex-1 px-4 py-3 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2',
                  actionType === 'suspend'
                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:shadow-red-600/25'
                    : 'bg-gradient-to-r from-green-600 to-green-700 hover:shadow-green-600/25'
                )}
              >
                {isRequestingOtp && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isRequestingOtp ? 'Sending OTP...' : 'Continue'}
              </button>
            </div>
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100 dark:bg-blue-950/30">
                <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Enter verification code</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Check your email or SMS</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-5">
                A 4-digit code was sent to your registered email and phone. Enter it below to confirm.
              </p>
              <OtpInput
                value={otp}
                onChange={setOtp}
                onComplete={handleSubmit}
                length={4}
                disabled={isLoading}
              />

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-4 flex items-center gap-1.5 justify-center">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={isBusy}
                className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                Didn&apos;t receive it? Resend code
              </button>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep('confirm'); setOtp(''); }}
                disabled={isBusy}
                className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isBusy || otp.length !== 4}
                className={cn(
                  'flex-1 px-4 py-3 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2',
                  actionType === 'suspend'
                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:shadow-red-600/25'
                    : 'bg-gradient-to-r from-green-600 to-green-700 hover:shadow-green-600/25'
                )}
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isLoading
                  ? (actionType === 'suspend' ? 'Suspending...' : 'Activating...')
                  : (actionType === 'suspend' ? 'Suspend Sales' : 'Activate Sales')}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
