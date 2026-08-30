'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { eventsApi } from '@/lib/api';
import {
  Search,
  X,
  CalendarDays,
  Building2,
  MapPin,
  Tag,
  Ticket,
  DollarSign,
  Pencil,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
} from 'lucide-react';
import {
  Card,
  EmptyState,
  ErrorNote,
  Meta,
  Pager,
  Poster,
  ProgressBar,
  SkeletonCard,
  StatusPill,
  SuccessNote,
  StatTile,
  MetricTile,
  Toggle,
  money,
  num,
  dateShort,
  timeShort,
} from '@/components/ui/soa';
import { TicketSalesTable } from '@/components/ui/ticket-sales-table';

interface TicketSummary {
  ticketId: number;
  ticketName: string;
  ticketPrice: number;
  ticketStatus?: string;
  ticketsSold?: number;
  revenue?: number;
  ticketCount?: number;
  originalTicketCount?: number;
}

interface EventRow {
  eventId: number;
  eventName: string;
  slug: string;
  eventPosterUrl: string;
  eventCategory: string;
  eventLocation: string;
  eventStartDate: string;
  status: string;
  companyId: number;
  companyName: string;
  percentageCommission: number | null;
  totalTicketsSold: number;
  totalRevenue: number;
  totalPlatformFee: number;
  analytics: {
    currentWeekSales: number;
    totalAttendees: number;
    totalTicketTypes: number;
  };
  ticketSummaries: TicketSummary[];
}

const PAGE_SIZE = 20;

