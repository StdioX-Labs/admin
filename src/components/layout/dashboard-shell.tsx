'use client';

import { Sidebar } from './sidebar';
import { Header, MobileHeader } from './header';
import { BottomNav } from './bottom-nav';
import { PendingCountProvider } from './pending-count';

/**
 * Console shell.
 *
 * Desktop: a floating sidebar card inset 14px from the viewport edges, with
 * the header and scrolling content beside it.
 * Mobile: no sidebar — a compact header on top and a bottom tab bar below,
 * so every destination stays within thumb reach.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <PendingCountProvider>
      <div
        className="flex h-dvh overflow-hidden"
        style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
      >
        {/* Sidebar — desktop only; mobile navigates via the bottom bar. */}
        <div className="hidden md:block w-[238px] flex-none my-3.5 ml-3.5">
          <Sidebar />
        </div>

        <div className="flex-1 min-w-0 flex flex-col h-dvh">
          <Header />
          <MobileHeader />

          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div
              className="w-full mx-auto"
              style={{
                maxWidth: 1440,
                padding:
                  'clamp(16px, 2.2vw, 28px) clamp(14px, 2.2vw, 28px) 40px',
              }}
            >
              {children}
            </div>
          </main>

          <BottomNav />
        </div>
      </div>
    </PendingCountProvider>
  );
}
