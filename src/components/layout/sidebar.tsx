'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader, LoadingButton } from "@/components/ui/loader";

interface SidebarProps {
  children?: ReactNode;
  className?: string;
}

export const Sidebar = ({ children, className = '' }: SidebarProps) => {
  const pathname = usePathname();
  const { logout, isLoggingOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Get user email from localStorage (set during login)
  const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') || 'user@example.com' : 'user@example.com';

  // Truncate email to max 20 characters
  const truncatedEmail = userEmail.length > 20
    ? `${userEmail.substring(0, 17)}...`
    : userEmail;

  const sidebarLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/b2b', label: 'B2B' },
    { href: '/dashboard/events', label: 'Events' },
    { href: '/dashboard/finance', label: 'Finance' },
    { href: '/dashboard/users', label: 'Users' },
  ];

  const handleLogout = async () => {
    await logout();
    setShowLogoutModal(false);
  };

  return (
    <>
      <aside className={`bg-gradient-to-b from-gray-900 to-gray-800 text-white w-64 min-h-screen flex flex-col ${className}`}>
        <div className="p-6 flex-1">
          <h2 className="text-2xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            SoldOutAfrica
          </h2>
          <nav>
            <ul className="space-y-3">
              {sidebarLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`
                        relative block p-3 rounded-xl font-medium transition-all duration-300 ease-in-out
                        ${isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                          : 'text-gray-300 hover:text-white hover:bg-gray-700/50 hover:translate-x-2'
                        }
                        group overflow-hidden
                      `}
                    >
                      <span className="relative z-10">{link.label}</span>
                      {!isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out rounded-xl"></div>
                      )}
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 animate-pulse opacity-75 rounded-xl"></div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {children}
        </div>

        {/* User Profile Section */}
        <div className="p-6 border-t border-gray-700">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowLogoutModal(true)}
                  disabled={isLoggingOut}
                  className="w-full flex items-center justify-between p-3 rounded-xl text-gray-300 hover:text-white hover:bg-red-600/20 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="font-medium truncate text-sm">{truncatedEmail}</span>
                  {isLoggingOut ? (
                    <Loader size="sm" variant="spinner" color="white" />
                  ) : (
                    <svg
                      className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:text-red-400 flex-shrink-0 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="text-sm">{userEmail}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      <AlertDialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Confirm Logout
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              You are about to sign out of your account. You will need to sign in again to access your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isLoggingOut}
              className="bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-300 disabled:opacity-50"
            >
              Cancel
            </AlertDialogCancel>
            <LoadingButton
              isLoading={isLoggingOut}
              loadingText="Signing Out..."
              variant="destructive"
              onClick={handleLogout}
            >
              Sign Out
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};