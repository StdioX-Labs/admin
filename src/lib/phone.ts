/**
 * Recipient details for complimentary tickets.
 *
 * The platform expects Kenyan mobile numbers as bare `254XXXXXXXXX` — no plus,
 * no spaces, no leading zero. Admins paste them in every shape, so normalise
 * first and reject only what cannot be read. The rules mirror the organiser
 * dashboard (web-dashboard components/event-detail-page.tsx) so a number
 * accepted there is accepted here.
 */

export function normalizeKenyanPhone(input: string): string | null {
  const digits = (input || '').replace(/\D/g, '');
  if (!digits) return null;

  let phone: string;
  if (digits.startsWith('254')) {
    phone = digits;                       // already country-coded
  } else if (digits.startsWith('0')) {
    phone = '254' + digits.slice(1);      // 0715066651 -> 254715066651
  } else if (digits.length === 9) {
    phone = '254' + digits;               // 715066651  -> 254715066651
  } else {
    phone = '254' + digits.replace(/^0+/, '');
  }

  return phone.length === 12 && phone.startsWith('254') ? phone : null;
}

/** How a normalised number should read back to a person: +254 715 066 651. */
export function formatKenyanPhone(input: string): string {
  const n = normalizeKenyanPhone(input);
  if (!n) return input;
  return `+${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}`;
}

export function normalizeEmail(input: string): string {
  return (input || '').trim().toLowerCase();
}

export function isValidEmail(input: string): boolean {
  const e = normalizeEmail(input);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}
