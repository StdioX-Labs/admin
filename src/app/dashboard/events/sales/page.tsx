'use client';

import { useState, useEffect, useCallback } from 'react';
import { eventsApi, type AdminEvent } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  RotateCcw,
  DollarSign,
  Ticket,
  TrendingUp,
  Building2,
  Calendar,
  MapPin,
  Search,
  ChevronDown,
  ChevronUp,
  Tag,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);
}
function fmtNum(n: number) {
  return new Intl.NumberFormat('en-KE').format(n);
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function downloadCSV(events: AdminEvent[]) {
  const ts = new Date().toISOString().slice(0, 10);
  const rows: string[][] = [];

  rows.push(['SOLDOUT AFRICA — Active Event Sales Report', `Generated: ${new Date().toLocaleString('en-KE')}`]);
  rows.push([]);
  rows.push([
    'Event Name', 'Company', 'Category', 'Location', 'Start Date',
    'Tickets Sold', 'Gross Revenue (KES)', 'Platform Fee (KES)', 'This Week Sales', 'Status',
  ]);

  for (const e of events) {
    rows.push([
      e.eventName, e.companyName, e.eventCategory, e.eventLocation,
      new Date(e.eventStartDate).toLocaleDateString('en-KE'),
      e.totalTicketsSold.toString(),
      e.totalRevenue.toString(),
      e.totalPlatformFee.toString(),
      e.analytics.currentWeekSales.toString(),
      e.status,
    ]);
  }

  const totRev = events.reduce((s, e) => s + e.totalRevenue, 0);
  const totFee = events.reduce((s, e) => s + e.totalPlatformFee, 0);
  const totSold = events.reduce((s, e) => s + e.totalTicketsSold, 0);
  rows.push(['TOTAL', '', '', '', '', totSold.toString(), totRev.toString(), totFee.toString(), '', '']);

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

  const csv = rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `event-sales-${ts}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── SalesCard ────────────────────────────────────────────────────────────────

function SalesCard({ event }: { event: AdminEvent }) {
  const [expanded, setExpanded] = useState(false);

  const startDate = new Date(event.eventStartDate);
  const dateStr = startDate.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = startDate.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex">
        {/* Poster */}
        <div className="w-20 sm:w-28 flex-shrink-0 self-stretch">
          {event.eventPosterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.eventPosterUrl} alt={event.eventName} className="w-full h-full object-cover" style={{ minHeight: '120px' }} />
          ) : (
            <div className="w-full h-full bg-accent flex items-center justify-center" style={{ minHeight: '120px' }}>
              <Calendar className="h-6 w-6 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">{event.eventName}</h3>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <Building2 className="h-2.5 w-2.5" />{event.companyName}
                  <span className="text-muted-foreground/40 font-mono">#{event.companyId}</span>
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <MapPin className="h-2.5 w-2.5" />{event.eventLocation}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <Calendar className="h-2.5 w-2.5" />{dateStr} · {timeStr}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <Tag className="h-2.5 w-2.5" />{event.eventCategory}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-base font-bold text-emerald-400 tabular-nums">{fmt(event.totalRevenue)}</p>
              <p className="text-[10px] text-muted-foreground/50">gross revenue</p>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            <div className="rounded-md bg-background/50 border border-border/60 px-2.5 py-2">
              <p className="text-[10px] text-muted-foreground/60 mb-0.5">Tickets Sold</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{fmtNum(event.totalTicketsSold)}</p>
              <p className="text-[10px] text-muted-foreground/40 mt-0.5">{event.analytics.totalTicketTypes} type{event.analytics.totalTicketTypes !== 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-md bg-background/50 border border-border/60 px-2.5 py-2">
              <p className="text-[10px] text-muted-foreground/60 mb-0.5">Platform Fee</p>
              <p className="text-sm font-bold text-blue-400 tabular-nums">{fmt(event.totalPlatformFee)}</p>
            </div>
            <div className="rounded-md bg-background/50 border border-border/60 px-2.5 py-2">
              <p className="text-[10px] text-muted-foreground/60 mb-0.5">This Week</p>
              <p className="text-sm font-bold text-violet-400 tabular-nums">{fmtNum(event.analytics.currentWeekSales)} sales</p>
            </div>
            <div className="rounded-md bg-background/50 border border-border/60 px-2.5 py-2">
              <p className="text-[10px] text-muted-foreground/60 mb-0.5">Attendees</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{fmtNum(event.analytics.totalAttendees)}</p>
            </div>
          </div>

          {/* Expand toggle */}
          {event.ticketSummaries.length > 0 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Hide' : 'Show'} ticket breakdown
            </button>
          )}
        </div>
      </div>

      {/* Ticket breakdown */}
      {expanded && event.ticketSummaries.length > 0 && (
        <div className="border-t border-border bg-background/30 px-4 py-3 overflow-x-auto">
          <table className="w-full text-xs min-w-[380px]">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left text-[10px] text-muted-foreground/50 uppercase tracking-wider pb-2 font-medium">Ticket Type</th>
                <th className="text-right text-[10px] text-muted-foreground/50 uppercase tracking-wider pb-2 font-medium">Price</th>
                <th className="text-right text-[10px] text-muted-foreground/50 uppercase tracking-wider pb-2 font-medium">Sold</th>
                <th className="text-right text-[10px] text-muted-foreground/50 uppercase tracking-wider pb-2 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {event.ticketSummaries.map((t) => (
                <tr key={t.ticketId} className="hover:bg-accent/10 transition-colors">
                  <td className="py-2 text-foreground/80">{t.ticketName}</td>
                  <td className="py-2 text-right tabular-nums text-foreground/70">
                    {t.ticketPrice === 0 ? 'Free' : fmt(t.ticketPrice)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-foreground/90 font-medium">{fmtNum(t.ticketsSold ?? 0)}</td>
                  <td className="py-2 text-right tabular-nums font-medium text-emerald-400">{fmt(t.revenue ?? 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border/60">
                <td colSpan={2} className="pt-2 text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium">Total</td>
                <td className="pt-2 text-right tabular-nums font-bold text-foreground">{fmtNum(event.totalTicketsSold)}</td>
                <td className="pt-2 text-right tabular-nums font-bold text-emerald-400">{fmt(event.totalRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function EventSalesPage() {
  const [allEvents, setAllEvents] = useState<AdminEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);

  // Derived pagination — always accurate to the filtered set
  const totalElements = allEvents.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
  const hasNext = currentPage < totalPages - 1;
  const hasPrevious = currentPage > 0;
  const events = allEvents.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const fetchData = useCallback(async (searchName?: string) => {
    setIsLoading(true);
    setCurrentPage(0);
    setError('');
    try {
      // Fetch all active events at once so client-side filtering + pagination is accurate
      const resp = await eventsApi.getAllEvents(0, 500, searchName, 'ACTIVE');
      if (resp.status && resp.data?.data) {
        const now = new Date();
        const filtered = (resp.data.data as AdminEvent[]).filter(
          e => new Date(e.eventEndDate) >= now
        );
        setAllEvents(filtered);
      } else {
        setError(resp.message || 'Failed to load events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = () => {
    fetchData(search || undefined);
  };

  const handlePageChange = (p: number) => {
    setCurrentPage(p);
  };

  // Totals for current page
  const totRevenue = events.reduce((s, e) => s + e.totalRevenue, 0);
  const totFees = events.reduce((s, e) => s + e.totalPlatformFee, 0);
  const totSold = events.reduce((s, e) => s + e.totalTicketsSold, 0);

  return (
    <div className="space-y-4 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Event Sales</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoading ? 'Loading...' : `${totalElements} upcoming & ongoing events`}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            onClick={() => fetchData(search || undefined)}
            variant="outline"
            size="sm"
            className="border-border bg-transparent text-muted-foreground hover:text-foreground gap-1.5 text-xs h-8"
            disabled={isLoading}
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            onClick={() => downloadCSV(allEvents)}
            size="sm"
            variant="outline"
            className="border-border bg-transparent text-muted-foreground hover:text-foreground gap-1.5 text-xs h-8"
            disabled={isLoading || allEvents.length === 0}
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 py-2.5">
          <AlertDescription className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
            <Button onClick={() => fetchData()} variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10 bg-transparent h-7 text-xs gap-1 flex-shrink-0">
              <RotateCcw className="h-3 w-3" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary stats — page totals */}
      {!isLoading && events.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Page Revenue</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-emerald-400">{fmt(totRevenue)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3 w-3 text-blue-400" />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Platform Fees</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-blue-400">{fmt(totFees)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Ticket className="h-3 w-3 text-violet-400" />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Tickets Sold</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-violet-400">{fmtNum(totSold)}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="h-8 pl-8 text-xs border-border bg-background"
          />
        </div>
        <Button
          onClick={handleSearch}
          variant="outline"
          size="sm"
          className="h-8 text-xs border-border bg-transparent text-muted-foreground hover:text-foreground"
          disabled={isLoading}
        >
          Search
        </Button>
        {search && (
          <button
            onClick={() => { setSearch(''); fetchData(0, undefined); }}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md bg-transparent transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Cards */}
      <div className="relative">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse flex">
                <div className="w-20 sm:w-28 bg-accent flex-shrink-0" style={{ minHeight: '120px' }} />
                <div className="flex-1 p-4 space-y-2.5">
                  <div className="h-3.5 w-48 rounded bg-accent" />
                  <div className="h-2.5 w-64 rounded bg-accent" />
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {Array.from({ length: 4 }).map((__, j) => <div key={j} className="h-14 rounded bg-accent" />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-border bg-card py-16 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {search ? 'No events match your search' : 'No active events'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => <SalesCard key={event.eventId} event={event} />)}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground/60">
            Page {currentPage + 1} of {totalPages} · {totalElements} events
          </p>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!hasPrevious}
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 border-border bg-transparent text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasNext}
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 border-border bg-transparent text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
