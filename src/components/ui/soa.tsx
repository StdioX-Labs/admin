'use client';

/**
 * Organic design-system primitives.
 *
 * Small building blocks shared by every console screen — cards, KPI tiles,
 * status pills, progress bars, pagers — plus the formatters the design uses
 * for money, counts and dates. Ported from the "SoldOutAfrica Admin Redesign"
 * Claude Design project.
 */

import type { CSSProperties, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';

/* ── formatters ─────────────────────────────────────────────────────────── */

/** Currency, rendered as "KSh 1,234" — the design relabels the KES symbol. */
export function money(n: number | null | undefined): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  })
    .format(n || 0)
    .replace('KES', 'KSh');
}

/** Plain grouped number. */
export function num(n: number | null | undefined): string {
  return new Intl.NumberFormat('en-KE').format(n || 0);
}

/** Compact magnitude for axis labels: 1.2M / 340K / 87. */
export function compact(n: number | null | undefined): string {
  const v = n || 0;
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
  if (a >= 1e3) return Math.round(v / 1e3) + 'K';
  return String(Math.round(v));
}

/** Compact currency for headline figures: "KSh 31M". */
export function compactMoney(n: number | null | undefined): string {
  return 'KSh ' + compact(n);
}

export function dateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeShort(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

/** Relative age of a timestamp — "Today", "4d ago", "3mo ago". */
export function ago(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '—';
  const d = Math.floor((Date.now() - then) / 864e5);
  if (d <= 0) return 'Today';
  if (d === 1) return '1d ago';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

/** Kenyan mobile numbers normalised to the local 07… form. */
export function phoneLocal(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return '0' + digits.slice(3);
  if (digits.startsWith('0') && digits.length >= 9) return digits;
  return phone;
}

/* ── tints ──────────────────────────────────────────────────────────────── */

export interface Tint {
  bg: string;
  fg: string;
}

/** Poster fallback tints, cycled by event id. */
export const TINTS: Tint[] = [
  { bg: '#f6dfce', fg: '#8c491a' },
  { bg: '#e6eed6', fg: '#3d472b' },
  { bg: '#f3e6cf', fg: '#7a5a1e' },
  { bg: '#efe6db', fg: '#474238' },
  { bg: '#f9d9c8', fg: '#8c491a' },
  { bg: '#e2ebd5', fg: '#3d472b' },
  { bg: '#ece3d3', fg: '#5a4a2e' },
];

export function tintFor(seed: number): Tint {
  return TINTS[Math.abs(seed) % TINTS.length];
}

/** Cover-fitted background for a poster URL, over the surface tone. */
export function posterBg(url?: string | null): CSSProperties {
  if (!url) return { background: 'var(--color-surface)' };
  return {
    backgroundImage: `url('${url}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: 'var(--color-surface)',
  };
}

/** Letter-tile fallback when an event has no artwork. */
export function PosterFallback({
  name,
  seed,
  className,
  style,
}: {
  name: string;
  seed: number;
  className?: string;
  style?: CSSProperties;
}) {
  const t = tintFor(seed);
  return (
    <div
      className={`grid place-items-center flex-none ${className ?? ''}`}
      style={{ background: t.bg, color: t.fg, ...style }}
      aria-hidden="true"
    >
      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '2em' }}>
        {(name || 'E').charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

/** Poster block that falls back to a letter tile. */
export function Poster({
  url,
  name,
  seed,
  className,
  style,
}: {
  url?: string | null;
  name: string;
  seed: number;
  className?: string;
  style?: CSSProperties;
}) {
  if (url) {
    return <div className={`flex-none ${className ?? ''}`} style={{ ...posterBg(url), ...style }} />;
  }
  return <PosterFallback name={name} seed={seed} className={className} style={style} />;
}

/* ── status ─────────────────────────────────────────────────────────────── */

export interface StatusMeta {
  label: string;
  bg: string;
  fg: string;
  dot: string;
}

export function statusMeta(status: string): StatusMeta {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', bg: '#e6eed6', fg: '#3d472b', dot: '#7a8a5e' };
    case 'ONHOLD':
      return { label: 'On hold', bg: '#fff2eb', fg: '#8c491a', dot: '#c67139' };
    case 'COMPLETED':
      return { label: 'Completed', bg: '#eee7db', fg: '#474238', dot: '#a19786' };
    case 'SOLDOUT':
      return { label: 'Sold out', bg: '#f3e6cf', fg: '#7a5a1e', dot: '#d29b3f' };
    case 'CLOSED':
    case 'POSTPONED':
      return { label: status.charAt(0) + status.slice(1).toLowerCase(), bg: '#f7ddd4', fg: '#8f2f1e', dot: '#b23b2a' };
    default:
      return { label: status || '—', bg: '#eee7db', fg: '#474238', dot: '#a19786' };
  }
}

/** Dot + label pill. */
export function StatusPill({ status }: { status: string }) {
  const m = statusMeta(status);
  return (
    <span
      className="inline-flex items-center gap-[5px] flex-none"
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        padding: '2px 9px',
        borderRadius: 999,
        background: m.bg,
        color: m.fg,
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: '50%', flex: 'none', background: m.dot }}
      />
      {m.label}
    </span>
  );
}

/** Flat tinted pill with no dot. */
export function Pill({
  children,
  bg = 'var(--tint-stone-bg)',
  fg = 'var(--tint-stone-fg)',
  className,
}: {
  children: ReactNode;
  bg?: string;
  fg?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center ${className ?? ''}`}
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        padding: '2px 9px',
        borderRadius: 999,
        background: bg,
        color: fg,
        textTransform: 'capitalize',
      }}
    >
      {children}
    </span>
  );
}

