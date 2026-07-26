'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardApi, b2bApi, eventsApi, type ActiveEvent } from '@/lib/api';
import {
  Building2,
  CalendarDays,
  DollarSign,
  Users,
  Clock,
  Plus,
  LineChart,
  MapPin,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  Check,
} from 'lucide-react';
import {
  Card,
  ErrorNote,
  Poster,
  ProgressBar,
  Skeleton,
  SkeletonCard,
  compactMoney,
  money,
  num,
} from '@/components/ui/soa';
import { GmvChart, ChannelDonut, ChannelLegend } from '@/components/charts/organic-charts';
import { PLATFORM_KPIS } from '@/lib/platform-analytics';

interface DashboardStats {
  totalCompanies: number;
  activeEvents: number;
  totalRevenue: number;
  totalUsers: number;
  pendingApprovals: number;
  activeB2BSubscriptions: number;
}

const OLIVE = { bg: 'var(--tint-olive-bg)', fg: 'var(--tint-olive-strong)' };
const CLAY = { bg: 'var(--tint-clay-bg)', fg: 'var(--tint-clay-strong)' };
const SAND = { bg: 'var(--tint-sand-bg)', fg: 'var(--tint-sand-fg)' };

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeEvents, setActiveEvents] = useState<ActiveEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setEventsLoading(true);
    setError('');

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
                merged.activeB2BSubscriptions =
                  (obj.count as number) ?? (obj.total as number) ?? merged.activeB2BSubscriptions;
              }
            }
          } catch {
            /* non-critical */
          }
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
      if (resp?.status && resp.events) setActiveEvents(resp.events.slice(0, 5));
    }

    setIsLoading(false);
    setEventsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pending = stats?.pendingApprovals ?? 0;

  const statCards = stats
    ? [
        {
          label: 'Companies',
          value: num(stats.totalCompanies),
          icon: Building2,
          sub: 'organizers',
          trend: 'B2B',
          tint: OLIVE,
          href: '/dashboard/companies',
        },
        {
          label: 'Active events',
          value: num(stats.activeEvents),
          icon: CalendarDays,
          sub: 'live now',
          trend: 'live',
          tint: CLAY,
          href: '/dashboard/events',
        },
        {
          label: 'Revenue (GMV)',
          value: compactMoney(stats.totalRevenue),
          icon: DollarSign,
          sub: 'all-time',
          trend: 'gross',
          tint: SAND,
          href: '/dashboard/finance',
        },
        {
          label: 'Users',
          value: num(stats.totalUsers),
          icon: Users,
          sub: 'platform total',
          trend: 'total',
          tint: OLIVE,
          href: '/dashboard/users',
        },
        {
          label: 'Pending',
          value: num(pending),
          icon: Clock,
          sub: 'to review',
          trend: pending ? 'action' : 'clear',
          tint: CLAY,
          href: '/dashboard/events/approvals',
        },
      ]
    : [];

  const quickActions = [
    { label: 'Create event', icon: Plus, href: '/dashboard/events/create' },
    { label: 'Review approvals', icon: Clock, href: '/dashboard/events/approvals' },
    { label: 'View analytics', icon: LineChart, href: '/dashboard/analytics' },
    { label: 'Manage companies', icon: Building2, href: '/dashboard/companies' },
  ];

  return (
    <div className="flex flex-col gap-[18px] animate-soa-fade">
      {error && <ErrorNote message={error} onRetry={fetchData} />}

      {/* KPI strip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} height={104} />)
          : statCards.map((c) => {
              const Icon = c.icon;
              return (
                <Card
                  key={c.label}
                  onClick={() => router.push(c.href)}
                  hoverLift
                  padded={false}
                  style={{ padding: 15 }}
                >
                  <div className="flex items-center justify-between mb-[11px]">
                    <span
                      style={{
                        fontSize: 10.5,
                        letterSpacing: '.09em',
                        textTransform: 'uppercase',
                        color: 'color-mix(in srgb, var(--color-text) 52%, transparent)',
                      }}
                    >
                      {c.label}
                    </span>
                    <span
                      className="grid place-items-center flex-none"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 9,
                        background: c.tint.bg,
                        color: c.tint.fg,
                      }}
                    >
                      <Icon className="ic w-[15px] h-[15px]" />
                    </span>
                  </div>
                  <div
                    className="tnum truncate"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 700,
                      fontSize: 26,
                      lineHeight: 1,
                    }}
                  >
                    {c.value}
                  </div>
                  <div className="flex items-center gap-[5px] mt-2">
                    <span
                      className="inline-flex items-center"
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: 999,
                        background: 'var(--tint-olive-bg)',
                        color: 'var(--tint-olive-strong)',
                      }}
                    >
                      {c.trend}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'color-mix(in srgb, var(--color-text) 48%, transparent)',
                      }}
                    >
                      {c.sub}
                    </span>
                  </div>
                </Card>
              );
            })}
      </div>

      {/* Revenue trend + channel mix */}
      <div className="grid gap-3.5 grid-cols-1 lg:grid-cols-3 items-start">
        <Card className="lg:col-span-2 min-w-0" padded={false} style={{ padding: '16px 18px' }}>
          <div className="flex items-start justify-between gap-3 mb-0.5">
            <div>
              <div className="card-kicker">Gross merchandise value</div>
              <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 19 }}>
                Revenue trend
              </div>
            </div>
            <div className="text-right">
              <div
                className="tnum"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 20 }}
              >
                {compactMoney(PLATFORM_KPIS.gmv)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-accent-2-700)' }}>last 12 months</div>
            </div>
          </div>
          <GmvChart />
        </Card>

        <Card className="min-w-0" padded={false} style={{ padding: '16px 18px' }}>
          <div className="card-kicker">Payment channels</div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: 19,
              marginBottom: 8,
            }}
          >
            GMV by channel
          </div>
          <ChannelDonut />
          <ChannelLegend />
        </Card>
      </div>

      {/* Active events + attention column */}
      <div className="grid gap-3.5 grid-cols-1 lg:grid-cols-3 items-start">
        <Card className="lg:col-span-2 min-w-0 overflow-hidden" padded={false}>
          <div className="flex items-center justify-between px-[18px] pt-[15px] pb-3">
            <div className="flex items-center gap-2">
              <span
                className="animate-soa-puls"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--color-accent-2)',
                }}
              />
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16 }}>
                Active events
              </span>
            </div>
            <button
              onClick={() => router.push('/dashboard/events')}
              className="flex items-center gap-0.5"
              style={{
                fontSize: 12,
                color: 'var(--color-accent-700)',
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
              }}
            >
              View all
              <ChevronRight className="ic w-[13px] h-[13px]" />
            </button>
          </div>

          {eventsLoading ? (
            <div className="px-[18px] pb-4 flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} style={{ height: 50 }} />
              ))}
            </div>
          ) : activeEvents.length === 0 ? (
            <div
              className="px-[18px] py-10 text-center"
              style={{ borderTop: '1px solid var(--color-divider)' }}
            >
              <CalendarDays
                className="ic w-8 h-8 mx-auto mb-2"
                style={{ color: 'color-mix(in srgb, var(--color-text) 22%, transparent)' }}
              />
              <p className="text-sm text-muted-foreground m-0">No active events</p>
              <button
                onClick={() => router.push('/dashboard/events/create')}
                className="mt-3 underline underline-offset-2"
                style={{
                  fontSize: 12,
                  border: 'none',
                  background: 'none',
                  color: 'var(--color-accent-700)',
                }}
              >
                Create one
              </button>
            </div>
          ) : (
            activeEvents.map((event) => {
              const sold = event.tickets.reduce((s, t) => s + t.soldQuantity, 0);
              const avail = event.tickets.reduce((s, t) => s + t.quantityAvailable, 0);
              const pct = avail > 0 ? Math.min(100, Math.round((sold / avail) * 100)) : 0;
              const revenue = event.tickets.reduce(
                (s, t) => s + t.ticketPrice * t.soldQuantity,
                0
              );
              return (
                <button
                  key={event.id}
                  onClick={() => router.push('/dashboard/events')}
                  className="flex items-center gap-3 w-full text-left px-[18px] py-[11px] transition-colors"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderTop: '1px solid var(--color-divider)',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      'color-mix(in srgb, var(--color-text) 4%, transparent)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Poster
                    url={event.eventPosterUrl}
                    name={event.eventName}
                    seed={event.id}
                    style={{ width: 38, height: 50, borderRadius: 8 }}
                  />
                  <span className="flex-1 min-w-0">
                    <span
                      className="block truncate"
                      style={{ fontWeight: 600, fontSize: 13.5 }}
                    >
                      {event.eventName}
                    </span>
                    <span
                      className="flex items-center gap-[5px] mt-px min-w-0"
                      style={{
                        fontSize: 11.5,
                        color: 'color-mix(in srgb, var(--color-text) 52%, transparent)',
                      }}
                    >
                      <MapPin className="ic w-[11px] h-[11px] flex-none" />
                      <span className="truncate">{event.eventLocation}</span>
                    </span>
                  </span>
                  <span className="w-[104px] flex-none hidden sm:block">
                    <span className="flex justify-between mb-[3px]" style={{ fontSize: 10.5 }}>
                      <span
                        style={{
                          color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
                        }}
                      >
                        Sold
                      </span>
                      <span className="tnum font-semibold">{pct}%</span>
                    </span>
                    <ProgressBar pct={pct} height={6} track="var(--color-neutral-200)" />
                  </span>
                  <span
                    className="tnum flex-none text-right"
                    style={{
                      width: 96,
                      fontWeight: 600,
                      fontSize: 13,
                      color: 'var(--color-accent-2-700)',
                    }}
                  >
                    {money(revenue)}
                  </span>
                </button>
              );
            })
          )}
        </Card>

        <div className="flex flex-col gap-3.5 min-w-0">
          {/* Needs attention — the one dark surface in the system. */}
          <div
            style={{
              background: 'var(--color-accent-900)',
              color: 'var(--color-accent-100)',
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-sm)',
              padding: '16px 18px',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 700,
                    fontSize: 15,
                    color: '#fff',
                  }}
                >
                  Needs attention
                </div>
                <div
                  style={{ fontSize: 11.5, color: 'var(--color-accent-200)', opacity: 0.85 }}
                >
                  Pending approvals
                </div>
              </div>
              <span
                className="grid place-items-center"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: 'color-mix(in srgb, #fff 14%, transparent)',
                }}
              >
                <Clock className="ic w-[17px] h-[17px]" style={{ color: 'var(--color-accent-200)' }} />
              </span>
            </div>
            <div className="flex items-end gap-2.5" style={{ margin: '14px 0 4px' }}>
              {isLoading ? (
                <Skeleton style={{ width: 56, height: 40, background: 'rgba(255,255,255,.15)' }} />
              ) : (
                <span
                  className="tnum"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 700,
                    fontSize: 40,
                    lineHeight: 0.8,
                    color: '#fff',
                  }}
                >
                  {pending}
                </span>
              )}
              <span
                style={{ fontSize: 12, color: 'var(--color-accent-200)', paddingBottom: 5 }}
              >
                event{pending === 1 ? '' : 's'} awaiting review
              </span>
            </div>
            <button
              onClick={() => router.push('/dashboard/events/approvals')}
              className="w-full mt-3 flex items-center justify-center gap-1.5 transition-colors"
              style={{
                background: 'var(--color-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 999,
                padding: 9,
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: 13,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-accent-500)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-accent)')}
            >
              Review queue
              <ArrowUpRight className="ic w-3.5 h-3.5" />
            </button>
          </div>

          {/* B2B subscriptions */}
          <Card padded={false} style={{ padding: '14px 16px' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15 }}>
                  B2B subscriptions
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'color-mix(in srgb, var(--color-text) 52%, transparent)',
                  }}
                >
                  Active licences
                </div>
              </div>
              <span
                className="grid place-items-center flex-none"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: 'var(--tint-olive-bg)',
                  color: 'var(--tint-olive-strong)',
                }}
              >
                <TrendingUp className="ic w-[15px] h-[15px]" />
              </span>
            </div>
            {isLoading || !stats ? (
              <Skeleton style={{ height: 34 }} />
            ) : (
              <>
                <div
                  className="tnum"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 700,
                    fontSize: 26,
                    lineHeight: 1,
                    color: 'var(--color-accent-2-700)',
                  }}
                >
                  {num(stats.activeB2BSubscriptions)}
                </div>
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-divider)' }}>
                  <div
                    className="flex items-center justify-between mb-1.5"
                    style={{
                      fontSize: 11,
                      color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
                    }}
                  >
                    <span>Licence utilisation</span>
                    <span className="tnum">
                      {stats.totalCompanies > 0
                        ? Math.round(
                            (stats.activeB2BSubscriptions / stats.totalCompanies) * 100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <ProgressBar
                    pct={
                      stats.totalCompanies > 0
                        ? (stats.activeB2BSubscriptions / stats.totalCompanies) * 100
                        : 0
                    }
                    height={6}
                    track="var(--color-neutral-200)"
                    color="var(--color-accent-2)"
                  />
                </div>
              </>
            )}
          </Card>

          {/* Quick actions */}
          <Card padded={false} className="overflow-hidden">
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: 15,
                padding: '14px 16px 4px',
              }}
            >
              Quick actions
            </div>
            {quickActions.map((q) => {
              const Icon = q.icon;
              return (
                <button
                  key={q.label}
                  onClick={() => router.push(q.href)}
                  className="flex items-center gap-2.5 w-full text-left transition-colors"
                  style={{
                    padding: '9px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderTop: '1px solid var(--color-divider)',
                    fontSize: 13,
                    color: 'var(--color-text)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent-700)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
                >
                  <Icon className="ic w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                  <span className="flex-1">{q.label}</span>
                  <ChevronRight
                    className="ic w-3.5 h-3.5"
                    style={{ color: 'color-mix(in srgb, var(--color-text) 30%, transparent)' }}
                  />
                </button>
              );
            })}
          </Card>
        </div>
      </div>

      {/* All-clear strip when the queue is empty */}
      {!isLoading && pending === 0 && (
        <div
          className="flex items-center gap-2.5"
          style={{
            background: 'var(--tint-olive-bg)',
            color: 'var(--tint-olive-fg)',
            borderRadius: 'var(--radius-card)',
            padding: '11px 16px',
            fontSize: 13,
          }}
        >
          <Check className="ic w-4 h-4" />
          Approval queue is clear — nothing waiting for review.
        </div>
      )}
    </div>
  );
}
