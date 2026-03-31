'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { dashboardApi, b2bApi, eventsApi, type ActiveEvent } from "@/lib/api";
import {
  Building2,
  Calendar,
  DollarSign,
  Users,
  ArrowUpRight,
  Clock,
  Plus,
  FileText,
  RotateCcw,
  MapPin,
  Ticket,
  ChevronRight,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

interface DashboardStats {
  totalCompanies: number;
  activeEvents: number;
  totalRevenue: number;
  totalUsers: number;
  pendingApprovals: number;
  activeB2BSubscriptions: number;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeEvents, setActiveEvents] = useState<ActiveEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    setEventsLoading(true);
    setError('');

    // Fetch stats and active events in parallel
    const [statsResult, eventsResult] = await Promise.allSettled([
      (async () => {
        const response = await dashboardApi.getStats();
        if (response.status && response.data) {
          const merged = { ...response.data } as DashboardStats & Record<string, unknown>;
          try {
            const b2bResp = await b2bApi.getActiveSubscriptions();
            if (b2bResp?.status && b2bResp.data) {
              const d: unknown = b2bResp.data;
              if (Array.isArray(d)) merged.activeB2BSubscriptions = d.length;
              else if (typeof d === 'object' && d !== null) {
                const obj = d as Record<string, unknown>;
                merged.activeB2BSubscriptions = (obj.count as number) ?? (obj.total as number) ?? merged.activeB2BSubscriptions;
              }
            }
          } catch { /* non-critical */ }
          return merged;
        }
        throw new Error(response.message || 'Failed to load stats');
      })(),
      eventsApi.getActiveEvents(),
    ]);

    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value as DashboardStats);
    } else {
      const err = statsResult.reason;
      if (err?.status === 401) setError('You are not authorized. Please log in again.');
      else setError(err?.message || 'Failed to load dashboard data.');
    }

    if (eventsResult.status === 'fulfilled') {
      const resp = eventsResult.value;
      if (resp?.status && resp.events) {
        setActiveEvents(resp.events.slice(0, 6));
      }
    }

    setIsLoading(false);
    setEventsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const statCards = stats ? [
    { label: 'Companies', value: stats.totalCompanies, sub: 'B2B registered', icon: Building2, href: '/dashboard/b2b', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Active Events', value: stats.activeEvents, sub: 'Live now', icon: Calendar, href: '/dashboard/events', color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Revenue', value: formatCurrency(stats.totalRevenue), sub: 'All-time', icon: DollarSign, href: '/dashboard/finance', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Users', value: stats.totalUsers, sub: 'Platform total', icon: Users, href: '/dashboard/users', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ] : [];

  return (
    <div className="space-y-6 pb-8">

      {/* Top bar */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground/60 mb-0.5">
            {formatDate()}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {getGreeting()}
          </h1>
        </div>
        <div className="flex gap-2 pt-1 flex-shrink-0">
          <Button
            onClick={() => router.push('/dashboard/finance/reports')}
            variant="outline"
            size="sm"
            className="border-border text-muted-foreground hover:text-foreground hover:bg-accent bg-transparent gap-1.5 text-xs h-8"
          >
            <FileText className="h-3 w-3" />
            Reports
          </Button>
          <Button
            onClick={() => router.push('/dashboard/events/create')}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 text-xs h-8"
          >
            <Plus className="h-3 w-3" />
            New Event
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 py-3">
          <AlertDescription className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
              <span className="text-destructive text-sm">{error}</span>
            </div>
            <Button
              onClick={fetchData}
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 bg-transparent gap-1.5 flex-shrink-0 h-7 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse space-y-2.5">
                <div className="h-2.5 w-20 rounded bg-accent" />
                <div className="h-6 w-12 rounded bg-accent" />
                <div className="h-2 w-16 rounded bg-accent" />
              </div>
            ))
          : statCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.label}
                  onClick={() => router.push(card.href)}
                  className="group text-left rounded-xl border border-border bg-card p-4 hover:bg-accent/20 hover:border-border/80 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
                    <div className={`rounded-md p-1.5 ${card.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${card.color}`} />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground tracking-tight">{card.value}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[11px] text-muted-foreground/70">{card.sub}</p>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                  </div>
                </button>
              );
            })}
      </div>

      {/* Main content: active events + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Active events list */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm font-medium text-foreground">Active Events</h2>
            </div>
            <button
              onClick={() => router.push('/dashboard/events/active')}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
            >
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {eventsLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center gap-3 animate-pulse">
                  <div className="h-9 w-9 rounded-lg bg-accent flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-40 rounded bg-accent" />
                    <div className="h-2.5 w-24 rounded bg-accent" />
                  </div>
                  <div className="h-3 w-16 rounded bg-accent" />
                </div>
              ))}
            </div>
          ) : activeEvents.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active events</p>
              <button
                onClick={() => router.push('/dashboard/events/create')}
                className="mt-3 text-xs text-foreground/60 hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Create one
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activeEvents.map((event) => {
                const totalSold = event.tickets.reduce((s, t) => s + t.soldQuantity, 0);
                const totalAvail = event.tickets.reduce((s, t) => s + t.quantityAvailable, 0);
                const pct = totalAvail > 0 ? Math.round((totalSold / totalAvail) * 100) : null;
                return (
                  <button
                    key={event.id}
                    onClick={() => router.push('/dashboard/events/active')}
                    className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-accent/20 transition-colors group"
                  >
                    {/* Poster */}
                    <div className="h-9 w-9 rounded-lg bg-accent flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {event.eventPosterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={event.eventPosterUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Calendar className="h-4 w-4 text-muted-foreground/50" />
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate leading-tight">{event.eventName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {event.eventLocation && (
                          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground/70 truncate">
                            <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                            {event.eventLocation}
                          </span>
                        )}
                        {event.date && (
                          <span className="text-[11px] text-muted-foreground/50 flex-shrink-0">{event.date}</span>
                        )}
                      </div>
                    </div>
                    {/* Ticket fill */}
                    <div className="flex-shrink-0 text-right">
                      {pct !== null ? (
                        <>
                          <p className="text-xs font-medium text-foreground">{pct}%</p>
                          <p className="text-[10px] text-muted-foreground/60">{totalSold}/{totalAvail}</p>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          <Ticket className="h-2.5 w-2.5" />
                          Live
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground flex-shrink-0 transition-colors" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: pending + subscriptions */}
        <div className="space-y-4">

          {/* Pending approvals */}
          <div className="rounded-xl border border-border bg-card p-5">
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-3 w-28 rounded bg-accent" />
                <div className="h-8 w-12 rounded bg-accent" />
                <div className="h-7 w-full rounded bg-accent" />
              </div>
            ) : stats && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-foreground">Pending Approvals</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">Requires attention</p>
                  </div>
                  <div className="rounded-md p-1.5 bg-orange-500/10">
                    <Clock className="h-3.5 w-3.5 text-orange-400" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-orange-400 tabular-nums">{stats.pendingApprovals}</span>
                  <Button
                    onClick={() => router.push('/dashboard/b2b')}
                    variant="outline"
                    size="sm"
                    className="border-orange-500/20 text-orange-400 hover:bg-orange-500/10 bg-transparent h-7 text-xs gap-1"
                  >
                    Review <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
                {stats.pendingApprovals > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 pt-3 border-t border-border">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
                    <span className="text-[11px] text-orange-400/70">
                      {stats.pendingApprovals} item{stats.pendingApprovals !== 1 ? 's' : ''} awaiting review
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* B2B subscriptions */}
          <div className="rounded-xl border border-border bg-card p-5">
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-3 w-36 rounded bg-accent" />
                <div className="h-8 w-12 rounded bg-accent" />
                <div className="h-2 w-full rounded bg-accent" />
              </div>
            ) : stats && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-foreground">B2B Subscriptions</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">Active licenses</p>
                  </div>
                  <div className="rounded-md p-1.5 bg-emerald-500/10">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-emerald-400 tabular-nums">{stats.activeB2BSubscriptions}</span>
                  <Button
                    onClick={() => router.push('/dashboard/b2b/licenses')}
                    variant="outline"
                    size="sm"
                    className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 bg-transparent h-7 text-xs gap-1"
                  >
                    Manage <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
                <div className="mt-4 pt-3 border-t border-border space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground/60">
                    <span>License utilization</span>
                    <span>{stats.totalCompanies > 0 ? Math.round((stats.activeB2BSubscriptions / stats.totalCompanies) * 100) : 0}%</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-accent overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                      style={{ width: `${stats.totalCompanies > 0 ? Math.min(100, (stats.activeB2BSubscriptions / stats.totalCompanies) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick links */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-medium text-foreground">Quick Links</p>
            </div>
            {[
              { label: 'Create Event', href: '/dashboard/events/create', icon: Plus },
              { label: 'Financial Reports', href: '/dashboard/finance/reports', icon: FileText },
              { label: 'Manage Companies', href: '/dashboard/b2b/companies', icon: Building2 },
              { label: 'User Management', href: '/dashboard/users', icon: Users },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent/20 border-b border-border last:border-0 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