function EventCard({
  event,
  onToggle,
  onEdit,
  toggling,
}: {
  event: EventRow;
  onToggle: (e: EventRow) => void;
  onEdit: (id: number) => void;
  toggling: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const capacity = event.ticketSummaries.reduce(
    (s, t) => s + (t.originalTicketCount ?? t.ticketCount ?? 0),
    0
  );
  const pct = capacity > 0 ? Math.min(100, Math.round((event.totalTicketsSold / capacity) * 100)) : 0;
  const isActive = event.status === 'ACTIVE';

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex">
        <Poster
          url={event.eventPosterUrl}
          name={event.eventName}
          seed={event.eventId}
          className="w-[100px] sm:w-[130px] self-stretch"
          style={{ minHeight: 196 }}
        />

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
                  {event.eventName}
                </span>
                <StatusPill status={event.status} />
              </div>
              <div className="flex flex-wrap gap-x-3.5 gap-y-[3px] mt-1.5">
                <Meta icon={Building2}>
                  {event.companyName}
                  <span
                    className="ml-1"
                    style={{ color: 'color-mix(in srgb, var(--color-text) 38%, transparent)' }}
                  >
                    #{event.companyId}
                  </span>
                </Meta>
                <Meta icon={MapPin}>{event.eventLocation}</Meta>
                <Meta icon={CalendarDays}>
                  {dateShort(event.eventStartDate)} · {timeShort(event.eventStartDate)}
                </Meta>
                <Meta icon={Tag}>{event.eventCategory}</Meta>
                {capacity > 0 && <Meta icon={Ticket}>{num(capacity)} capacity</Meta>}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-none">
              <button
                onClick={() => onToggle(event)}
                disabled={toggling}
                style={{
                  height: 30,
                  padding: '0 12px',
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 700,
                  fontFamily: 'var(--font-body)',
                  border: `1px solid ${isActive ? 'var(--color-accent-300)' : 'var(--color-accent-2-300)'}`,
                  background: 'transparent',
                  color: isActive ? 'var(--color-accent-700)' : 'var(--color-accent-2-700)',
                  opacity: toggling ? 0.5 : 1,
                }}
              >
                {toggling ? (
                  <Loader2 className="ic w-3 h-3 animate-spin" />
                ) : isActive ? (
                  'Hold'
                ) : (
                  'Activate'
                )}
              </button>
              <button
                onClick={() => onEdit(event.eventId)}
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
              <button
                onClick={() => window.open(`https://soldoutafrica.com/${event.slug}`, '_blank')}
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
            </div>
          </div>

          {capacity > 0 && (
            <div className="mt-3">
              <div className="flex justify-between mb-[5px]" style={{ fontSize: 11 }}>
                <span style={{ color: 'color-mix(in srgb, var(--color-text) 55%, transparent)' }}>
                  <span className="tnum font-semibold" style={{ color: 'var(--color-text)' }}>
                    {num(event.totalTicketsSold)}
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
            <MetricTile label="Revenue" value={money(event.totalRevenue)} color="var(--tint-olive-strong)" />
            <MetricTile
              label="Tickets sold"
              value={num(event.totalTicketsSold)}
              note={`${event.analytics.totalTicketTypes} type${event.analytics.totalTicketTypes === 1 ? '' : 's'}`}
            />
            <MetricTile
              label="Platform fee"
              value={money(event.totalPlatformFee)}
              note={
                event.percentageCommission != null
                  ? `${event.percentageCommission}% commission`
                  : undefined
              }
              color="var(--tint-clay-strong)"
            />
            <MetricTile
              label="This week"
              value={num(event.analytics.currentWeekSales)}
              color="var(--tint-sand-fg)"
            />
          </div>

          {event.ticketSummaries.length > 0 && (
            <button
              onClick={() => setExpanded((e) => !e)}
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
              {expanded ? (
                <ChevronUp className="ic w-[13px] h-[13px]" />
              ) : (
                <ChevronDown className="ic w-[13px] h-[13px]" />
              )}
              {expanded ? 'Hide' : 'Show'} ticket breakdown
            </button>
          )}
        </div>
      </div>

      {expanded && event.ticketSummaries.length > 0 && (
        <div
          className="animate-soa-fade-fast"
          style={{
            borderTop: '1px solid var(--color-divider)',
            background: 'var(--color-surface)',
          }}
        >
          <TicketSalesTable
            rows={event.ticketSummaries.map((t) => ({
              id: t.ticketId,
              name: t.ticketName,
              price: t.ticketPrice,
              status: t.ticketStatus,
              allocation: t.originalTicketCount ?? t.ticketCount,
              sold: t.ticketsSold ?? 0,
              revenue: t.revenue ?? 0,
            }))}
            commission={event.percentageCommission}
            totalRevenue={event.totalRevenue}
            totalSold={event.totalTicketsSold}
          />
        </div>
      )}
    </Card>
  );
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaging, setIsPaging] = useState(false);
  const [togglingEventId, setTogglingEventId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [activateFor, setActivateFor] = useState<EventRow | null>(null);
  const [commission, setCommission] = useState('5.0');
  const [published, setPublished] = useState(false);

  const fetchData = useCallback(
    async (page = 0, search?: string, paging = false) => {
      if (paging) setIsPaging(true);
      else setIsLoading(true);
      setError('');
      try {
        const response = await eventsApi.getAllEvents(page, PAGE_SIZE, search);
        if (response.status && response.data?.data) {
          setEvents(response.data.data as unknown as EventRow[]);
          setCurrentPage(response.data.page);
          setTotalPages(response.data.totalPages);
          setTotalElements(response.data.totalElements);
          setHasNext(response.data.hasNext);
          setHasPrevious(response.data.hasPrevious);
        } else {
          setError(response.message || 'Failed to load events');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setIsLoading(false);
        setIsPaging(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Escape closes the activation dialog.
  useEffect(() => {
    if (!activateFor) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setActivateFor(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activateFor]);

  const handleSearch = () => {
    setCurrentPage(0);
    fetchData(0, searchTerm || undefined);
  };

  const handleToggle = async (event: EventRow) => {
    if (event.status !== 'ACTIVE') {
      setActivateFor(event);
      setCommission('5.0');
      setPublished(false);
      return;
    }
    setTogglingEventId(event.eventId);
    setError('');
    setSuccess('');
    try {
      const response = await eventsApi.updateEvent(event.eventId, {
        status: 'ONHOLD',
        isActive: false,
      });
      if (response.status === true) {
        setSuccess(`"${event.eventName}" set to on hold`);
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

  const handleActivate = async () => {
    if (!activateFor) return;
    const value = parseFloat(commission);
    if (isNaN(value) || value < 0 || value > 100) {
      setError('Commission must be between 0 and 100');
      return;
    }
    const target = activateFor;
    setActivateFor(null);
    setTogglingEventId(target.eventId);
    setError('');
    setSuccess('');
    try {
      const response = await eventsApi.updateEvent(target.eventId, {
        status: 'ACTIVE',
        isActive: true,
        percentageCommission: value,
        published,
      });
      if (response.status === true) {
        setSuccess(
          `"${target.eventName}" activated at ${value}% commission · ${published ? 'Published' : 'Hidden'}`
        );
        await fetchData(currentPage, searchTerm || undefined);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(response.message || 'Failed to activate event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate event');
    } finally {
      setTogglingEventId(null);
    }
  };

  const pageRevenue = events.reduce((s, e) => s + e.totalRevenue, 0);
  const pageSold = events.reduce((s, e) => s + e.totalTicketsSold, 0);

  return (
    <div className="flex flex-col gap-3.5 animate-soa-fade">
      {/* Search + page totals */}
      <div className="flex flex-wrap gap-2.5 items-center justify-between">
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
            placeholder="Search events, companies, locations…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                fetchData(0);
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
        <div className="grid grid-cols-2 gap-2.5">
          <StatTile label="Page revenue" value={money(pageRevenue)} icon={DollarSign} />
          <StatTile
            label="Tickets sold"
            value={num(pageSold)}
            icon={Ticket}
            bg="var(--tint-clay-bg)"
            fg="var(--tint-clay-strong)"
          />
        </div>
      </div>

      {error && <ErrorNote message={error} onRetry={() => fetchData(currentPage)} />}
      {success && <SuccessNote message={success} />}

      <div className="relative flex flex-col gap-3.5">
        {isPaging && (
          <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl backdrop-blur-[1px] bg-[color-mix(in_srgb,var(--color-bg)_50%,transparent)]">
            <Loader2 className="ic w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} height={196} />)
        ) : events.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No events found"
            hint={searchTerm ? 'Try a different search term' : undefined}
          />
        ) : (
          events.map((event) => (
            <EventCard
              key={event.eventId}
              event={event}
              onToggle={handleToggle}
              onEdit={(id) => router.push(`/dashboard/events/${id}/edit`)}
              toggling={togglingEventId === event.eventId}
            />
          ))
        )}
      </div>

      <Pager
        page={currentPage}
        totalPages={totalPages}
        totalElements={totalElements}
        noun="events"
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        busy={isPaging}
        onPrev={() => fetchData(currentPage - 1, searchTerm || undefined, true)}
        onNext={() => fetchData(currentPage + 1, searchTerm || undefined, true)}
      />

      {/* Activation dialog */}
      {activateFor && (
        <div
          onClick={() => setActivateFor(null)}
          className="fixed inset-0 grid place-items-center p-4 animate-soa-fade"
          style={{
            zIndex: 70,
            background: 'color-mix(in srgb, var(--color-neutral-900) 50%, transparent)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Activate event"
            className="flex flex-col gap-3.5 animate-soa-pop"
            style={{
              width: 'min(440px, 100%)',
              background: 'var(--color-neutral-100)',
              borderRadius: 'var(--radius-dialog)',
              boxShadow: 'var(--shadow-lg)',
              padding: 18,
            }}
          >
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20 }}>
              Activate event
            </div>
            <p className="m-0" style={{ fontSize: 14, opacity: 0.85 }}>
              Set the platform commission for <strong>{activateFor.eventName}</strong> before it
              goes live.
            </p>
            <div className="field">
              <label htmlFor="commission">Commission (%)</label>
              <input
                id="commission"
                className="soa-input"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                placeholder="5.0"
                inputMode="decimal"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between px-0.5 py-1">
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Publish immediately</div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: 'color-mix(in srgb, var(--color-text) 52%, transparent)',
                  }}
                >
                  Make the event visible to buyers
                </div>
              </div>
              <Toggle checked={published} onChange={setPublished} label="Publish immediately" />
            </div>
            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={() => setActivateFor(null)}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'var(--font-body)',
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-control)',
                  border: '1px solid var(--color-divider)',
                  background: 'transparent',
                  color: 'var(--color-text)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleActivate}
                className="flex items-center gap-1.5"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'var(--font-body)',
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-control)',
                  border: 'none',
                  background: 'var(--color-accent-2)',
                  color: '#fff',
                }}
              >
                <Check className="ic w-[15px] h-[15px]" />
                Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
