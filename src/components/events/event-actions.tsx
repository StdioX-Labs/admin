'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileDown, Gift, Loader2 } from 'lucide-react';
import { eventsApi } from '@/lib/api';
import { money } from '@/components/ui/soa';
import {
  formatKenyanPhone,
  isValidEmail,
  normalizeEmail,
  normalizeKenyanPhone,
} from '@/lib/phone';

/**
 * The per-event actions shared by the Events list and Active sales.
 *
 * Both lists show the same events and want the same two verbs on them, so the
 * behaviour lives here once. Each page keeps its own error and success
 * banners — they present feedback differently — and passes them in.
 */

/**
 * A success banner that clears itself, with one timer rather than one per
 * message.
 *
 * Independent `setTimeout(..., 6000)` calls race: a message set by one action
 * is wiped by the timer another action queued moments earlier, so the newest
 * message is the one that disappears. Pages here now feed a single banner from
 * several actions, which makes that collision easy to hit.
 */
export function useFlashMessage(ms = 6000) {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(next);
      timer.current = setTimeout(() => setMessage(''), ms);
    },
    [ms]
  );

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setMessage('');
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { message, show, clear };
}

/** The least an event must expose to be actionable. Both list rows satisfy it structurally. */
export interface EventActionTarget {
  eventId: number;
  eventName: string;
  ticketSummaries: Array<{ ticketId: number; ticketName: string; ticketPrice: number }>;
}

const ICON_BUTTON: React.CSSProperties = {
  width: 30,
  height: 30,
  border: 'none',
  background: 'transparent',
  borderRadius: 9,
  color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
};

/**
 * Downloads a certified report as PDF and CSV.
 *
 * The request returns figures already signed by the server; this only renders
 * them. Building the document from numbers the page happens to be holding
 * would certify nothing. jsPDF is imported lazily so the ~350KB stays out of
 * the initial bundle for everyone who never downloads a report.
 */
export function useCertifiedReport(handlers: {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [busyEventId, setBusyEventId] = useState<number | null>(null);

  const download = async (event: EventActionTarget) => {
    setBusyEventId(event.eventId);
    try {
      const [{ buildReportPdf, buildReportCsv, reportFileStem, saveBlob }, resp] = await Promise.all([
        import('@/lib/report-document'),
        fetch(`/api/events/${event.eventId}/report`, { credentials: 'include' }),
      ]);
      const data = await resp.json();
      if (!resp.ok || !data.status) throw new Error(data.message || 'Could not build the report');

      const stem = reportFileStem(data.report);
      const verifyUrl = `${window.location.origin}/api/reports/verify`;
      saveBlob(buildReportPdf(data.report, data.certificate, verifyUrl), `${stem}.pdf`);
      saveBlob(buildReportCsv(data.report, data.certificate), `${stem}.csv`);
      handlers.onSuccess(`Certified report ${data.report.reference} downloaded (PDF + CSV)`);
    } catch (err) {
      handlers.onError(err instanceof Error ? err.message : 'Could not build the report');
    } finally {
      setBusyEventId(null);
    }
  };

  return { download, busyEventId };
}

export function ReportButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      title="Download certified performance report"
      className="grid place-items-center disabled:opacity-50"
      style={ICON_BUTTON}
    >
      {busy ? (
        <Loader2 className="ic w-[15px] h-[15px] animate-spin" />
      ) : (
        <FileDown className="ic w-[15px] h-[15px]" />
      )}
    </button>
  );
}

export function ComplimentaryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Issue complimentary tickets"
      className="grid place-items-center"
      style={ICON_BUTTON}
    >
      <Gift className="ic w-[15px] h-[15px]" />
    </button>
  );
}

/**
 * Issues free tickets to one recipient.
 *
 * Validation mirrors the route's so a mistake is caught before it becomes a
 * request; the route checks again, because it cannot trust this page. The
 * normalised phone number is echoed back before sending — free tickets cannot
 * be recalled, so the admin should see where they are actually going.
 */
