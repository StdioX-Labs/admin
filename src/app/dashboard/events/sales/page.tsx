'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ComplimentaryButton,
  ComplimentaryTicketsModal,
  ReportButton,
  useCertifiedReport,
  useFlashMessage,
} from '@/components/events/event-actions';
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
  Building2,
  MapPin,
  Tag,
  Loader2,
} from 'lucide-react';
import {
  Card,
  EmptyState,
  ErrorNote,
  SuccessNote,
  Poster,
  ProgressBar,
  SkeletonCard,
  StatTile,
  StatusPill,
  MetricTile,
  Meta,
  money,
  num,
  dateShort,
  timeShort,
} from '@/components/ui/soa';
import { TicketSalesTable } from '@/components/ui/ticket-sales-table';


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
  rows.push([
    'Event Name', 'Company', 'Ticket Type', 'Tickets per sale', 'Price (KES)',
    'Paid sales', 'Paid tickets', 'Complimentary', 'Issued', 'Revenue (KES)',
  ]);

  for (const e of events) {
    for (const t of e.ticketSummaries) {
      rows.push([
        e.eventName, e.companyName, t.ticketName,
        (t.ticketsToIssue ?? 1).toString(),
        t.ticketPrice.toString(),
        Math.floor((t.paidTicketsSold ?? 0) / Math.max(1, t.ticketsToIssue ?? 1)).toString(),
        (t.paidTicketsSold ?? 0).toString(),
        (t.complementaryTicketsSold ?? 0).toString(),
        (t.uniqueTicketCount ?? 0).toString(),
        (t.totalTicketSaleBalance ?? 0).toFixed(2),
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('revenue');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [compFor, setCompFor] = useState<AdminEvent | null>(null);
  const { message: success, show: showSuccess } = useFlashMessage();
  const { download: downloadReport, busyEventId: reportingEventId } = useCertifiedReport({
    onSuccess: showSuccess,
    onError: setError,
  });

  // First load shows skeletons; later refetches keep the current cards on
  // screen behind a translucent "Updating" overlay so the page doesn't blink.
  const fetchData = useCallback(async (searchName?: string, isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
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
      setIsRefreshing(false);
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
  // Every active event is fetched in a single request, so the table shows the
  // whole ranking rather than slicing it — the ranks read straight through and
  // sorting by revenue or sell-through no longer hides the tail behind a pager.
  const rows = sorted;

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
                onClick={() => setSort(seg.key)}
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

      {error && <ErrorNote message={error} onRetry={() => fetchData(search || undefined, true)} />}
      {success && <SuccessNote message={success} />}

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
            onKeyDown={(e) => e.key === 'Enter' && fetchData(search || undefined, true)}
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                fetchData(undefined, true);
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
          onClick={() => fetchData(search || undefined, true)}
          disabled={isLoading || isRefreshing}
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
          <RotateCcw className={`ic w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <button
          onClick={() => downloadCSV(sorted)}
          disabled={isLoading || isRefreshing || allEvents.length === 0}
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

      {/* Ranking context — the cards are ordered, so say by what. */}
      {!isLoading && rows.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 2 }}>
          <Trophy className="ic w-4 h-4" style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 15 }}>
            Ranked by{' '}
            {sort === 'revenue' ? 'revenue' : sort === 'tickets' ? 'tickets sold' : 'sell-through'}
          </span>
          <span
            className="ml-auto tnum"
            style={{
              fontSize: 11.5,
              color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
            }}
          >
            {totalElements} upcoming &amp; ongoing
          </span>
        </div>
      )}

      {/* Ranked event cards — same anatomy as the Events list, plus a rank
          badge and a revenue bar scaled against the top earner. */}
      <div className="relative flex flex-col gap-3.5">
        {isRefreshing && !isLoading && (
          <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl backdrop-blur-[1px] bg-[color-mix(in_srgb,var(--color-bg)_55%,transparent)]">
            <span
              className="flex items-center gap-2"
              style={{
                background: 'var(--color-neutral-100)',
                boxShadow: 'var(--shadow-md)',
                borderRadius: 999,
                padding: '8px 16px',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <Loader2 className="ic w-4 h-4 animate-spin" style={{ color: 'var(--color-accent)' }} />
              Updating sales…
            </span>
          </div>
        )}

        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} height={196} />)
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={search ? 'No events match your search' : 'No active events'}
            hint={search ? 'Try a different search term' : undefined}
          />
        ) : (
          rows.map((e, i) => {
            const rank = i + 1;
            const pct = sellThrough(e);
            const capacity = capacityOf(e);
            const top = rank === 1;
            const isOpen = expanded.has(e.eventId);
            return (
              <Card key={e.eventId} padded={false} className="overflow-hidden">
                <div className="flex">
                  <div className="relative flex-none">
                    <Poster
                      url={e.eventPosterUrl}
                      name={e.eventName}
                      seed={e.eventId}
                      className="w-[100px] sm:w-[130px] h-full"
                      style={{ minHeight: 196 }}
                    />
                    {/* Rank badge — this list is ordered, the Events list is not. */}
                    <span
                      className="absolute grid place-items-center tnum"
                      style={{
                        top: 8,
                        left: 8,
                        minWidth: 26,
                        height: 26,
                        padding: '0 7px',
                        borderRadius: 999,
                        fontFamily: 'var(--font-body)',
                        fontWeight: 700,
                        fontSize: 12.5,
                        background: top ? 'var(--color-accent)' : 'var(--color-neutral-100)',
                        color: top ? '#fff' : 'var(--color-text)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      {rank}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 px-4 py-3.5">
                    <div className="flex justify-between gap-2.5 items-start">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontWeight: 700,
                              fontSize: 16,
                              lineHeight: 1.1,
                            }}
                          >
                            {e.eventName}
                          </span>
                          <StatusPill status={e.status} />
                          {top && (
                            <span
                              className="inline-flex items-center gap-1"
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                padding: '2px 9px',
                                borderRadius: 999,
                                background: 'var(--color-accent-100)',
                                color: 'var(--color-accent-800)',
                              }}
                            >
                              <Trophy className="ic w-2.5 h-2.5" />
                              Top seller
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3.5 gap-y-[3px] mt-1.5">
                          <Meta icon={Building2}>
                            {e.companyName}
                            <span
                              className="ml-1"
                              style={{
                                color: 'color-mix(in srgb, var(--color-text) 38%, transparent)',
                              }}
                            >
                              #{e.companyId}
                            </span>
                          </Meta>
                          <Meta icon={MapPin}>{e.eventLocation}</Meta>
                          <Meta icon={CalendarDays}>
                            {dateShort(e.eventStartDate)} · {timeShort(e.eventStartDate)}
                          </Meta>
                          <Meta icon={Tag}>{e.eventCategory}</Meta>
                          {capacity > 0 && <Meta icon={Ticket}>{num(capacity)} capacity</Meta>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-none">
                        <ComplimentaryButton onClick={() => setCompFor(e)} />
                        <ReportButton
                          busy={reportingEventId === e.eventId}
                          onClick={() => downloadReport(e)}
                        />
                        <button
                          onClick={() => window.open(`https://soldoutafrica.com/${e.slug}`, '_blank')}
                          title="View live"
                          className="grid place-items-center"
                          style={{
                            width: 30,
                            height: 30,
                            border: 'none',
                            background: 'transparent',
                            borderRadius: 9,
                            color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                          }}
                        >
                          <ExternalLink className="ic w-[15px] h-[15px]" />
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/events/${e.eventId}/edit?from=sales`)}
                          title="Edit"
                          className="grid place-items-center"
                          style={{
                            width: 30,
                            height: 30,
                            border: 'none',
                            background: 'transparent',
                            borderRadius: 9,
                            color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                          }}
                        >
                          <Pencil className="ic w-[15px] h-[15px]" />
                        </button>
                      </div>
                    </div>

                    {/* Revenue share against the top earner — the ranking signal. */}
                    <div className="mt-3">
                      <div className="flex justify-between mb-[5px]" style={{ fontSize: 11 }}>
                        <span
                          style={{ color: 'color-mix(in srgb, var(--color-text) 55%, transparent)' }}
                        >
                          Revenue share
                        </span>
                        <span
                          className="tnum"
                          style={{ fontWeight: 700, color: 'var(--tint-olive-strong)' }}
                        >
                          {money(e.totalRevenue)}
                        </span>
                      </div>
                      <ProgressBar
                        pct={(e.totalRevenue / maxRev) * 100}
                        color={top ? 'var(--color-accent)' : '#c3d0a6'}
                      />
                    </div>

                    {capacity > 0 && (
                      <div className="mt-2.5">
                        <div className="flex justify-between mb-[5px]" style={{ fontSize: 11 }}>
                          <span
                            style={{
                              color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
                            }}
                          >
                            <span
                              className="tnum font-semibold"
                              style={{ color: 'var(--color-text)' }}
                            >
                              {num(e.totalTicketsSold)}
                            </span>{' '}
                            / {num(capacity)} sold
                          </span>
                          <span className="tnum font-bold">{pct}%</span>
                        </div>
                        <ProgressBar pct={pct} />
                      </div>
                    )}

                    <div
                      className="grid gap-2 mt-2.5"
                      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(104px, 100%), 1fr))' }}
                    >
                      <MetricTile
                        label="Revenue"
                        value={money(e.totalRevenue)}
                        color="var(--tint-olive-strong)"
                      />
                      <MetricTile
                        label="Tickets sold"
                        value={num(e.totalTicketsSold)}
                        note={`${e.analytics.totalTicketTypes} type${e.analytics.totalTicketTypes === 1 ? '' : 's'}`}
                      />
                      <MetricTile
                        label="Platform fee"
                        value={money(e.totalPlatformFee)}
                        note={
                          e.percentageCommission != null
                            ? `${e.percentageCommission}% commission`
                            : undefined
                        }
                        color="var(--tint-clay-strong)"
                      />
                      <MetricTile
                        label="This week"
                        value={num(e.analytics.currentWeekSales)}
                        note={`${num(e.analytics.totalAttendees)} attendees`}
                        color="var(--tint-sand-fg)"
                      />
                    </div>

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
                        aria-expanded={isOpen}
                        className="inline-flex items-center gap-1.5 mt-[11px]"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: 'var(--color-accent-700)',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {isOpen ? (
                          <ChevronUp className="ic w-[13px] h-[13px]" />
                        ) : (
                          <ChevronDown className="ic w-[13px] h-[13px]" />
                        )}
                        {isOpen ? 'Hide' : 'Show'} ticket breakdown
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && e.ticketSummaries.length > 0 && (
                  <div
                    className="animate-soa-fade-fast"
                    style={{
                      borderTop: '1px solid var(--color-divider)',
                      background: 'var(--color-surface)',
                    }}
                  >
                    <TicketSalesTable
                      rows={e.ticketSummaries.map((t) => ({
                        id: t.ticketId,
                        name: t.ticketName,
                        price: t.ticketPrice,
                        status: t.ticketStatus,
                        allocation: t.originalTicketCount ?? t.ticketCount,
                        ticketsPerSale: t.ticketsToIssue ?? 1,
                        paid: t.paidTicketsSold ?? 0,
                        complimentary: t.complementaryTicketsSold ?? 0,
                        revenue: t.totalTicketSaleBalance ?? 0,
                      }))}
                      commission={e.percentageCommission}
                      totalRevenue={e.totalRevenue}
                      totalSold={e.totalTicketsSold}
                    />
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    {compFor && (
        <ComplimentaryTicketsModal
          event={compFor}
          onClose={() => setCompFor(null)}
          onIssued={showSuccess}
        />
      )}
    </div>
  );
}
