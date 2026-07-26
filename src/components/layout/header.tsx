'use client';

import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Plus } from 'lucide-react';
import { resolveTitle } from './nav-config';

interface HeaderProps {
  children?: ReactNode;
}

/**
 * Desktop header — 64px, serif page title over a muted subtitle, with the
 * notification bell and the primary "New event" action pinned right.
 * Hidden below the md breakpoint, where MobileHeader takes over.
 */
export const Header = ({ children }: HeaderProps) => {
  const pathname = usePathname() ?? '/dashboard';
  const router = useRouter();
  const [title, subtitle] = resolveTitle(pathname);

  return (
    <header
      className="hidden md:flex h-16 flex-none items-center gap-4"
      style={{
        padding: '0 clamp(16px, 2.2vw, 28px)',
        borderBottom: '1px solid var(--color-divider)',
        background: 'var(--color-bg)',
      }}
    >
      <div className="min-w-0 flex-1">
        <h1 className="m-0" style={{ fontSize: 22, lineHeight: 1.1 }}>
          {title}
        </h1>
        <p
          className="m-0 mt-0.5"
          style={{
            fontSize: 12,
            color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
          }}
        >
          {subtitle}
        </p>
      </div>

      {children}

      <button
        title="Notifications"
        className="grid place-items-center relative transition-colors"
        style={{
          width: 38,
          height: 38,
          border: '1px solid var(--color-divider)',
          background: 'transparent',
          borderRadius: 999,
          color: 'color-mix(in srgb, var(--color-text) 62%, transparent)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'color-mix(in srgb, var(--color-text) 6%, transparent)';
          e.currentTarget.style.color = 'var(--color-text)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'color-mix(in srgb, var(--color-text) 62%, transparent)';
        }}
      >
        <Bell className="ic w-[17px] h-[17px]" />
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 9,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--color-accent)',
            border: '2px solid var(--color-bg)',
          }}
        />
      </button>

      <button
        onClick={() => router.push('/dashboard/events/create')}
        className="flex items-center gap-1.5 transition-colors"
        style={{
          background: 'var(--color-accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-control)',
          padding: '9px 16px',
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
    </header>
  );
};

/**
 * Mobile header — 56px, logo left, absolutely-centred page title, round
 * accent action right.
 */
export const MobileHeader = () => {
  const pathname = usePathname() ?? '/dashboard';
  const router = useRouter();
  const [title] = resolveTitle(pathname);

  return (
    <header
      className="md:hidden h-14 flex-none flex items-center gap-3 px-3.5 relative"
      style={{
        borderBottom: '1px solid var(--color-divider)',
        background: 'var(--color-bg)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-tile.svg"
        alt=""
        className="w-[30px] h-[30px] flex-none"
        style={{ borderRadius: 8 }}
      />
      <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            fontSize: 17,
            lineHeight: 1,
          }}
        >
          {title}
        </div>
      </div>
      <div className="flex-1" />
      <button
        onClick={() => router.push('/dashboard/events/create')}
        aria-label="New event"
        className="grid place-items-center flex-none"
        style={{
          width: 38,
          height: 38,
          border: 'none',
          background: 'var(--color-accent)',
          color: '#fff',
          borderRadius: 999,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Plus className="ic w-[18px] h-[18px]" />
      </button>
    </header>
  );
};
