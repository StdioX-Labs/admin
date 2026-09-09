'use client';

import { useState, useEffect, useCallback } from 'react';
import { eventsApi } from '@/lib/api';
import {
  Building2,
  MapPin,
  CalendarDays,
  Tag,
  Ticket,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  RotateCcw,
  Globe,
  EyeOff,
} from 'lucide-react';
import {
  Card,
  EmptyState,
  ErrorNote,
  Meta,
  Pager,
  Poster,
  SkeletonCard,
  SuccessNote,
  Toggle,
  money,
  num,
  dateShort,
  timeShort,
} from '@/components/ui/soa';

interface TicketSummary {
  ticketId: number;
  ticketName: string;
  ticketPrice: number;
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
  companyId: number;
  companyName: string;
  ticketSummaries: TicketSummary[];
  published?: boolean;
}

const PAGE_SIZE = 20;

function ApprovalCard({
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
  onCommissionChange: (v: string) => void;
  onPublishedChange: (v: boolean) => void;
  onApprove: () => void;
  approving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const value = parseFloat(commission);
  const valid = !isNaN(value) && value >= 0 && value <= 100;
  const capacity = event.ticketSummaries.reduce(
    (s, t) => s + (t.originalTicketCount ?? t.ticketCount ?? 0),
    0
  );
  const cheapest = event.ticketSummaries.length
    ? Math.min(...event.ticketSummaries.map((t) => t.ticketPrice))
    : null;

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="flex">
        <div className="relative flex-none">
          <Poster
            url={event.eventPosterUrl}
            name={event.eventName}
            seed={event.eventId}
            className="w-[96px] sm:w-[136px] h-full"
            style={{ minHeight: 160 }}
          />
          <span
            className="absolute inline-flex items-center gap-1"
            style={{
              top: 8,
              left: 8,
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 999,
              background: 'color-mix(in srgb, var(--tint-clay-bg) 92%, transparent)',
              color: 'var(--tint-clay-fg)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <Clock className="ic w-2.5 h-2.5" />
            On hold
          </span>
        </div>

        <div className="flex-1 min-w-0 p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3
                className="m-0"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16, lineHeight: 1.15 }}
              >
                {event.eventName}
              </h3>
              <div className="flex flex-wrap gap-x-3.5 gap-y-[3px] mt-1.5">
                <Meta icon={Building2}>{event.companyName}</Meta>
                <Meta icon={Tag}>{event.eventCategory}</Meta>
                <Meta icon={MapPin}>{event.eventLocation}</Meta>
                <Meta icon={CalendarDays}>
                  {dateShort(event.eventStartDate)} · {timeShort(event.eventStartDate)}
                </Meta>
                <Meta icon={Ticket}>
                  Sales: {dateShort(event.ticketSaleStartDate)} – {dateShort(event.ticketSaleEndDate)}
                </Meta>
              </div>
            </div>
            <button
              onClick={() => window.open(`https://soldoutafrica.com/${event.slug}`, '_blank')}
              title="Preview event"
              className="grid place-items-center flex-none"
              style={{
                width: 30,
                height: 30,
                border: 'none',
                background: 'transparent',
                borderRadius: 9,
                color: 'color-mix(in srgb, var(--color-text) 40%, transparent)',
              }}
            >
              <ExternalLink className="ic w-[15px] h-[15px]" />
            </button>
          </div>

          {event.eventDescription && (
            <p
              className="m-0 line-clamp-2"
              style={{
                fontSize: 11.5,
                lineHeight: 1.5,
                color: 'color-mix(in srgb, var(--color-text) 60%, transparent)',
              }}
            >
              {event.eventDescription}
            </p>
          )}

          {event.ticketSummaries.length > 0 && (
            <div>
              <button
                onClick={() => setExpanded((e) => !e)}
                className="flex items-center gap-1"
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: 11.5,
                  color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {expanded ? (
                  <ChevronUp className="ic w-3 h-3" />
                ) : (
                  <ChevronDown className="ic w-3 h-3" />
                )}
                {event.ticketSummaries.length} ticket type
                {event.ticketSummaries.length === 1 ? '' : 's'}
                {!expanded && cheapest !== null && (
                  <span style={{ color: 'color-mix(in srgb, var(--color-text) 40%, transparent)' }}>
                    · from {cheapest === 0 ? 'Free' : money(cheapest)}
                  </span>
                )}
              </button>
              {expanded && (
                <div
                  className="mt-2 overflow-x-auto animate-soa-fade-fast"
                  style={{ border: '1px solid var(--color-divider)', borderRadius: 10 }}
                >
                  <table className="soa-table" style={{ minWidth: 280 }}>
                    <thead style={{ background: 'var(--color-surface)' }}>
                      <tr>
                        <th>Type</th>
                        <th className="num">Price</th>
                        <th className="num">Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {event.ticketSummaries.map((t) => (
                        <tr key={t.ticketId}>
                          <td>{t.ticketName}</td>
                          <td className="num">
                            {t.ticketPrice === 0 ? 'Free' : money(t.ticketPrice)}
                          </td>
                          <td className="num">
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

          {capacity > 0 && (
            <div
              style={{
                fontSize: 11,
                color: 'color-mix(in srgb, var(--color-text) 42%, transparent)',
              }}
            >
              {num(capacity)} total capacity
            </div>
          )}

          {/* Approval controls */}
          <div
            className="flex flex-wrap items-center gap-3 pt-2.5 mt-auto"
            style={{ borderTop: '1px solid var(--color-divider)' }}
          >
            <div className="flex items-center gap-2">
              <label
                htmlFor={`commission-${event.eventId}`}
                style={{ fontSize: 11.5, fontWeight: 600 }}
                className="whitespace-nowrap text-muted-foreground"
              >
                Commission %
              </label>
              <input
                id={`commission-${event.eventId}`}
                className="soa-input tnum"
                style={{
                  height: 30,
                  minHeight: 30,
                  width: 76,
                  textAlign: 'center',
                  padding: '0 8px',
                  background: 'var(--color-neutral-100)',
                }}
                value={commission}
                inputMode="decimal"
                onChange={(e) => onCommissionChange(e.target.value)}
              />
              {!valid && commission !== '' && (
                <span style={{ fontSize: 10, color: 'var(--tint-danger-fg)' }}>0–100</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span style={{ fontSize: 11.5, fontWeight: 600 }} className="text-muted-foreground">
                Published
              </span>
              <Toggle checked={published} onChange={onPublishedChange} label="Publish on approval" />
              <span
                className="inline-flex items-center gap-1"
                style={{
                  fontSize: 10,
                  color: published
                    ? 'var(--color-accent-2-700)'
                    : 'color-mix(in srgb, var(--color-text) 50%, transparent)',
                }}
              >
                {published ? (
                  <>
                    <Globe className="ic w-2.5 h-2.5" />
                    Live
                  </>
                ) : (
                  <>
                    <EyeOff className="ic w-2.5 h-2.5" />
                    Hidden
                  </>
                )}
              </span>
            </div>

            <button
              onClick={onApprove}
              disabled={approving || !valid}
              className="ml-auto flex items-center gap-1.5 disabled:opacity-50"
              style={{
                height: 32,
                padding: '0 18px',
                borderRadius: 'var(--radius-control)',
                border: 'none',
                background: 'var(--color-accent-2)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
              }}
            >
              {approving ? (
                <>
                  <Loader2 className="ic w-3.5 h-3.5 animate-spin" />
                  Approving…
                </>
              ) : (
                <>
                  <Check className="ic w-3.5 h-3.5" />
                  Approve
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ApprovalsPage() {
  const [events, setEvents] = useState<OnHoldEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  // Per-event approval parameters, preserved across refetches.
  const [settings, setSettings] = useState<
    Record<number, { commission: string; published: boolean }>
  >({});

  const fetchEvents = useCallback(async (page = 0, { silent = false } = {}) => {
    // Swapping up to 20 cards for 3 skeletons collapses the scroller by a few
    // thousand pixels, so the browser clamps the scroll offset and throws the
    // reader back to the top. Only the first load may do that; paging, Refresh
    // and post-approval reads keep the list mounted under an overlay instead.
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setError('');
    try {
      const res = await eventsApi.getAllEvents(page, PAGE_SIZE, undefined, 'ONHOLD');
      if (res.status && res.data?.data) {
        const data = res.data.data as unknown as OnHoldEvent[];
        setEvents(data);
        setCurrentPage(res.data.page);
        setTotalPages(res.data.totalPages);
        setTotalElements(res.data.totalElements);
        setHasNext(res.data.hasNext);
        setHasPrevious(res.data.hasPrevious);
        setSettings((prev) => {
          const next = { ...prev };
          data.forEach((e) => {
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
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(0);
  }, [fetchEvents]);

  const handleApprove = async (event: OnHoldEvent) => {
    const s = settings[event.eventId] ?? { commission: '5', published: false };
    const value = parseFloat(s.commission);
    if (isNaN(value) || value < 0 || value > 100) return;

    setApprovingId(event.eventId);
    setError('');
    setSuccess('');
    try {
      const res = await eventsApi.updateEvent(event.eventId, {
        status: 'ACTIVE',
        isActive: true,
        percentageCommission: value,
        published: s.published,
      });
      if (!res.status) throw new Error(res.message || 'Failed to approve event');
      setSuccess(
        `"${event.eventName}" approved at ${value}% commission · ${s.published ? 'Published' : 'Hidden'}`
      );
      setTimeout(() => setSuccess(''), 6000);
      await fetchEvents(currentPage, { silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 animate-soa-fade" style={{ maxWidth: 880 }}>
      <div className="flex items-center justify-between gap-4">
        {!isLoading && totalElements > 0 ? (
          <div
            className="flex flex-row items-center gap-3 flex-1"
            style={{
              background: 'var(--color-accent-100)',
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-sm)',
              padding: '13px 16px',
            }}
          >
            <span
              className="grid place-items-center flex-none"
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                background: 'var(--color-accent)',
                color: '#fff',
              }}
            >
              <Clock className="ic w-[18px] h-[18px]" />
            </span>
            <div style={{ fontSize: 13, color: 'var(--color-accent-800)' }}>
              <strong>{totalElements}</strong> event{totalElements === 1 ? '' : 's'} waiting for
              review
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}
        <button
          onClick={() => fetchEvents(currentPage, { silent: true })}
          className="flex items-center gap-1.5 flex-none"
          style={{
            height: 34,
            padding: '0 14px',
            borderRadius: 999,
            border: '1px solid var(--color-divider)',
            background: 'var(--color-neutral-100)',
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text)',
          }}
        >
          <RotateCcw className="ic w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {error && <ErrorNote message={error} onRetry={() => fetchEvents(currentPage, { silent: true })} />}
      {success && <SuccessNote message={success} />}

      <div className="relative flex flex-col gap-3.5">
        {isRefreshing && (
          <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl backdrop-blur-[1px] bg-[color-mix(in_srgb,var(--color-bg)_50%,transparent)]">
            <Loader2 className="ic w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} height={200} />)
        ) : events.length === 0 ? (
          <EmptyState
            icon={Check}
            title="All caught up"
            hint="No events waiting for review."
            tone="success"
          />
        ) : (
          events.map((event) => (
            <ApprovalCard
              key={event.eventId}
              event={event}
              commission={settings[event.eventId]?.commission ?? '5'}
              published={settings[event.eventId]?.published ?? false}
              onCommissionChange={(v) =>
                setSettings((prev) => ({
                  ...prev,
                  [event.eventId]: { ...prev[event.eventId], commission: v },
                }))
              }
              onPublishedChange={(v) =>
                setSettings((prev) => ({
                  ...prev,
                  [event.eventId]: { ...prev[event.eventId], published: v },
                }))
              }
              onApprove={() => handleApprove(event)}
              approving={approvingId === event.eventId}
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
        onPrev={() => fetchEvents(currentPage - 1, { silent: true })}
        onNext={() => fetchEvents(currentPage + 1, { silent: true })}
      />
    </div>
  );
}
