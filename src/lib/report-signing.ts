import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as cryptoSign,
  verify as cryptoVerify,
  type KeyObject,
} from 'node:crypto';

/**
 * Signing for certified event performance reports.
 *
 * A report is only worth the word "certified" if a recipient can prove the
 * figures were not edited after we issued them. So the numbers are read from
 * the platform API on the server, serialised canonically, and signed with a
 * platform key the browser never sees. Anyone holding the public key can
 * re-canonicalise the payload and verify the signature; changing a single
 * shilling invalidates it.
 *
 * Ed25519 is the algorithm: small keys, small signatures, no parameter choices
 * to get wrong.
 *
 * Set up the key once, and keep the private half out of the repo:
 *
 *   openssl genpkey -algorithm ed25519 -out report-key.pem
 *   REPORT_SIGNING_PRIVATE_KEY=$(base64 < report-key.pem | tr -d '\n')
 *
 * Put that value in the deployment's environment. It is read at request time,
 * so it must NOT carry the NEXT_PUBLIC_ prefix — that would inline the private
 * key into the browser bundle.
 */

export const SIGNING_ALGORITHM = 'Ed25519';

export class SigningKeyMissingError extends Error {
  constructor() {
    super(
      'REPORT_SIGNING_PRIVATE_KEY is not configured. Generate one with ' +
        '`openssl genpkey -algorithm ed25519 -out report-key.pem` and set the ' +
        'base64 of that file as REPORT_SIGNING_PRIVATE_KEY.'
    );
    this.name = 'SigningKeyMissingError';
  }
}

/** PEM straight from the env var, or base64 of it — both are awkward to paste, so accept either. */
function readPrivateKey(): KeyObject {
  const raw = process.env.REPORT_SIGNING_PRIVATE_KEY;
  if (!raw || !raw.trim()) throw new SigningKeyMissingError();
  const pem = raw.includes('BEGIN')
    ? raw.replace(/\\n/g, '\n')
    : Buffer.from(raw, 'base64').toString('utf8');
  return createPrivateKey(pem);
}

/**
 * Deterministic serialisation: object keys sorted at every depth, no
 * whitespace. Two parties must agree byte-for-byte on what was signed, and
 * JSON.stringify alone does not guarantee key order across producers.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(',')}}`;
}

export function payloadHash(payload: unknown): string {
  return createHash('sha256').update(canonicalize(payload), 'utf8').digest('hex');
}

/** Short, stable identifier for the key that signed a report, so keys can be rotated without ambiguity. */
export function keyIdFor(publicKey: KeyObject): string {
  const der = publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
  return createHash('sha256').update(der).digest('hex').slice(0, 16);
}

export interface Certificate {
  algorithm: typeof SIGNING_ALGORITHM;
  keyId: string;
  /** SHA-256 of the canonical payload — printed on the document so it can be checked by eye. */
  payloadHash: string;
  signature: string;
  signedAt: string;
}

export function signPayload(payload: unknown): Certificate {
  const privateKey = readPrivateKey();
  const publicKey = createPublicKey(privateKey);
  const message = Buffer.from(canonicalize(payload), 'utf8');
  return {
    algorithm: SIGNING_ALGORITHM,
    keyId: keyIdFor(publicKey),
    payloadHash: createHash('sha256').update(message).digest('hex'),
    signature: cryptoSign(null, message, privateKey).toString('base64'),
    signedAt: new Date().toISOString(),
  };
}

export function verifyPayload(payload: unknown, certificate: Pick<Certificate, 'signature'>): boolean {
  const publicKey = createPublicKey(readPrivateKey());
  const message = Buffer.from(canonicalize(payload), 'utf8');
  try {
    return cryptoVerify(null, message, publicKey, Buffer.from(certificate.signature, 'base64'));
  } catch {
    return false;
  }
}

export function publicKeyPem(): string {
  return createPublicKey(readPrivateKey())
    .export({ type: 'spki', format: 'pem' })
    .toString();
}
