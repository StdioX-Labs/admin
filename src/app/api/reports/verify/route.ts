import { NextRequest, NextResponse } from 'next/server';
import { payloadHash, verifyPayload, SigningKeyMissingError } from '@/lib/report-signing';

/**
 * Checks a certified report against the platform key.
 *
 * Post back the whole `{ report, certificate }` object exactly as it was
 * issued. Unauthenticated for the same reason the public key is: the person
 * who most needs to verify a report is the organiser it was handed to.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { report, certificate } = body ?? {};
    if (!report || !certificate?.signature) {
      return NextResponse.json(
        { status: false, valid: false, message: 'Send the whole { report, certificate } object as issued.' },
        { status: 400 }
      );
    }

    const recomputed = payloadHash(report);
    const hashMatches = recomputed === certificate.payloadHash;
    const signatureValid = verifyPayload(report, certificate);

    return NextResponse.json({
      status: true,
      valid: signatureValid && hashMatches,
      signatureValid,
      hashMatches,
      recomputedHash: recomputed,
      statedHash: certificate.payloadHash ?? null,
      message:
        signatureValid && hashMatches
          ? 'Valid — these figures are exactly as issued.'
          : 'INVALID — this document does not match what was issued.',
    });
  } catch (error) {
    if (error instanceof SigningKeyMissingError) {
      return NextResponse.json(
        { status: false, message: 'Report signing is not configured on this deployment.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ status: false, valid: false, message: 'Could not read the document' }, { status: 400 });
  }
}
