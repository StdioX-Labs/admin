'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  NAV_ITEMS,
  BOTTOM_TAB_KEYS,
  MORE_KEYS,
  MORE_ICON,
  isNavActive,
} from './nav-config';
import { usePendingCount } from './pending-count';

const byKey = (key: string) => NAV_ITEMS.find((n) => n.key === key)!;

/**
 * Mobile bottom tab bar plus the "More" bottom sheet holding the four
 * destinations that don't fit as tabs. Full parity with the desktop nav.
 */
export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const pending = usePendingCount();
  const { logout, isLoggingOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close on route change and on Escape.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const tabs = BOTTOM_TAB_KEYS.map(byKey);
  const moreItems = MORE_KEYS.map(byKey);
  const moreActive = moreItems.some((m) => isNavActive(m.href, pathname));

  const tabColor = (active: boolean) =>
    active ? 'var(--color-accent)' : 'color-mix(in srgb, var(--color-text) 52%, transparent)';

  return (
    <>
      <nav
        className="md:hidden flex-none flex"
        style={{
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-divider)',
          padding: '6px 4px calc(6px + env(safe-area-inset-bottom))',
        }}
      >
        {tabs.map((tab) => {
          const active = isNavActive(tab.href, pathname);
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => router.push(tab.href)}
              aria-current={active ? 'page' : undefined}
              className="flex-1 flex flex-col items-center gap-[3px] py-1.5 px-0.5"
              style={{ border: 'none', background: 'transparent', color: tabColor(active) }}
            >
              <span className="relative">
                <Icon className="ic w-[22px] h-[22px]" />
              </span>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{tab.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className="flex-1 flex flex-col items-center gap-[3px] py-1.5 px-0.5"
          style={{ border: 'none', background: 'transparent', color: tabColor(moreActive) }}
        >
          <span className="relative">
            <MORE_ICON className="ic w-[22px] h-[22px]" />
            {pending > 0 && (
              <span
                className="grid place-items-center tnum"
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -7,
                  minWidth: 15,
                  height: 15,
                  padding: '0 4px',
                  borderRadius: 999,
                  background: 'var(--color-accent)',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {pending}
              </span>
            )}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600 }}>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          className="md:hidden fixed inset-0 flex items-end animate-soa-fade"
          style={{
            zIndex: 60,
            background: 'color-mix(in srgb, var(--color-neutral-900) 45%, transparent)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full animate-soa-pop"
            style={{
              background: 'var(--color-bg)',
              borderRadius: '24px 24px 0 0',
              padding: '10px 14px calc(20px + env(safe-area-inset-bottom))',
            }}
          >
            <div
              style={{
                width: 38,
                height: 4,
                borderRadius: 999,
                background: 'var(--color-neutral-300)',
                margin: '6px auto 12px',
              }}
            />
            <p
              className="mx-1.5 mb-1.5 mt-0"
              style={{
                fontSize: 10,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
              }}
            >
              More
            </p>
            <div className="grid grid-cols-2 gap-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const badge = item.showsPending ? pending : 0;
                return (
                  <button
                    key={item.key}
                    onClick={() => router.push(item.href)}
                    className="flex items-center gap-[11px] p-3.5"
                    style={{
                      border: '1px solid var(--color-divider)',
                      background: 'var(--color-surface)',
                      borderRadius: 16,
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--color-text)',
                    }}
                  >
                    <Icon className="ic w-[19px] h-[19px]" style={{ color: 'var(--color-accent)' }} />
                    {item.label}
                    {badge > 0 && (
                      <span
                        className="ml-auto grid place-items-center tnum"
                        style={{
                          minWidth: 18,
                          height: 18,
                          padding: '0 5px',
                          borderRadius: 999,
                          background: 'var(--color-accent)',
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => logout()}
              disabled={isLoggingOut}
              className="w-full mt-2.5 flex items-center justify-center gap-2 p-3.5 disabled:opacity-50"
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--color-accent-700)',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              <LogOut className="ic w-[17px] h-[17px]" />
              {isLoggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