/* ── surfaces ───────────────────────────────────────────────────────────── */

/** The system's base card: neutral-100 on the cream ground, soft shadow. */
export function Card({
  children,
  className,
  style,
  padded = true,
  onClick,
  hoverLift = false,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  padded?: boolean;
  onClick?: () => void;
  hoverLift?: boolean;
}) {
  const base: CSSProperties = {
    background: 'var(--color-neutral-100)',
    borderRadius: 'var(--radius-card)',
    boxShadow: 'var(--shadow-sm)',
    ...style,
  };
  const cls = `flex flex-col ${padded ? 'p-4' : ''} ${className ?? ''}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${cls} text-left transition-shadow`}
        style={{ border: 'none', ...base }}
        onMouseEnter={(e) => {
          if (hoverLift) e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }}
        onMouseLeave={(e) => {
          if (hoverLift) e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        }}
      >
        {children}
      </button>
    );
  }
  return (
    <div className={cls} style={base}>
      {children}
    </div>
  );
}

export function SectionEyebrow({ children }: { children: ReactNode }) {
  return <span className="soa-eyebrow">{children}</span>;
}

/* ── stat tiles ─────────────────────────────────────────────────────────── */

/** Compact horizontal stat: icon chip, micro label, big tabular figure. */
export function StatTile({
  label,
  value,
  icon: Icon,
  bg = 'var(--tint-olive-bg)',
  fg = 'var(--tint-olive-strong)',
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  bg?: string;
  fg?: string;
}) {
  return (
    <div
      className="flex flex-row items-center gap-2.5"
      style={{
        background: 'var(--color-neutral-100)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-sm)',
        padding: '11px 14px',
      }}
    >
      <span
        className="grid place-items-center flex-none"
        style={{ width: 30, height: 30, borderRadius: 8, background: bg, color: fg }}
      >
        <Icon className="ic w-[15px] h-[15px]" />
      </span>
      <span className="min-w-0">
        <span
          className="block"
          style={{
            fontSize: 10,
            letterSpacing: '.05em',
            textTransform: 'uppercase',
            color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
          }}
        >
          {label}
        </span>
        <span
          className="tnum block truncate"
          style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 17 }}
        >
          {value}
        </span>
      </span>
    </div>
  );
}

