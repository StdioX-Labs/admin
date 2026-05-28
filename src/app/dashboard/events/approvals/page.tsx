'use client';

import { useState, useEffect, useCallback } from 'react';
import { eventsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar, MapPin, Building2, Tag, Ticket,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle,
  RotateCcw, Loader2, ExternalLink, ChevronLeft, ChevronRight,
  Clock, Globe, EyeOff,
} from 'lucide-react';

interface TicketSummary {
  ticketId: number;
  ticketName: string;
  ticketPrice: number;
  ticketsSold?: number;
  revenue?: number;
  ticketCount?: number;
  originalTicketCount?: number;
}

interface OnHoldEvent {
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
  companyId: number;
  companyName: string;
  totalTicketsSold: number;
  totalRevenue: number;
  ticketSummaries: TicketSummary[];
  published?: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);
}

function EventCard({
  event,
  commission,
  published,
  onCommissionChange,
  onPublishedChange,
  onApprove,
  approving,
}: {
  event: OnHoldEvent;
  commission: string;
  published: boolean;
  onCommissionChange: (val: string) => void;
  onPublishedChange: (val: boolean) => void;
  onApprove: () => void;
  approving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const startDate = new Date(event.eventStartDate);
  const dateStr = startDate.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = startDate.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  const saleStart = new Date(event.ticketSaleStartDate).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  const saleEnd = new Date(event.ticketSaleEndDate).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });

  const commissionNum = parseFloat(commission);
  const commissionValid = !isNaN(commissionNum) && commissionNum >= 0 && commissionNum <= 100;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex">
        {/* Poster */}
        <div className="w-24 sm:w-36 flex-shrink-0 self-stretch relative">
          {event.eventPosterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.eventPosterUrl}
              alt={event.eventName}
              className="w-full h-full object-cover"
              style={{ minHeight: '160px' }}
            />
          ) : (
            <div className="w-full h-full bg-accent flex items-center justify-center" style={{ minHeight: '160px' }}>
              <Calendar className="h-6 w-6 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded backdrop-blur-sm">
              <Clock className="h-2.5 w-2.5" />
              On Hold
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-4 flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground leading-snug">{event.eventName}</h3>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <Building2 className="h-2.5 w-2.5 flex-shrink-0" />
                  {event.companyName}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <Tag className="h-2.5 w-2.5 flex-shrink-0" />
                  {event.eventCategory}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                  {event.eventLocation}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <Calendar className="h-2.5 w-2.5 flex-shrink-0" />
                  {dateStr} · {timeStr}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
                  <Ticket className="h-2.5 w-2.5 flex-shrink-0" />
                  Sales: {saleStart} – {saleEnd}
                </span>
              </div>
            </div>
            <Button
              onClick={() => window.open(`https://soldoutafrica.com/${event.slug}`, '_blank')}
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground/40 hover:text-foreground flex-shrink-0"
              title="Preview event"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Description */}
          <p className="text-[11px] text-muted-foreground/60 line-clamp-2 leading-relaxed">
            {event.eventDescription}
          </p>

          {/* Ticket types */}
          {event.ticketSummaries.length > 0 && (
            <div>
              <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {event.ticketSummaries.length} ticket type{event.ticketSummaries.length !== 1 ? 's' : ''}
                {!expanded && (
                  <span className="text-muted-foreground/40">
                    · from {fmt(Math.min(...event.ticketSummaries.map(t => t.ticketPrice)))}
                  </span>
                )}
              </button>
              {expanded && (
                <div className="mt-2 rounded-lg border border-border/60 overflow-x-auto">
                  <table className="w-full text-xs min-w-[280px]">
                    <thead className="bg-accent/30">
                      <tr>
                        <th className="text-left text-[10px] text-muted-foreground/50 uppercase tracking-wider px-3 py-1.5 font-medium">Type</th>
                        <th className="text-right text-[10px] text-muted-foreground/50 uppercase tracking-wider px-3 py-1.5 font-medium">Price</th>
                        <th className="text-right text-[10px] text-muted-foreground/50 uppercase tracking-wider px-3 py-1.5 font-medium">Available</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {event.ticketSummaries.map(t => (
                        <tr key={t.ticketId}>
                          <td className="px-3 py-2 text-foreground/80">{t.ticketName}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground/70">
                            {t.ticketPrice === 0 ? 'Free' : fmt(t.ticketPrice)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-foreground/70">
                            {t.originalTicketCount ?? t.ticketCount ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Approval controls */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/50 mt-auto">
            {/* Commission */}
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Commission %</label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={commission}
                  onChange={e => onCommissionChange(e.target.value)}
                  className="h-7 w-20 text-xs text-center pr-1"
                />
              </div>
              {!commissionValid && commission !== '' && (
                <span className="text-[10px] text-destructive">0–100</span>
              )}
            </div>

            {/* Published toggle */}
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Published</label>
              <button
                onClick={() => onPublishedChange(!published)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  published ? 'bg-emerald-500/80' : 'bg-muted-foreground/20'
                }`}
                role="switch"
                aria-checked={published}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                  published ? 'translate-x-4' : 'translate-x-1'
                }`} />
              </button>
              <span className={`flex items-center gap-1 text-[10px] ${published ? 'text-emerald-400' : 'text-muted-foreground/50'}`}>
                {published ? <><Globe className="h-2.5 w-2.5" />Live</> : <><EyeOff className="h-2.5 w-2.5" />Hidden</>}
              </span>
            </div>

            {/* Approve button */}
            <div className="ml-auto">
              <Button
                onClick={onApprove}
                disabled={approving || !commissionValid}
                size="sm"
                className="h-7 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 disabled:opacity-50"
              >
                {approving ? (
                  <><Loader2 className="h-3 w-3 animate-spin" />Approving…</>
                ) : (
                  <><CheckCircle2 className="h-3 w-3" />Approve</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  const [events, setEvents] = useState<OnHoldEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  // Per-event approval settings
  const [settings, setSettings] = useState<Record<number, { commission: string; published: boolean }>>({});

  const fetchEvents = useCallback(async (page = 0) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await eventsApi.getAllEvents(page, 20, undefined, 'ONHOLD');
      if (res.status && res.data?.data) {
        const data = res.data.data as OnHoldEvent[];
        setEvents(data);
        setCurrentPage(res.data.page);
        setTotalPages(res.data.totalPages);
        setTotalElements(res.data.totalElements);
        setHasNext(res.data.hasNext);
        setHasPrevious(res.data.hasPrevious);

        // Seed default settings for any new events
        setSettings(prev => {
          const next = { ...prev };
          data.forEach(e => {
            if (!next[e.eventId]) {
              next[e.eventId] = { commission: '5', published: e.published ?? false };
            }
          });
          return next;
        });
      } else {
        setError(res.message || 'Failed to load events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(0); }, [fetchEvents]);

  const handleApprove = async (event: OnHoldEvent) => {
    const s = settings[event.eventId] ?? { commission: '5', published: false };
    const commission = parseFloat(s.commission);
    if (isNaN(commission) || commission < 0 || commission > 100) return;

    setApprovingId(event.eventId);
    setError('');
    setSuccess('');

    try {
      const res = await eventsApi.updateEvent(event.eventId, {
        status: 'ACTIVE',
        isActive: true,
        percentageCommission: commission,
        published: s.published,
      });
      if (!res.status) throw new Error(res.message || 'Failed to approve event');

      setSuccess(`"${event.eventName}" approved at ${commission}% commission · ${s.published ? 'Published' : 'Hidden'}`);
      setTimeout(() => setSuccess(''), 6000);
      await fetchEvents(currentPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Event Approvals</h1>
            {!isLoading && totalElements > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-400 tabular-nums">
                {totalElements}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Events on hold waiting for your review
          </p>
        </div>
        <Button
          onClick={() => fetchEvents(currentPage)}
          variant="outline"
          size="sm"
          className="h-8 text-xs border-border bg-transparent text-muted-foreground hover:text-foreground gap-1.5"
        >
          <RotateCcw className="h-3 w-3" />
          Refresh
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 py-2.5">
          <AlertDescription className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
            <span className="text-sm text-destructive">{error}</span>
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

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse flex">
              <div className="w-24 sm:w-36 bg-accent flex-shrink-0" style={{ minHeight: '160px' }} />
              <div className="flex-1 p-4 space-y-3">
                <div className="h-4 w-3/4 rounded bg-accent" />
                <div className="h-3 w-1/2 rounded bg-accent" />
                <div className="h-3 w-2/3 rounded bg-accent" />
                <div className="h-8 w-full rounded bg-accent mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-20 text-center">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No events awaiting approval</p>
          <p className="text-xs text-muted-foreground/60 mt-1">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <EventCard
              key={event.eventId}
              event={event}
              commission={settings[event.eventId]?.commission ?? '5'}
              published={settings[event.eventId]?.published ?? false}
              onCommissionChange={val =>
                setSettings(prev => ({
                  ...prev,
                  [event.eventId]: { ...prev[event.eventId], commission: val },
                }))
              }
              onPublishedChange={val =>
                setSettings(prev => ({
                  ...prev,
                  [event.eventId]: { ...prev[event.eventId], published: val },
                }))
              }
              onApprove={() => handleApprove(event)}
              approving={approvingId === event.eventId}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground/60">
            Page {currentPage + 1} of {totalPages} · {totalElements} events
          </p>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => fetchEvents(currentPage - 1)}
              disabled={!hasPrevious}
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 border-border bg-transparent text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={() => fetchEvents(currentPage + 1)}
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
