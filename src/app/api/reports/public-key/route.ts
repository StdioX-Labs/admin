import { NextResponse } from 'next/server';
import { publicKeyPem, keyIdFor, SIGNING_ALGORITHM, SigningKeyMissingError } from '@/lib/report-signing';
import { createPublicKey } from 'node:crypto';

/**
 * The public half of the report signing key.
 *
 * Deliberately unauthenticated: a recipient checking a report we issued them
 * is, by definition, not an admin of this console. A public key is safe to
 * publish — that is what makes the signature worth anything.
 */
export async function GET() {
  try {
    const pem = publicKeyPem();
    return NextResponse.json({
      status: true,
      algorithm: SIGNING_ALGORITHM,
      keyId: keyIdFor(createPublicKey(pem)),
      publicKey: pem,
      usage:
        'Verify a certified report by re-serialising its `report` object with sorted keys and no whitespace, then checking `certificate.signature` (base64) against these bytes with Ed25519.',
    });
  } catch (error) {
    if (error instanceof SigningKeyMissingError) {
      return NextResponse.json(
        { status: false, message: 'Report signing is not configured on this deployment.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ status: false, message: 'Unable to read the signing key' }, { status: 500 });
  }
}
