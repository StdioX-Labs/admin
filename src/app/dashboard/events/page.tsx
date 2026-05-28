'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { eventsApi } from "@/lib/api";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  Loader2,
  AlertCircle,
  MapPin,
  RotateCcw,
  Building2,
  Tag,
  Ticket,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Globe,
  EyeOff,
} from 'lucide-react';

interface TicketSummary {
  ticketId: number;
  ticketName: string;
  ticketPrice: number;
  ticketsSold: number;
  revenue: number;
}

interface EventAnalytics {
  dailySalesGraph: string;
  currentWeekSales: number;
  totalAttendees: number;
  totalTicketTypes: number;
}

interface EventCreator {
  id: number;
  fullName: string;
  mobileNumber: string;
  emailAddress: string;
  role: string;
  active: boolean;
}

interface Event {
  eventId: number;
  eventName: string;
  slug: string;
  eventDescription: string;
  eventPosterUrl: string;
  eventCategory: string;
  eventLocation: string;
  ticketSaleStartDate: string;
  ticketSaleEndDate: string;
  eventStartDate: string;
  eventEndDate: string;
  active: boolean;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: EventCreator;
  companyId: number;
  companyName: string;
  totalTicketsSold: number;
  totalRevenue: number;
  totalPlatformFee: number;
  analytics: EventAnalytics;
  ticketSummaries: TicketSummary[];
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);
}
function fmtNum(n: number) {
  return new Intl.NumberFormat('en-KE').format(n);
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
      <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
      Active
    </span>
  );
  if (status === 'ONHOLD') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
      <Clock className="h-2.5 w-2.5" />
      On Hold
    </span>
  );
  return (
    <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-accent border border-border px-1.5 py-0.5 rounded">
      {status}
    </span>
  );
}

