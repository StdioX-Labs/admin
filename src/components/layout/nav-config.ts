import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  BarChart2,
  LineChart,
  Building2,
  Users,
  Wallet,
  Grid3x3,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  /** When true the badge slot shows the pending-approvals count. */
  showsPending?: boolean;
}

/**
 * The console's eight destinations, in the order the design lists them.
 * The desktop sidebar renders all of them; mobile splits them across the
 * bottom tab bar and the "More" sheet.
 */
export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'events', href: '/dashboard/events', label: 'Events', icon: CalendarDays },
  { key: 'approvals', href: '/dashboard/events/approvals', label: 'Approvals', icon: Clock, showsPending: true },
  { key: 'sales', href: '/dashboard/events/sales', label: 'Active Sales', icon: BarChart2 },
  { key: 'analytics', href: '/dashboard/analytics', label: 'Analytics', icon: LineChart },
  { key: 'companies', href: '/dashboard/companies', label: 'Companies', icon: Building2 },
  { key: 'users', href: '/dashboard/users', label: 'Users', icon: Users },
  { key: 'finance', href: '/dashboard/finance', label: 'Finance', icon: Wallet },
];

/** Bottom tab bar: Dashboard, Events, Analytics, Users, then More. */
export const BOTTOM_TAB_KEYS = ['dashboard', 'events', 'analytics', 'users'] as const;

/** Everything the tab bar can't hold, surfaced through the More sheet. */
export const MORE_KEYS = ['approvals', 'sales', 'companies', 'finance'] as const;

export const MORE_ICON = Grid3x3;

/** Page title + subtitle shown in the header, keyed by pathname. */
export const PAGE_TITLES: Record<string, [string, string]> = {
  '/dashboard': ['Dashboard', 'Platform overview at a glance'],
  '/dashboard/events': ['Events', 'Manage and monitor every event'],
  '/dashboard/events/approvals': ['Approvals', 'Events waiting to go live'],
  '/dashboard/events/sales': ['Active Sales', 'Ticket sales performance'],
  '/dashboard/events/create': ['Create event', 'Set up a new event and its tickets'],
  '/dashboard/analytics': ['Analytics', 'Financial & operational metrics'],
  '/dashboard/companies': ['Companies', 'Organizers & ticketing partners'],
  '/dashboard/users': ['Users', 'Platform members and roles'],
  '/dashboard/finance': ['Finance', 'Transactions, payouts & fees'],
};

export function resolveTitle(pathname: string): [string, string] {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (/^\/dashboard\/events\/[^/]+\/edit$/.test(pathname)) {
    return ['Edit event', 'Update details, tickets and templates'];
  }
  // Longest-prefix fallback keeps nested routes labelled sensibly.
  const match = Object.keys(PAGE_TITLES)
    .filter((p) => pathname.startsWith(p) && p !== '/dashboard')
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_TITLES[match] : ['Dashboard', 'Platform overview at a glance'];
}

/** True when `href` is the active destination for `pathname`. */
export function isNavActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}
