'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  length?: number;
  onComplete?: (otp: string) => void;
  onChange?: (value: string) => void;
  value?: string;
  disabled?: boolean;
  className?: string;
}

export const OtpInput = React.forwardRef<HTMLInputElement, OtpInputProps>(
  ({ length = 4, onComplete, onChange, value = '', className, disabled = false }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const internalRef = React.useRef<HTMLInputElement>(null);
    const inputRef = (ref as React.RefObject<HTMLInputElement>) ?? internalRef;

    const digits = value.padEnd(length, ' ').slice(0, length).split('');
    const activeIndex = Math.min(value.length, length - 1);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const cleaned = e.target.value.replace(/\D/g, '').slice(0, length);
      onChange?.(cleaned);
      if (cleaned.length === length) {
        onComplete?.(cleaned);
      }
    };

    return (
      <div
        className="relative flex gap-2 justify-center"
        onClick={() => inputRef.current?.focus()}
      >
        {digits.map((digit, i) => (
          <div
            key={i}
            className={cn(
              'h-12 w-12 flex items-center justify-center text-lg font-medium rounded-md border transition-colors select-none',
              isFocused && i === activeIndex
                ? 'border-ring ring-2 ring-ring ring-offset-background'
                : 'border-input',
              digit.trim() ? 'text-foreground' : 'text-transparent',
              className
            )}
          >
            {digit.trim() || (isFocused && i === activeIndex ? (
              <span className="w-px h-5 bg-foreground animate-pulse inline-block" />
            ) : null)}
          </div>
        ))}

        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={length}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          aria-label="One-time password"
          className="absolute inset-0 opacity-0 w-full cursor-text disabled:cursor-not-allowed"
        />
      </div>
    );
  }
);

OtpInput.displayName = 'OtpInput';

export default OtpInput;
