'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { eventsApi, type AdminEvent } from '@/lib/api';
import {
  DollarSign,
  Ticket,
  Percent,
  Trophy,
  Search,
  X,
  Download,
  RotateCcw,
  CalendarDays,
  Pencil,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Card,
  EmptyState,
  ErrorNote,
  Pager,
  Poster,
  ProgressBar,
  SkeletonCard,
  StatTile,
  money,
  num,
} from '@/components/ui/soa';
import { TicketSalesTable } from '@/components/ui/ticket-sales-table';

const PAGE_SIZE = 20;

type SortKey = 'revenue' | 'tickets' | 'sellthrough';

/** Capacity is the sum of each ticket type's original allocation. */
function capacityOf(e: AdminEvent): number {
  return e.ticketSummaries.reduce(
    (s, t) => s + (t.originalTicketCount ?? t.ticketCount ?? 0),
    0
  );
}

function sellThrough(e: AdminEvent): number {
  const cap = capacityOf(e);
  return cap > 0 ? Math.min(100, Math.round((e.totalTicketsSold / cap) * 100)) : 0;
}

function downloadCSV(events: AdminEvent[]) {
  const ts = new Date().toISOString().slice(0, 10);
  const rows: string[][] = [];

  rows.push(['SOLDOUT AFRICA — Active Event Sales Report', `Generated: ${new Date().toLocaleString('en-KE')}`]);
  rows.push([]);
  rows.push([
    'Event Name', 'Company', 'Category', 'Location', 'Start Date',
    'Tickets Sold', 'Gross Revenue (KES)', 'Platform Fee (KES)', 'This Week Sales', 'Sell-through %', 'Status',
  ]);

  for (const e of events) {
    rows.push([
      e.eventName, e.companyName, e.eventCategory, e.eventLocation,
      new Date(e.eventStartDate).toLocaleDateString('en-KE'),
      e.totalTicketsSold.toString(),
      e.totalRevenue.toString(),
      e.totalPlatformFee.toString(),
      e.analytics.currentWeekSales.toString(),
      sellThrough(e).toString(),
      e.status,
    ]);
  }

  const totRev = events.reduce((s, e) => s + e.totalRevenue, 0);
  const totFee = events.reduce((s, e) => s + e.totalPlatformFee, 0);
  const totSold = events.reduce((s, e) => s + e.totalTicketsSold, 0);
  rows.push(['TOTAL', '', '', '', '', totSold.toString(), totRev.toString(), totFee.toString(), '', '', '']);

  rows.push([]);
  rows.push(['── PER-TICKET BREAKDOWN ──']);
  rows.push(['Event Name', 'Company', 'Ticket Type', 'Price (KES)', 'Sold', 'Revenue (KES)']);

  for (const e of events) {
    for (const t of e.ticketSummaries) {
      rows.push([
        e.eventName, e.companyName, t.ticketName,
        t.ticketPrice.toString(), (t.ticketsSold ?? 0).toString(), (t.revenue ?? 0).toFixed(2),
      ]);
    }
  }

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `event-sales-${ts}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EventSalesPage() {
  const router = useRouter();
  const [allEvents, setAllEvents] = useState<AdminEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('revenue');
  const [currentPage, setCurrentPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async (searchName?: string) => {
    setIsLoading(true);
    setCurrentPage(0);
    setError('');
    try {
      // One large page: the date filter below would make server-side counts wrong.
      const resp = await eventsApi.getAllEvents(0, 500, searchName, 'ACTIVE');
      if (resp.status && resp.data?.data) {
        const now = new Date();
        setAllEvents((resp.data.data as AdminEvent[]).filter((e) => new Date(e.eventEndDate) >= now));
      } else {
        setError(resp.message || 'Failed to load events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sorted = useMemo(() => {
    const copy = [...allEvents];
    copy.sort((a, b) => {
      if (sort === 'tickets') return b.totalTicketsSold - a.totalTicketsSold;
      if (sort === 'sellthrough') return sellThrough(b) - sellThrough(a);
      return b.totalRevenue - a.totalRevenue;
    });
    return copy;
  }, [allEvents, sort]);

  const totalElements = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
  const rows = sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const totRev = allEvents.reduce((s, e) => s + e.totalRevenue, 0);
  const totSold = allEvents.reduce((s, e) => s + e.totalTicketsSold, 0);
  const avgPct = allEvents.length
    ? Math.round(allEvents.reduce((s, e) => s + sellThrough(e), 0) / allEvents.length)
    : 0;
  const maxRev = Math.max(...allEvents.map((e) => e.totalRevenue), 1);

  const segments: { key: SortKey; label: string }[] = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'tickets', label: 'Tickets' },
    { key: 'sellthrough', label: 'Sell-through' },
  ];

  return (
    <div className="flex flex-col gap-3.5 animate-soa-fade">
      {/* Totals + sort */}
      <div className="flex flex-wrap gap-2.5 items-center justify-between">
        <div
          className="grid gap-2.5 flex-1 min-w-[260px]"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))' }}
        >
          <StatTile label="Sales revenue" value={money(totRev)} icon={DollarSign} />
          <StatTile
            label="Tickets sold"
            value={num(totSold)}
            icon={Ticket}
            bg="var(--tint-clay-bg)"
            fg="var(--tint-clay-strong)"
          />
          <StatTile
            label="Avg sell-through"
            value={`${avgPct}%`}
            icon={Percent}
            bg="var(--tint-sand-bg)"
            fg="var(--tint-sand-fg)"
          />
        </div>

        <div
          className="inline-flex self-start overflow-hidden"
          style={{
            border: '1px solid var(--color-divider)',
            borderRadius: 'var(--radius-control)',
            background: 'var(--color-neutral-100)',
          }}
        >
          {segments.map((seg, i) => {
            const active = sort === seg.key;
            return (
              <button
                key={seg.key}
                onClick={() => {
                  setSort(seg.key);
                  setCurrentPage(0);
                }}
                style={{
                  padding: '7px 14px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  border: 'none',
                  borderLeft: i > 0 ? '1px solid var(--color-divider)' : undefined,
                  background: active ? 'var(--color-accent)' : 'transparent',
                  color: active
                    ? '#fff'
                    : 'color-mix(in srgb, var(--color-text) 60%, transparent)',
                }}
              >
                {seg.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <ErrorNote message={error} onRetry={() => fetchData(search || undefined)} />}

      {/* Search + actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px] max-w-[360px]">
          <Search
            className="ic absolute w-4 h-4 pointer-events-none"
            style={{
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'color-mix(in srgb, var(--color-text) 42%, transparent)',
            }}
          />
          <input
            className="soa-input"
            style={{ paddingLeft: 40, background: 'var(--color-neutral-100)' }}
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchData(search || undefined)}
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                fetchData();
              }}
              aria-label="Clear search"
              className="grid place-items-center"
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 26,
                height: 26,
                border: 'none',
                background: 'transparent',
                borderRadius: 999,
                color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
              }}
            >
              <X className="ic w-[15px] h-[15px]" />
            </button>
          )}
        </div>
        <button
          onClick={() => fetchData(search || undefined)}
          disabled={isLoading}
          className="flex items-center gap-1.5 disabled:opacity-50"
          style={{
            height: 36,
            padding: '0 14px',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--color-divider)',
            background: 'var(--color-neutral-100)',
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text)',
          }}
        >
          <RotateCcw className="ic w-3.5 h-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <button
          onClick={() => downloadCSV(sorted)}
          disabled={isLoading || allEvents.length === 0}
          className="flex items-center gap-1.5 disabled:opacity-50"
          style={{
            height: 36,
            padding: '0 14px',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--color-divider)',
            background: 'var(--color-neutral-100)',
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text)',
          }}
        >
          <Download className="ic w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {/* Leaderboard */}
      {isLoading ? (
        <SkeletonCard height={420} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={search ? 'No events match your search' : 'No active events'}
        />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="flex items-center gap-2" style={{ padding: '14px 16px 11px' }}>
            <Trophy className="ic w-[18px] h-[18px]" style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16 }}>
              Event leaderboard
            </span>
            <span
              className="ml-auto"
              style={{
                fontSize: 11.5,
                color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
              }}
            >
              {totalElements} upcoming &amp; ongoing
            </span>
          </div>

          {rows.map((e, i) => {
            const rank = currentPage * PAGE_SIZE + i + 1;
            const pct = sellThrough(e);
            const top = rank === 1;
            const isOpen = expanded.has(e.eventId);
            return (
              <div key={e.eventId} style={{ borderTop: '1px solid var(--color-divider)' }}>
                <div
                  className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5"
                  style={{ padding: '14px 16px' }}
                >
                <span
                  className="flex-none text-center"
                  style={{
                    width: 22,
                    fontFamily: 'var(--font-body)',
                    fontWeight: 700,
                    fontSize: 14,
                    color: top
                      ? 'var(--color-accent)'
                      : 'color-mix(in srgb, var(--color-text) 40%, transparent)',
                  }}
                >
                  {rank}
                </span>

                <Poster
                  url={e.eventPosterUrl}
                  name={e.eventName}
                  seed={e.eventId}
                  style={{ width: 40, height: 52, borderRadius: 8 }}
                />

                <div className="flex-1 min-w-[150px]">
                  <div style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.2 }}>
                    {e.eventName}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
                    }}
                  >
                    {e.companyName}
                  </div>
                </div>

                <div className="w-[160px] flex-none">
                  <div className="flex justify-between mb-1" style={{ fontSize: 10.5 }}>
                    <span
                      style={{ color: 'color-mix(in srgb, var(--color-text) 50%, transparent)' }}
                    >
                      Revenue
                    </span>
                    <span
                      className="tnum font-bold"
                      style={{ color: 'var(--tint-olive-strong)' }}
                    >
                      {money(e.totalRevenue)}
                    </span>
                  </div>
                  <ProgressBar
                    pct={(e.totalRevenue / maxRev) * 100}
                    height={6}
                    color={top ? 'var(--color-accent)' : '#c3d0a6'}
                  />
                </div>

                <div className="w-16 flex-none text-right">
                  <div className="tnum" style={{ fontWeight: 700, fontSize: 13.5 }}>
                    {num(e.totalTicketsSold)}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'color-mix(in srgb, var(--color-text) 42%, transparent)',
                    }}
                  >
                    sold
                  </div>
                </div>

                <div className="w-[120px] flex-none">
                  <div className="flex justify-between mb-1" style={{ fontSize: 10.5 }}>
                    <span
                      style={{ color: 'color-mix(in srgb, var(--color-text) 50%, transparent)' }}
                    >
                      Sell-through
                    </span>
                    <span className="tnum font-bold">{pct}%</span>
                  </div>
                  <ProgressBar pct={pct} height={6} />
                </div>

                <div className="flex items-center gap-1.5 flex-none">
                  <button
                    onClick={() => window.open(`https://soldoutafrica.com/${e.slug}`, '_blank')}
                    title="View live"
                    className="grid place-items-center"
                    style={{
                      width: 28,
                      height: 28,
                      border: 'none',
                      background: 'transparent',
                      borderRadius: 8,
                      color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                    }}
                  >
                    <ExternalLink className="ic w-[14px] h-[14px]" />
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/events/${e.eventId}/edit`)}
                    title="Edit"
                    className="grid place-items-center"
                    style={{
                      width: 28,
                      height: 28,
                      border: 'none',
                      background: 'transparent',
                      borderRadius: 8,
                      color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                    }}
                  >
                    <Pencil className="ic w-[14px] h-[14px]" />
                  </button>
                  {e.ticketSummaries.length > 0 && (
                    <button
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(e.eventId)) next.delete(e.eventId);
                          else next.add(e.eventId);
                          return next;
                        })
                      }
                      title={isOpen ? 'Hide ticket breakdown' : 'Show ticket breakdown'}
                      aria-expanded={isOpen}
                      className="grid place-items-center"
                      style={{
                        width: 28,
                        height: 28,
                        border: 'none',
                        background: 'transparent',
                        borderRadius: 8,
                        color: isOpen
                          ? 'var(--color-accent-700)'
                          : 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                      }}
                    >
                      {isOpen ? (
                        <ChevronUp className="ic w-[14px] h-[14px]" />
                      ) : (
                        <ChevronDown className="ic w-[14px] h-[14px]" />
                      )}
                    </button>
                  )}
                  </div>
                </div>

                {isOpen && e.ticketSummaries.length > 0 && (
                  <div
                    className="animate-soa-fade-fast"
                    style={{ background: 'var(--color-surface)' }}
                  >
                    <TicketSalesTable
                      rows={e.ticketSummaries.map((t) => ({
                        id: t.ticketId,
                        name: t.ticketName,
                        price: t.ticketPrice,
                        status: t.ticketStatus,
                        allocation: t.originalTicketCount ?? t.ticketCount,
                        sold: t.ticketsSold ?? 0,
                        revenue: t.revenue ?? 0,
                      }))}
                      commission={e.percentageCommission}
                      totalRevenue={e.totalRevenue}
                      totalSold={e.totalTicketsSold}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <Pager
        page={currentPage}
        totalPages={totalPages}
        totalElements={totalElements}
        noun="events"
        hasPrevious={currentPage > 0}
        hasNext={currentPage < totalPages - 1}
        onPrev={() => setCurrentPage((p) => p - 1)}
        onNext={() => setCurrentPage((p) => p + 1)}
      />
    </div>
  );
}