export function ComplimentaryTicketsModal({
  event,
  onClose,
  onIssued,
}: {
  event: EventActionTarget;
  onClose: () => void;
  onIssued: (message: string) => void;
}) {
  const [ticketId, setTicketId] = useState(
    event.ticketSummaries[0] ? String(event.ticketSummaries[0].ticketId) : ''
  );
  const [qty, setQty] = useState('1');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!isValidEmail(email)) return setError('Enter a valid recipient email address');
    if (!normalizeKenyanPhone(phone))
      return setError('Enter a valid Kenyan phone number, e.g. 0715066651');
    if (!ticketId) return setError('Select a ticket type');
    const quantity = Number(qty);
    if (!Number.isInteger(quantity) || quantity < 1)
      return setError('Quantity must be a whole number of at least 1');

    setBusy(true);
    setError('');
    try {
      const resp = await eventsApi.issueComplementary({
        eventId: event.eventId,
        customer: { mobile_number: phone, email },
        tickets: [{ ticketId: Number(ticketId), quantity }],
      });
      if (resp.status === false) throw new Error(resp.message || 'Failed to issue');
      const tier = event.ticketSummaries.find((t) => String(t.ticketId) === ticketId);
      onIssued(
        `${quantity} complimentary ${tier?.ticketName ?? 'ticket'}${quantity === 1 ? '' : 's'} issued to ` +
          `${normalizeEmail(email)} (${formatKenyanPhone(phone)})`
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue complimentary tickets');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={() => !busy && onClose()}
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
        aria-label="Issue complimentary tickets"
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
          Issue complimentary tickets
        </div>
        <p className="m-0" style={{ fontSize: 14, opacity: 0.85 }}>
          Free tickets for <strong>{event.eventName}</strong>, sent straight to the recipient. This
          cannot be undone.
        </p>

        <div className="field">
          <label htmlFor="comp-ticket">Ticket type</label>
          <select
            id="comp-ticket"
            className="soa-input"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
          >
            {event.ticketSummaries.length === 0 && <option value="">No ticket types</option>}
            {event.ticketSummaries.map((t) => (
              <option key={t.ticketId} value={String(t.ticketId)}>
                {t.ticketName}
                {t.ticketPrice ? ` — ${money(t.ticketPrice)}` : ' — Free'}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="comp-qty">Quantity</label>
          <input
            id="comp-qty"
            className="soa-input"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            placeholder="1"
          />
        </div>

        <div className="field">
          <label htmlFor="comp-email">Recipient email</label>
          <input
            id="comp-email"
            className="soa-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="name@example.com"
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="comp-phone">Recipient phone</label>
          <input
            id="comp-phone"
            className="soa-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="0715066651"
          />
          {phone && normalizeKenyanPhone(phone) && (
            <div
              style={{
                fontSize: 11.5,
                marginTop: 5,
                color: 'color-mix(in srgb, var(--color-text) 52%, transparent)',
              }}
            >
              Will send to {formatKenyanPhone(phone)}
            </div>
          )}
        </div>

        {error && <div style={{ fontSize: 12.5, color: 'var(--tint-danger-strong)' }}>{error}</div>}

        <div className="flex gap-2.5 justify-end mt-1">
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              padding: '9px 16px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-divider)',
              background: 'transparent',
              color: 'var(--color-text)',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || event.ticketSummaries.length === 0}
            className="flex items-center gap-1.5 disabled:opacity-50"
            style={{
              padding: '9px 16px',
              borderRadius: 'var(--radius-control)',
              border: 'none',
              background: 'var(--color-accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
            }}
          >
            {busy ? (
              <>
                <Loader2 className="ic w-3.5 h-3.5 animate-spin" />
                Issuing…
              </>
            ) : (
              <>
                <Gift className="ic w-3.5 h-3.5" />
                Issue tickets
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
