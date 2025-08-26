import { ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  // Add your authentication logic here
  const isAuthenticated = true; // Replace with actual auth check

  if (!isAuthenticated) {
    // Redirect to login or show unauthorized message
    return <div>Unauthorized</div>;
  }

  return <>{children}</>;
};