/** Taller KPI card with the icon chip top-right and an optional note. */
export function KpiCard({
  label,
  value,
  note,
  icon: Icon,
  bg = 'var(--tint-olive-bg)',
  fg = 'var(--tint-olive-strong)',
}: {
  label: string;
  value: ReactNode;
  note?: string;
  icon: LucideIcon;
  bg?: string;
  fg?: string;
}) {
  return (
    <div
      style={{
        background: 'var(--color-neutral-100)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-sm)',
        padding: '14px 15px',
      }}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: '.07em',
              textTransform: 'uppercase',
              color: 'color-mix(in srgb, var(--color-text) 52%, transparent)',
            }}
          >
            {label}
          </div>
          <div
            className="tnum"
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: 20,
              marginTop: 7,
              lineHeight: 1,
            }}
          >
            {value}
          </div>
          {note && (
            <div
              style={{
                fontSize: 11,
                color: 'color-mix(in srgb, var(--color-text) 48%, transparent)',
                marginTop: 5,
              }}
            >
              {note}
            </div>
          )}
        </div>
        <span
          className="grid place-items-center flex-none"
          style={{ width: 34, height: 34, borderRadius: 10, background: bg, color: fg }}
        >
          <Icon className="ic w-[17px] h-[17px]" />
        </span>
      </div>
    </div>
  );
}

/** Small figure block used in the metric grid inside event cards. */
export function MetricTile({
  label,
  value,
  note,
  color,
}: {
  label: string;
  value: string;
  note?: string;
  color?: string;
}) {
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 12, padding: '8px 11px' }}>
      <div
        style={{
          fontSize: 10,
          color: 'color-mix(in srgb, var(--color-text) 52%, transparent)',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div className="tnum" style={{ fontWeight: 700, fontSize: 14, color }}>
        {value}
      </div>
      {note && (
        <div
          style={{
            fontSize: 9.5,
            color: 'color-mix(in srgb, var(--color-text) 42%, transparent)',
          }}
        >
          {note}
        </div>
      )}
    </div>
  );
}

/* ── bars ───────────────────────────────────────────────────────────────── */

/** Thin rounded progress track. Olive past 75%, terracotta below. */
export function ProgressBar({
  pct,
  height = 7,
  track = 'var(--color-surface)',
  color,
}: {
  pct: number;
  height?: number;
  track?: string;
  color?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <span
      className="block overflow-hidden"
      style={{ height, borderRadius: 999, background: track }}
    >
      <span
        className="block"
        style={{
          height: '100%',
          width: `${clamped}%`,
          borderRadius: 999,
          background: color ?? (clamped > 75 ? 'var(--color-accent-2)' : 'var(--color-accent)'),
          transition: 'width .4s ease',
        }}
      />
    </span>
  );
}

/* ── meta row ───────────────────────────────────────────────────────────── */

/** Icon + text metadata chip used under card titles. */
export function Meta({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 min-w-0"
      style={{
        fontSize: 11.5,
        color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
      }}
    >
      <Icon className="ic w-3 h-3 flex-none" />
      <span className="truncate">{children}</span>
    </span>
  );
}

/* ── empty + pager ──────────────────────────────────────────────────────── */

export function EmptyState({
  icon: Icon,
  title,
  hint,
  tone = 'muted',
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  tone?: 'muted' | 'success';
}) {
  return (
    <Card className="items-center text-center" padded={false} style={{ padding: '52px 20px' }}>
      {tone === 'success' ? (
        <span
          className="grid place-items-center"
          style={{
            width: 52,
            height: 52,
            borderRadius: 999,
            background: 'var(--tint-olive-bg)',
            color: 'var(--tint-olive-strong)',
          }}
        >
          <Icon className="ic w-6 h-6" />
        </span>
      ) : (
        <Icon
          className="ic w-8 h-8"
          style={{ color: 'color-mix(in srgb, var(--color-text) 22%, transparent)' }}
        />
      )}
      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 18, marginTop: 10 }}>
        {title}
      </div>
      {hint && (
        <div
          style={{
            fontSize: 12.5,
            color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
          }}
        >
          {hint}
        </div>
      )}
    </Card>
  );
}

