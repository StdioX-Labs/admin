'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { FullScreenLoader } from '@/components/ui/loader';
import { authApi } from '@/lib/api';

interface AuthGuardProps {
  children: ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check authentication status by calling the auth status API
        const { isAuthenticated } = await authApi.checkAuth();

        if (!isAuthenticated) {
          // If not authenticated, redirect to login
          router.push('/login');
          return;
        }

        // User is authenticated
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Authentication check failed:', error);
        // On error, assume not authenticated and redirect
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return <FullScreenLoader message="Verifying your session..." variant="spinner" />;
  }

  // Only render children if authenticated
  return isAuthenticated ? <>{children}</> : null;
};