import { upstreamStatus } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_USERNAME = process.env.NEXT_PUBLIC_API_USERNAME;
const API_PASSWORD = process.env.NEXT_PUBLIC_API_PASSWORD;

/**
 * Accurate per-tier ticket figures.
 *
 * Only one place on the platform reports these correctly. The event detail
 * endpoint carries `soldQuantity`, a column nothing ever increments, and no
 * revenue at all — reading counts from it yields zeroes. The admin listing
 * overwrites its counts from customer_tickets, one row per issued ticket,
 * because the GL log holds one entry per transaction and undercounts
 * multi-ticket purchases.
 *
 * `numberOfComplementary` on the detail payload is the configured allowance
 * for a tier, not what has been issued against it; the two are easy to
 * confuse and mean very different things on a sales table.
 */
export interface TicketFigures {
  ticketId: number;
  ticketName: string;
  ticketPrice: number;
  /**
   * How many tickets one purchase of this type issues. 1 for an ordinary
   * ticket, 5 for a "group of 5". Everything below counted in *tickets* has to
   * be divided by this to get purchases.
   */
  ticketsPerSale: number;
  /** Everything issued, paid and free together — in tickets, not purchases. */
  ticketsIssued: number;
  ticketsPaid: number;
  ticketsComplimentary: number;
  /** Paid purchases. This is the figure that multiplies by price to give revenue. */
  salesPaid: number;
  revenue: number;
  allocated: number;
  remaining: number;
}

interface AdminTicketSummary {
  ticketId?: number;
  ticketName?: string;
  ticketPrice?: number;
  uniqueTicketCount?: number;
  paidTicketsSold?: number;
  complementaryTicketsSold?: number;
  totalTicketSaleBalance?: number;
  originalTicketCount?: number;
  ticketCount?: number;
  ticketsToIssue?: number;
}

const num = (...v: Array<number | undefined>) => v.find((x) => typeof x === 'number') ?? 0;

export function authHeader() {
  return `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`;
}

/**
 * Looks the event up in the admin listing by name, then matches on id.
 *
 * The listing is the only source of accurate counts and has no by-id filter —
 * its query is `LOWER(event_name) LIKE %searchName%` and nothing else — so the
 * name is the way in and the id is what confirms the row.
 *
 * Returns null when the figures cannot be established. Callers must treat that
 * as "unknown", never as zero.
 */
export async function fetchTicketFigures(
  eventId: number,
  eventName: string
): Promise<TicketFigures[] | null> {
  try {
    const resp = await fetch(
      `${API_BASE_URL}/admin/events/get/all?page=0&size=50&searchName=${encodeURIComponent(eventName)}`,
      {
        headers: {
          Authorization: authHeader(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );
    if (!resp.ok || !resp.headers.get('content-type')?.includes('application/json')) return null;

    const data = await resp.json();
    const rows = data?.data?.data;
    if (!Array.isArray(rows)) return null;

    const match = rows.find(
      (r: { eventId?: number; id?: number }) => num(r.eventId, r.id) === eventId
    );
    if (!match || !Array.isArray(match.ticketSummaries)) return null;

    return (match.ticketSummaries as AdminTicketSummary[]).map((t) => {
      const issued = num(t.uniqueTicketCount);
      const complimentary = num(t.complementaryTicketsSold);
      // Trust the platform's own split; derive the remainder only when the paid
      // count is absent, so the parts can never disagree with the total.
      const paid =
        typeof t.paidTicketsSold === 'number'
          ? t.paidTicketsSold
          : Math.max(0, issued - complimentary);
      // A group ticket issues several tickets per sale, so the row counts above
      // are admissions. Treat a missing or nonsensical value as 1 rather than
      // dividing by it.
      const perSale = Math.max(1, num(t.ticketsToIssue) || 1);
      return {
        ticketId: num(t.ticketId),
        ticketName: t.ticketName ?? 'Unnamed tier',
        ticketPrice: num(t.ticketPrice),
        ticketsPerSale: perSale,
        ticketsIssued: issued,
        ticketsPaid: paid,
        ticketsComplimentary: complimentary,
        salesPaid: Math.floor(paid / perSale),
        revenue: num(t.totalTicketSaleBalance),
        // Allocation is stored, not derived, and only the platform's own edit
        // paths keep it in step with stock — a direct database change to
        // quantity_available leaves it behind. It can never be less than what
        // is still on sale plus what has already sold, so when the stored
        // figure falls below that it is provably stale and the floor is used
        // instead. This keeps sell-through under 100% and remaining
        // non-negative rather than printing an impossible allocation.
        allocated: Math.max(num(t.originalTicketCount), num(t.ticketCount) + paid),
        remaining: num(t.ticketCount),
      };
    });
  } catch {
    return null;
  }
}

export { upstreamStatus };