/** Round outline prev/next pager with a "Page n of m · N items" label. */
export function Pager({
  page,
  totalPages,
  totalElements,
  noun = 'items',
  hasPrevious,
  hasNext,
  onPrev,
  onNext,
  busy = false,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  noun?: string;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  busy?: boolean;
}) {
  if (totalPages <= 1) return null;
  const btn: CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 999,
    border: '1px solid var(--color-divider)',
    background: 'var(--color-neutral-100)',
    color: 'var(--color-text)',
  };
  return (
    <div className="flex items-center justify-between pt-0.5">
      <span
        style={{ fontSize: 12, color: 'color-mix(in srgb, var(--color-text) 52%, transparent)' }}
      >
        Page {page + 1} of {totalPages} · {totalElements} {noun}
      </span>
      <div className="flex gap-[7px]">
        <button
          onClick={onPrev}
          disabled={!hasPrevious || busy}
          aria-label="Previous page"
          className="grid place-items-center disabled:opacity-30"
          style={btn}
        >
          <ChevronLeft className="ic w-4 h-4" />
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext || busy}
          aria-label="Next page"
          className="grid place-items-center disabled:opacity-30"
          style={btn}
        >
          <ChevronRight className="ic w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ── toggle ─────────────────────────────────────────────────────────────── */

/** Pill switch — olive when on, neutral when off. */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: 42,
        height: 24,
        border: 'none',
        borderRadius: 999,
        flex: 'none',
        transition: 'background .15s',
        background: checked ? 'var(--color-accent-2)' : 'var(--color-neutral-300)',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: 'var(--shadow-sm)',
          transition: 'transform .15s',
          transform: `translateX(${checked ? 18 : 0}px)`,
        }}
      />
    </button>
  );
}

/* ── feedback ───────────────────────────────────────────────────────────── */

/** Inline error banner in the system's clay tone. */
export function ErrorNote({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4"
      style={{
        border: '1px solid color-mix(in srgb, var(--tint-danger-strong) 35%, transparent)',
        background: 'var(--tint-danger-bg)',
        borderRadius: 'var(--radius-card)',
        padding: '11px 15px',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--tint-danger-fg)' }}>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex-none"
          style={{
            fontSize: 12,
            fontWeight: 700,
            border: '1px solid color-mix(in srgb, var(--tint-danger-strong) 35%, transparent)',
            background: 'transparent',
            color: 'var(--tint-danger-fg)',
            borderRadius: 999,
            padding: '5px 13px',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

/** Success banner in the olive tone. */
export function SuccessNote({ message }: { message: string }) {
  return (
    <div
      style={{
        border: '1px solid color-mix(in srgb, var(--color-accent-2) 40%, transparent)',
        background: 'var(--tint-olive-bg)',
        borderRadius: 'var(--radius-card)',
        padding: '11px 15px',
        fontSize: 13,
        color: 'var(--tint-olive-fg)',
      }}
    >
      {message}
    </div>
  );
}

/** Bottom-centre toast pill. */
export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 flex items-center gap-2.5 animate-soa-pop"
      role="status"
      style={{
        bottom: 24,
        zIndex: 90,
        background: 'var(--color-accent-900)',
        color: '#fff',
        padding: '11px 18px',
        borderRadius: 999,
        boxShadow: 'var(--shadow-lg)',
        fontSize: 13,
        maxWidth: '90vw',
      }}
    >
      {message}
    </div>
  );
}

/* ── skeletons ──────────────────────────────────────────────────────────── */

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`animate-pulse ${className ?? ''}`}
      style={{ background: 'var(--color-surface)', borderRadius: 8, ...style }}
    />
  );
}

/** Card-shaped placeholder used while a list loads. */
export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <div
      className="animate-pulse"
      style={{
        height,
        background: 'var(--color-neutral-100)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-sm)',
      }}
    />
  );
}
