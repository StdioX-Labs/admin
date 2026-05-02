'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { FullScreenLoader } from '@/components/ui/loader';
import { authApi, ApiError } from '@/lib/api';

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
        const { isAuthenticated } = await authApi.checkAuth();
        if (!isAuthenticated) {
          router.push('/login');
          return;
        }
        setIsAuthenticated(true);
      } catch (error) {
        // Only redirect on explicit auth rejections (401/403).
        // For transient network/server errors, stay on the page — the
        // middleware has already confirmed the auth cookie exists.
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          router.push('/login');
          return;
        }
        console.error('Auth check error (non-fatal):', error);
        setIsAuthenticated(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return <FullScreenLoader message="Verifying your session..." variant="spinner" />;
  }

  return isAuthenticated ? <>{children}</> : null;
};