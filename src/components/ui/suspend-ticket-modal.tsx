'use client';

import React from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OtpInput } from './otp-input';

type SuspendStep = 'confirm' | 'otp';
type ActionType = 'suspend' | 'activate';

interface SuspendTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  step: SuspendStep;
  actionType: ActionType;
  ticketName: string;
  otp: string;
  onOtpChange: (value: string) => void;
  error: string;
  isLoading: boolean;
  onConfirm: () => void;
  onOtpSubmit: () => void;
  onBack: () => void;
}

export function SuspendTicketModal({
  isOpen,
  onClose,
  step,
  actionType,
  ticketName,
  otp,
  onOtpChange,
  error,
  isLoading,
  onConfirm,
  onOtpSubmit,
  onBack,
}: SuspendTicketModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-2xl border border-border p-6 z-50 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'confirm' ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
                actionType === 'suspend'
                  ? 'bg-red-100 dark:bg-red-950/30'
                  : 'bg-green-100 dark:bg-green-950/30'
              )}>
                <AlertTriangle className={cn(
                  'w-6 h-6',
                  actionType === 'suspend'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                )} />
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {actionType === 'suspend' ? 'Suspend' : 'Activate'} Ticket Sales?
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{ticketName}</p>
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
                  actionType === 'suspend'
                    ? 'text-red-800 dark:text-red-300'
                    : 'text-green-800 dark:text-green-300'
                )}>
                  <span className="font-semibold">{actionType === 'suspend' ? 'Warning:' : 'Note:'}</span>{' '}
                  {actionType === 'suspend'
                    ? "This action can be reversed, but it may affect your event's sales."
                    : 'This will make the ticket immediately available for purchase.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className={cn(
                  'flex-1 px-4 py-3 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all cursor-pointer',
                  actionType === 'suspend'
                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:shadow-red-600/25'
                    : 'bg-gradient-to-r from-green-600 to-green-700 hover:shadow-green-600/25'
                )}
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold mb-2">Enter OTP to Confirm</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Enter the 4-digit OTP to confirm the{' '}
              {actionType === 'suspend' ? 'suspension' : 'activation'} of <span className="font-mono font-medium text-foreground">{ticketName}</span>.
            </p>

            <div className="mb-6">
              <OtpInput
                value={otp}
                onChange={onOtpChange}
                length={4}
                disabled={isLoading}
              />
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-3 text-center">{error}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onBack}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-secondary text-foreground rounded-xl font-semibold text-sm hover:bg-secondary/80 transition-all cursor-pointer disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={onOtpSubmit}
                disabled={otp.length !== 4 || isLoading}
                className={cn(
                  'flex-1 px-4 py-3 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2',
                  actionType === 'suspend'
                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:shadow-red-600/25'
                    : 'bg-gradient-to-r from-green-600 to-green-700 hover:shadow-green-600/25'
                )}
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isLoading ? 'Processing...' : `Confirm ${actionType === 'suspend' ? 'Suspension' : 'Activation'}`}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
