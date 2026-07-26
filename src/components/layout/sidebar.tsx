'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader, LoadingButton } from '@/components/ui/loader';
import { LogOut, Plus } from 'lucide-react';
import { NAV_ITEMS, isNavActive } from './nav-config';
import { usePendingCount } from './pending-count';

interface SidebarProps {
  onClose?: () => void;
}

/**
 * Floating sidebar card — 238px wide, inset from the page edges and fully
 * rounded, on the warm surface tone so it reads as a panel lifted off the
 * cream ground.
 */
export const Sidebar = ({ onClose }: SidebarProps) => {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { logout, isLoggingOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const pending = usePendingCount();

  const userEmail =
    typeof window !== 'undefined'
      ? localStorage.getItem('userEmail') || 'admin@soldout.africa'
      : 'admin@soldout.africa';
  const initial = userEmail.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await logout();
    setShowLogoutModal(false);
  };

  return (
    <>
      <aside
        className="h-full flex flex-col overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          borderRadius: 28,
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-tile.svg"
            alt="SoldOutAfrica"
            className="w-[34px] h-[34px] flex-none"
            style={{ borderRadius: 9, boxShadow: 'var(--shadow-sm)' }}
          />
          <div className="min-w-0 leading-[1.05]">
            <div className="soa-brand text-base" style={{ letterSpacing: '-.01em' }}>
              SoldOutAfrica
            </div>
            <span
              className="inline-flex items-center mt-[3px]"
              style={{
                fontSize: 9,
                padding: '1px 8px',
                borderRadius: 'var(--radius-tag)',
                background: 'var(--color-accent-100)',
                color: 'var(--color-accent-800)',
              }}
            >
              ADMIN CONSOLE
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-1.5 flex flex-col gap-[5px]">
          <p
            className="mx-2 mt-2.5 mb-1"
            style={{
              fontSize: 10,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: 'color-mix(in srgb, var(--color-text) 42%, transparent)',
            }}
          >
            Menu
          </p>
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(item.href, pathname);
            const Icon = item.icon;
            const badge = item.showsPending ? pending : 0;
            const idle = active
              ? { bg: 'var(--color-accent-100)', fg: 'var(--color-accent-800)' }
              : { bg: 'transparent', fg: 'color-mix(in srgb, var(--color-text) 62%, transparent)' };
            const hover = active
              ? { bg: 'var(--color-accent-200)', fg: 'var(--color-accent-800)' }
              : {
                  bg: 'color-mix(in srgb, var(--color-text) 7%, transparent)',
                  fg: 'var(--color-text)',
                };
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                className="flex items-center gap-[11px] w-full px-[15px] py-2.5 rounded-full transition-colors"
                style={{
                  font: '600 13.5px var(--font-body)',
                  background: idle.bg,
                  color: idle.fg,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = hover.bg;
                  e.currentTarget.style.color = hover.fg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = idle.bg;
                  e.currentTarget.style.color = idle.fg;
                }}
              >
                <Icon className="ic w-[18px] h-[18px]" />
                <span className="flex-1 text-left">{item.label}</span>
                {badge > 0 && (
                  <span
                    className="grid place-items-center tnum"
                    style={{
                      minWidth: 19,
                      height: 19,
                      padding: '0 5px',
                      borderRadius: 999,
                      fontSize: 10.5,
                      fontWeight: 700,
                      background: 'var(--color-accent)',
                      color: '#fff',
                    }}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Primary action */}
        <div className="px-3 py-2.5">
          <button
            onClick={() => {
              onClose?.();
              router.push('/dashboard/events/create');
            }}
            className="w-full flex items-center justify-center gap-1.5 transition-colors"
            style={{
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              padding: '11px 12px',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-accent-600)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-accent)')}
          >
            <Plus className="ic w-4 h-4" />
            New event
          </button>
        </div>

        {/* Account */}
        <div
          className="flex items-center gap-2.5 px-3 pt-2.5 pb-3.5"
          style={{ borderTop: '1px solid var(--color-divider)' }}
        >
          <div
            className="grid place-items-center flex-none"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--color-accent-2)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate" style={{ fontSize: 12.5, fontWeight: 600 }} title={userEmail}>
              {userEmail}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
              }}
            >
              Super Admin
            </div>
          </div>
          <button
            title="Sign out"
            onClick={() => setShowLogoutModal(true)}
            disabled={isLoggingOut}
            className="grid place-items-center transition-colors"
            style={{
              width: 30,
              height: 30,
              border: 'none',
              background: 'transparent',
              borderRadius: 9,
              color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'color-mix(in srgb, var(--color-text) 8%, transparent)';
              e.currentTarget.style.color = 'var(--color-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'color-mix(in srgb, var(--color-text) 55%, transparent)';
            }}
          >
            {isLoggingOut ? (
              <Loader size="sm" variant="spinner" />
            ) : (
              <LogOut className="ic w-4 h-4" />
            )}
          </button>
        </div>
      </aside>

      <AlertDialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <LogOut className="ic h-4 w-4 text-muted-foreground" />
              Sign out
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              You will need to sign in again to access the console.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut} className="text-sm">
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
