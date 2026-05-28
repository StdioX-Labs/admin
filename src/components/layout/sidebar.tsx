'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
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
import { Loader, LoadingButton } from "@/components/ui/loader";
import { LayoutDashboard, CalendarDays, BarChart2, PlusCircle, LogOut, LineChart, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { eventsApi } from '@/lib/api';

interface SidebarProps {
  children?: ReactNode;
  className?: string;
  onClose?: () => void;
}

export const Sidebar = ({ children, className = '', onClose }: SidebarProps) => {
  const pathname = usePathname();
  const { logout, isLoggingOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    eventsApi.getAllEvents(0, 1, undefined, 'ONHOLD')
      .then(res => { if (res.status) setPendingCount(res.data?.totalElements ?? 0); })
      .catch(() => {});
  }, []);

  const userEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') || 'user@example.com' : 'user@example.com';
  const truncatedEmail = userEmail.length > 22 ? `${userEmail.substring(0, 19)}...` : userEmail;
  const initials = userEmail.charAt(0).toUpperCase();

  const sidebarLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: 0 },
    { href: '/dashboard/events', label: 'Events', icon: CalendarDays, badge: 0 },
    { href: '/dashboard/events/approvals', label: 'Approvals', icon: Clock, badge: pendingCount },
    { href: '/dashboard/events/sales', label: 'Sales', icon: BarChart2, badge: 0 },
    { href: '/dashboard/events/create', label: 'Create Event', icon: PlusCircle, badge: 0 },
    { href: '/dashboard/analytics', label: 'Analytics', icon: LineChart, badge: 0 },
  ];

  const handleLogout = async () => {
    await logout();
    setShowLogoutModal(false);
  };

  return (
    <>
      <aside className={`h-full bg-background border-r border-border flex flex-col ${className}`}>
        {/* Brand */}
        <div className="px-5 h-14 flex items-center border-b border-border flex-shrink-0">
          <img src="/bg-dark.svg" alt="SoldOutAfrica" className="h-8 w-8" />
          <span className="ml-2 text-[10px] font-medium bg-accent text-muted-foreground px-1.5 py-0.5 rounded">
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          <p className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60">
            Menu
          </p>
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-accent text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                <Icon
                  className={`h-4 w-4 flex-shrink-0 transition-colors ${
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                />
                {link.label}
                <span className="ml-auto flex items-center gap-1">
                  {link.badge > 0 && (
                    <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400 tabular-nums">
                      {link.badge}
                    </span>
                  )}
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-foreground" />}
                </span>
              </Link>
            );
          })}
          {children}
        </nav>

        {/* User / Logout */}
        <div className="p-2 border-t border-border flex-shrink-0">
          <button
            onClick={() => setShowLogoutModal(true)}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {/* Avatar */}
            <div className="h-7 w-7 rounded-full bg-accent border border-border flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-foreground">{initials}</span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{truncatedEmail}</p>
              <p className="text-[10px] text-muted-foreground">Super Admin</p>
            </div>
            {isLoggingOut ? (
              <Loader size="sm" variant="spinner" />
            ) : (
              <LogOut className="h-3.5 w-3.5 flex-shrink-0 opacity-0 group-hover:opacity-100 group-hover:text-destructive transition-all duration-150" />
            )}
          </button>
        </div>
      </aside>

      {/* Logout Modal */}
      <AlertDialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <AlertDialogContent className="sm:max-w-sm bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2 text-base">
              <LogOut className="h-4 w-4 text-muted-foreground" />
              Sign out
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              You will need to sign in again to access the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isLoggingOut}
              className="bg-transparent border-border text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 text-sm"
            >
              Cancel
            </AlertDialogCancel>
            <LoadingButton
              isLoading={isLoggingOut}
              loadingText="Signing out..."
              variant="destructive"
              onClick={handleLogout}
              className="text-sm"
            >
              Sign out
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
