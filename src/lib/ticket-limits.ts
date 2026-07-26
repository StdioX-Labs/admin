/**
 * Guard rails for "tickets to issue".
 *
 * `ticketsToIssue` tells the backend how many ticket records to generate up
 * front — it is NOT the sellable allocation (`quantityAvailable`). Issuing a
 * large batch in one request overwhelms the issuer, so:
 *
 *  - a blank field means issue none (0), never "same as quantity";
 *  - a single request is capped at MAX_TICKETS_TO_ISSUE;
 *  - the value can never exceed the ticket's own allocation.
 */

export const MAX_TICKETS_TO_ISSUE = 1000;

/** Parse a form value into a safe issue count. Blank/invalid → 0. */
export function parseTicketsToIssue(raw: string | number | undefined | null): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

/** Clamp to the per-request cap and the ticket's allocation. */
export function clampTicketsToIssue(raw: string | number | undefined | null, allocation: number): number {
  const n = parseTicketsToIssue(raw);
  const ceiling = allocation > 0 ? Math.min(MAX_TICKETS_TO_ISSUE, allocation) : MAX_TICKETS_TO_ISSUE;
  return Math.min(n, ceiling);
}

/**
 * Validation message for a "tickets to issue" field, or undefined when fine.
 * `label` prefixes the message (e.g. "Ticket 2").
 */
export function validateTicketsToIssue(
  raw: string,
  allocation: number,
  label?: string
): string | undefined {
  const prefix = label ? `${label}: ` : '';
  if (!raw.trim()) return undefined; // blank is valid — issues none
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    return `${prefix}tickets to issue must be a positive number`;
  }
  if (n > MAX_TICKETS_TO_ISSUE) {
    return `${prefix}cannot issue more than ${MAX_TICKETS_TO_ISSUE.toLocaleString()} tickets at once`;
  }
  if (allocation > 0 && n > allocation) {
    return `${prefix}tickets to issue cannot exceed the quantity available (${allocation.toLocaleString()})`;
  }
  return undefined;
}
