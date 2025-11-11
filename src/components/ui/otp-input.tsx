'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  length?: number;
  onComplete?: (otp: string) => void;
  onChange?: (value: string) => void;
  value?: string;
  disabled?: boolean;
}

export const OtpInput = React.forwardRef<HTMLInputElement, OtpInputProps>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ({ length = 4, onComplete, onChange, value = '', className, disabled = false, ...props }, ref) => {
    // Ensure value is always a string
    const stringValue = String(value || '');

    // Convert string value to array of characters
    const valueArray = stringValue.split('').slice(0, length);
    while (valueArray.length < length) valueArray.push('');

    const [otp, setOtp] = React.useState<string[]>(valueArray);
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    // Update internal state when external value changes
    React.useEffect(() => {
      const stringValue = String(value || '');
      const valueArray = stringValue.split('').slice(0, length);
      while (valueArray.length < length) valueArray.push('');
      setOtp(valueArray);
    }, [value, length]);

    // Initialize input refs array
    React.useEffect(() => {
      inputRefs.current = inputRefs.current.slice(0, length);
    }, [length]);

    // When all inputs are filled, call onComplete
    React.useEffect(() => {
      const otpValue = otp.join('');
      if (otpValue.length === length && !otp.includes('')) {
        onComplete?.(otpValue);
      }
    }, [otp, length, onComplete]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
      const value = e.target.value;

      // Only allow numbers
      if (value && !/^\d+$/.test(value)) {
        return;
      }

      // Handle paste
      if (value.length > 1) {
        const pastedOtp = value.slice(0, length).split('');
        const newOtp = [...otp];

        for (let i = 0; i < pastedOtp.length; i++) {
          if (index + i < length) {
            newOtp[index + i] = pastedOtp[i];
          }
        }

        setOtp(newOtp);
        onChange?.(newOtp.join(''));

        // Focus the next empty input or the last input
        const nextIndex = Math.min(index + pastedOtp.length, length - 1);
        inputRefs.current[nextIndex]?.focus();
      } else {
        // Normal single digit input
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        onChange?.(newOtp.join(''));

        // If value is entered and not the last input, focus next input
        if (value && index < length - 1) {
          inputRefs.current[index + 1]?.focus();
        }
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      // On backspace, clear current input and focus previous input
      if (e.key === 'Backspace') {
        if (otp[index]) {
          const newOtp = [...otp];
          newOtp[index] = '';
          setOtp(newOtp);
          onChange?.(newOtp.join(''));
        } else if (index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
      }

      // On left arrow, focus previous input
      if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }

      // On right arrow, focus next input
      if (e.key === 'ArrowRight' && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select all text when focused
      e.target.select();
    };

    return (
      <div className="flex gap-2 justify-center">
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-form-type="other"
            pattern="[0-9]*"
            maxLength={1}
            value={otp[index]}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onFocus={handleFocus}
            disabled={disabled}
            className={cn(
              "h-12 w-12 text-center text-lg font-medium rounded-md border border-input",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-input",
              "disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            aria-label={`OTP digit ${index + 1}`}
            {...props}
          />
        ))}
      </div>
    );
  }
);

OtpInput.displayName = 'OtpInput';

export default OtpInput;
