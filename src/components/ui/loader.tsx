import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  className?: string;
}

export const Loader = ({
  size = 'md',
  variant = 'spinner',
  color = 'primary',
  className
}: LoaderProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-slate-900',
    secondary: 'text-purple-600',
    white: 'text-white',
    gray: 'text-gray-600'
  };

  const baseClasses = cn(
    sizeClasses[size],
    colorClasses[color],
    className
  );

  if (variant === 'spinner') {
    return (
      <svg
        className={cn(baseClasses, 'animate-spin')}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
  }

  if (variant === 'dots') {
    return (
      <div className={cn('flex space-x-1', className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'rounded-full animate-pulse',
              sizeClasses[size].replace('w-', 'w-').replace('h-', 'h-').split(' ')[0],
              sizeClasses[size].replace('w-', 'w-').replace('h-', 'h-').split(' ')[1],
              colorClasses[color].replace('text-', 'bg-')
            )}
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1.4s'
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div
        className={cn(
          baseClasses,
          'rounded-full animate-pulse',
          colorClasses[color].replace('text-', 'bg-')
        )}
      />
    );
  }

  if (variant === 'bars') {
    return (
      <div className={cn('flex items-end space-x-1', className)}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'w-1 animate-pulse',
              colorClasses[color].replace('text-', 'bg-'),
              size === 'sm' ? 'h-3' : size === 'md' ? 'h-4' : size === 'lg' ? 'h-6' : 'h-8'
            )}
            style={{
              animationDelay: `${i * 0.15}s`,
              animationDuration: '1s'
            }}
          />
        ))}
      </div>
    );
  }

  return null;
};

// Loading Button Component
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  loaderSize?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline';
  children: React.ReactNode;
}

export const LoadingButton = ({
  isLoading = false,
  loadingText,
  loaderSize = 'sm',
  variant = 'primary',
  className,
  disabled,
  children,
  ...props
}: LoadingButtonProps) => {
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    destructive: 'bg-red-600 hover:bg-red-700 text-white',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-900'
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        className
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && (
        <Loader
          size={loaderSize}
          variant="spinner"
          color={variant === 'outline' ? 'gray' : 'white'}
        />
      )}
      {isLoading ? loadingText || 'Loading...' : children}
    </button>
  );
};

// Full Screen Loader
interface FullScreenLoaderProps {
  message?: string;
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
}

export const FullScreenLoader = ({
  message = 'Loading...',
  variant = 'spinner'
}: FullScreenLoaderProps) => {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <Loader size="xl" variant={variant} color="primary" className="mx-auto mb-4" />
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
};