'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Hammer } from 'lucide-react';
import { Card } from '@/components/ui/soa';

/**
 * Shared placeholder for console sections that are routed but not yet built.
 * Keeps unfinished areas inside the design system instead of showing bare
 * unstyled text.
 */
export function ComingSoon({
  title,
  description,
  backHref,
  backLabel,
  detail,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  detail?: string;
}) {
  const router = useRouter();

  return (
    <div className="max-w-[620px] mx-auto animate-soa-fade flex flex-col gap-3.5">
      {backHref && (
        <button
          onClick={() => router.push(backHref)}
          className="self-start flex items-center gap-1.5"
          style={{
            fontSize: 12.5,
            border: 'none',
            background: 'transparent',
            color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
            minHeight: 36,
          }}
        >
          <ArrowLeft className="ic w-3.5 h-3.5" />
          {backLabel ?? 'Back'}
        </button>
      )}

      <Card className="items-center text-center" padded={false} style={{ padding: '56px 24px' }}>
        <span
          className="grid place-items-center"
          style={{
            width: 52,
            height: 52,
            borderRadius: 999,
            background: 'var(--tint-sand-bg)',
            color: 'var(--tint-sand-fg)',
          }}
        >
          <Hammer className="ic w-6 h-6" />
        </span>
        <h2 className="mt-3 mb-0" style={{ fontSize: 19 }}>
          {title}
        </h2>
        {description && (
          <p
            className="m-0 mt-1"
            style={{
              fontSize: 13,
              maxWidth: '32em',
              color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
            }}
          >
            {description}
          </p>
        )}
        {detail && (
          <p
            className="tnum m-0 mt-3"
            style={{
              fontSize: 11.5,
              padding: '4px 12px',
              borderRadius: 999,
              background: 'var(--color-surface)',
              color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
            }}
          >
            {detail}
          </p>
        )}
      </Card>
    </div>
  );
}
