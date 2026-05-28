'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, ChevronRight } from 'lucide-react';

interface HeaderProps {
  children?: ReactNode;
  onMenuToggle?: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/events': 'Events',
  '/dashboard/events/approvals': 'Approvals',
  '/dashboard/events/sales': 'Sales',
  '/dashboard/events/create': 'Create Event',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/b2b': 'B2B',
  '/dashboard/b2b/companies': 'Companies',
  '/dashboard/b2b/licenses': 'Licenses',
  '/dashboard/finance': 'Finance',
  '/dashboard/finance/transactions': 'Transactions',
  '/dashboard/finance/reports': 'Reports',
  '/dashboard/users': 'Users',
  '/dashboard/companies': 'Companies',
};

export const Header = ({ children, onMenuToggle }: HeaderProps) => {
  const pathname = usePathname();

  const currentPath = pathname ?? '/dashboard';
  const segments = currentPath.split('/').filter(Boolean);
  const breadcrumbs = segments.map((_, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const label =
      ROUTE_LABELS[href] ??
      segments[i].charAt(0).toUpperCase() + segments[i].slice(1);
    return { href, label };
  });

  const pageTitle =
    ROUTE_LABELS[currentPath] ??
    breadcrumbs[breadcrumbs.length - 1]?.label ??
    'Dashboard';

  return (
    <header className="h-14 bg-background border-b border-border flex items-center px-4 flex-shrink-0 gap-3 relative">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="md:hidden flex items-center justify-center h-9 w-9 rounded-xl bg-accent/50 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Mobile: page title, absolutely centered so hamburger/actions don't crowd it */}
      <span className="md:hidden absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-foreground pointer-events-none whitespace-nowrap">
        {pageTitle}
      </span>

      {/* Desktop: breadcrumb trail */}
      <nav className="hidden md:flex flex-1 items-center gap-1.5 text-xs min-w-0">
        {breadcrumbs.map((crumb, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={crumb.href} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
              )}
              <span
                className={`truncate ${
                  isLast
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {crumb.label}
              </span>
            </span>
          );
        })}
      </nav>

      {/* Spacer — pushes right-side actions to the edge on mobile */}
      <div className="flex-1 md:hidden" />

      {/* Right slot (optional) */}
      {children && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {children}
        </div>
      )}
    </header>
  );
};
