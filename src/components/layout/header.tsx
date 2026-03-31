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
  '/dashboard/events/sales': 'Sales',
  '/dashboard/events/create': 'Create Event',
  '/dashboard/b2b': 'B2B',
  '/dashboard/b2b/companies': 'Companies',
  '/dashboard/b2b/licenses': 'Licenses',
  '/dashboard/finance': 'Finance',
  '/dashboard/finance/transactions': 'Transactions',
  '/dashboard/finance/reports': 'Reports',
  '/dashboard/users': 'Users',
};

export const Header = ({ children, onMenuToggle }: HeaderProps) => {
  const pathname = usePathname();

  // Build breadcrumb segments from the current path
  const currentPath = pathname ?? '/dashboard';
  const segments = currentPath.split('/').filter(Boolean);
  const breadcrumbs = segments.map((_, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const label = ROUTE_LABELS[href] ?? segments[i].charAt(0).toUpperCase() + segments[i].slice(1);
    return { href, label };
  });

  const pageTitle = ROUTE_LABELS[currentPath] ?? breadcrumbs[breadcrumbs.length - 1]?.label ?? 'Dashboard';

  return (
    <header className="h-14 bg-background border-b border-border flex items-center px-4 md:px-6 flex-shrink-0 gap-3">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="md:hidden flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Breadcrumb */}
      <nav className="flex-1 flex items-center gap-1.5 text-xs min-w-0">
        {breadcrumbs.map((crumb, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={crumb.href} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />}
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

      {/* Right slot */}
      {children && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {children}
        </div>
      )}

      {/* Page title on mobile (center-ish) — shown only when no breadcrumb */}
      <span className="md:hidden text-sm font-medium text-foreground absolute left-1/2 -translate-x-1/2 pointer-events-none">
        {pageTitle}
      </span>
    </header>
  );
};