function EventCard({ event, onToggle, onEdit, toggling }: {
  event: Event;
  onToggle: (e: Event) => void;
  onEdit: (id: number) => void;
  toggling: boolean;
}) {
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
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-foreground truncate">{event.eventName}</h3>
                <StatusBadge status={event.status} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <Building2 className="h-2.5 w-2.5" />{event.companyName}
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

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                onClick={() => onToggle(event)}
                disabled={toggling}
                variant="outline"
                size="sm"
                className={`h-7 px-2.5 text-[11px] border transition-colors ${
                  event.status === 'ACTIVE'
                    ? 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10 bg-transparent'
                    : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 bg-transparent'
                }`}
              >
                {toggling ? <Loader2 className="h-3 w-3 animate-spin" /> : event.status === 'ACTIVE' ? 'Hold' : 'Activate'}
              </Button>
              <Button
                onClick={() => onEdit(event.eventId)}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-foreground transition-colors"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                onClick={() => window.open(`https://soldoutafrica.com/${event.slug}`, '_blank')}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-foreground transition-colors"
                title="View live"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            <div className="rounded-md bg-background/50 border border-border/60 px-2.5 py-2">
              <p className="text-[10px] text-muted-foreground/60 mb-0.5">Revenue</p>
              <p className="text-sm font-bold text-emerald-400 tabular-nums">{fmt(event.totalRevenue)}</p>
            </div>
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
        <div className="border-t border-border bg-background/30 px-4 py-3">
          <table className="w-full text-xs">
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

export default function EventsDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPagination, setIsLoadingPagination] = useState(false);
  const [togglingEventId, setTogglingEventId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [commissionValue, setCommissionValue] = useState('5.0');
  const [activatePublished, setActivatePublished] = useState(false);
  const [eventToActivate, setEventToActivate] = useState<Event | null>(null);

  const fetchData = async (page: number = currentPage, search?: string, isPagination = false) => {
    if (isPagination) setIsLoadingPagination(true);
    else setIsLoading(true);
    setError('');
    try {
      const response = await eventsApi.getAllEvents(page, pageSize, search);
      if (response.status && response.data?.data) {
        const eventsData = response.data.data as Event[];
        setEvents(eventsData);
        setCurrentPage(response.data.page);
        setTotalPages(response.data.totalPages);
        setTotalElements(response.data.totalElements);
        setHasNext(response.data.hasNext);
        setHasPrevious(response.data.hasPrevious);
        localStorage.setItem('eventsCache', JSON.stringify(eventsData));
      } else {
        setError(response.message || 'Failed to load events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setIsLoading(false);
      setIsLoadingPagination(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSearch = () => {
    setCurrentPage(0);
    fetchData(0, searchTerm || undefined);
  };

  const handlePageChange = (p: number) => {
    setCurrentPage(p);
    fetchData(p, searchTerm || undefined, true);
  };

  const handleToggleEventStatus = async (event: Event) => {
    if (event.status !== 'ACTIVE') {
      setEventToActivate(event);
      setCommissionValue('5.0');
      setActivatePublished(false);
      setShowCommissionDialog(true);
      return;
    }
    setTogglingEventId(event.eventId);
    setError(''); setSuccess('');
    try {
      const response = await eventsApi.updateEvent(event.eventId, {
        status: 'ONHOLD',
        isActive: false,
      });
      if (response.status === true) {
        setSuccess(`Event "${event.eventName}" set to ONHOLD`);
        await fetchData(currentPage, searchTerm || undefined);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(response.message || 'Failed to update event status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event status');
    } finally {
      setTogglingEventId(null);
    }
  };

  const handleActivateWithCommission = async () => {
    if (!eventToActivate) return;
    const commission = parseFloat(commissionValue);
    if (isNaN(commission) || commission < 0 || commission > 100) {
      setError('Commission must be between 0 and 100');
      return;
    }
    setShowCommissionDialog(false);
    setTogglingEventId(eventToActivate.eventId);
    setError(''); setSuccess('');
    try {
      const response = await eventsApi.updateEvent(eventToActivate.eventId, {
        status: 'ACTIVE',
        isActive: true,
        percentageCommission: commission,
        published: activatePublished,
      });
      if (response.status === true) {
        setSuccess(`"${eventToActivate.eventName}" activated at ${commission}% commission · ${activatePublished ? 'Published' : 'Hidden'}`);
        await fetchData(currentPage, searchTerm || undefined);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(response.message || 'Failed to activate event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate event');
    } finally {
      setTogglingEventId(null);
      setEventToActivate(null);
    }
  };

  const totRevenue = events.reduce((s, e) => s + e.totalRevenue, 0);
  const totSold = events.reduce((s, e) => s + e.totalTicketsSold, 0);

  return (
    <div className="space-y-4 pb-8">

      {/* Commission dialog */}
      {showCommissionDialog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setShowCommissionDialog(false); setEventToActivate(null); }}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-foreground mb-1">Activate Event</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set commission for <span className="text-foreground font-medium">{eventToActivate?.eventName}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Commission (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                  placeholder="5.0"
                  className="h-9 text-sm"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Published</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActivatePublished(p => !p)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                      activatePublished ? 'bg-emerald-500/80' : 'bg-muted-foreground/20'
                    }`}
                    role="switch"
                    aria-checked={activatePublished}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                      activatePublished ? 'translate-x-4' : 'translate-x-1'
                    }`} />
                  </button>
                  <span className={`flex items-center gap-1 text-[10px] ${activatePublished ? 'text-emerald-400' : 'text-muted-foreground/50'}`}>
                    {activatePublished ? <><Globe className="h-2.5 w-2.5" />Live</> : <><EyeOff className="h-2.5 w-2.5" />Hidden</>}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={() => { setShowCommissionDialog(false); setEventToActivate(null); }} variant="outline" size="sm" className="flex-1 border-border text-muted-foreground hover:text-foreground bg-transparent">
                  Cancel
                </Button>
                <Button onClick={handleActivateWithCommission} size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                  Activate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Events</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalElements > 0 ? `${totalElements} total events` : 'Manage and monitor all events'}
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/events/create')} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 text-xs h-8">
          <Plus className="h-3 w-3" />
          New Event
        </Button>
      </div>

      {/* Alerts */}
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
      {success && (
        <Alert className="border-emerald-500/20 bg-emerald-500/5 py-2.5">
          <AlertDescription className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-sm text-emerald-400">{success}</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Page summary */}
      {!isLoading && events.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Page Revenue</span>
            </div>
            <p className="text-lg font-bold tabular-nums text-emerald-400">{fmt(totRevenue)}</p>
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
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-8 pl-8 text-xs border-border bg-background"
          />
        </div>
        <Button onClick={handleSearch} size="sm" variant="outline" className="h-8 text-xs border-border bg-transparent text-muted-foreground hover:text-foreground">
          Search
        </Button>
      </div>

      {/* Cards */}
      <div className="relative">
        {isLoadingPagination && (
          <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center backdrop-blur-[1px] rounded-xl">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
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
            <p className="text-sm font-medium text-muted-foreground">No events found</p>
            {searchTerm && <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <EventCard
                key={event.eventId}
                event={event}
                onToggle={handleToggleEventStatus}
                onEdit={(id) => router.push(`/dashboard/events/${id}/edit`)}
                toggling={togglingEventId === event.eventId}
              />
            ))}
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
            <Button onClick={() => handlePageChange(currentPage - 1)} disabled={!hasPrevious} variant="outline" size="sm" className="h-7 w-7 p-0 border-border bg-transparent text-muted-foreground hover:text-foreground disabled:opacity-30">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button onClick={() => handlePageChange(currentPage + 1)} disabled={!hasNext} variant="outline" size="sm" className="h-7 w-7 p-0 border-border bg-transparent text-muted-foreground hover:text-foreground disabled:opacity-30">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
