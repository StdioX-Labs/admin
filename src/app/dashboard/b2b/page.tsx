'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { b2bApi } from '@/lib/api';
import {
  Building2,
  CheckCircle2,
  TrendingUp,
  Search,
  X,
  ChevronRight,
  LineChart,
} from 'lucide-react';
import {
  Card,
  EmptyState,
  Pill,
  StatTile,
  compactMoney,
  dateShort,
  money,
  num,
  tintFor,
} from '@/components/ui/soa';

/**
 * ⚠️ The partner table is a placeholder dataset.
 *
 * `GET /api/b2b-subscriptions/active` exists and is polled below for the live
 * active-subscription count; the per-company rows still need a partner
 * endpoint before they can be real.
 */

type Status = 'active' | 'inactive' | 'pending';
type Licence = 'basic' | 'premium' | 'enterprise';

interface Partner {
  id: string;
  name: string;
  email: string;
  status: Status;
  licence: Licence;
  events: number;
  revenue: number;
  joined: string;
  lastActivity: string;
}

const SAMPLE_PARTNERS: Partner[] = [
  { id: '1', name: 'TechCorp Solutions', email: 'admin@techcorp.com', status: 'active', licence: 'enterprise', events: 45, revenue: 125000, joined: '2024-01-15', lastActivity: '2026-04-10' },
  { id: '2', name: 'StartupHub Kenya', email: 'info@startuphub.ke', status: 'active', licence: 'premium', events: 23, revenue: 78000, joined: '2024-02-20', lastActivity: '2026-04-09' },
  { id: '3', name: 'EventMasters Ltd', email: 'contact@eventmasters.co.ke', status: 'pending', licence: 'basic', events: 0, revenue: 0, joined: '2026-04-08', lastActivity: '2026-04-08' },
  { id: '4', name: 'Digital Innovators', email: 'hello@digitalinnovators.com', status: 'inactive', licence: 'premium', events: 12, revenue: 45000, joined: '2024-03-10', lastActivity: '2025-11-15' },
];

const STATUS_TINT: Record<Status, { bg: string; fg: string; dot: string }> = {
  active: { bg: 'var(--tint-olive-bg)', fg: 'var(--tint-olive-fg)', dot: 'var(--tint-olive-dot)' },
  inactive: { bg: 'var(--tint-danger-bg)', fg: 'var(--tint-danger-fg)', dot: 'var(--tint-danger-strong)' },
  pending: { bg: 'var(--tint-sand-bg)', fg: 'var(--tint-sand-fg)', dot: 'var(--tint-amber-dot)' },
};

const LICENCE_TINT: Record<Licence, { bg: string; fg: string }> = {
  basic: { bg: 'var(--tint-stone-bg)', fg: 'var(--tint-stone-fg)' },
  premium: { bg: 'var(--tint-clay-bg)', fg: 'var(--tint-clay-fg)' },
  enterprise: { bg: 'var(--color-accent-2-100)', fg: 'var(--color-accent-2-800)' },
};

export default function B2BPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | Status>('all');
  const [activeSubs, setActiveSubs] = useState<number | null>(null);

  // Live: the one B2B figure the API can answer today.
  useEffect(() => {
    let cancelled = false;
    b2bApi
      .getActiveSubscriptions()
      .then((resp) => {
        if (cancelled || !resp?.status || !resp.data) return;
        const d: unknown = resp.data;
        if (Array.isArray(d)) setActiveSubs(d.length);
        else if (typeof d === 'object' && d !== null) {
          const obj = d as Record<string, unknown>;
          const n = (obj.count as number) ?? (obj.total as number);
          if (typeof n === 'number') setActiveSubs(n);
        }
      })
      .catch(() => {
        /* leave as null — the tile falls back to the sample count */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return SAMPLE_PARTNERS.filter(
      (c) =>
        (!q || `${c.name} ${c.email}`.toLowerCase().includes(q)) &&
        (status === 'all' || c.status === status)
    );
  }, [search, status]);

  const sampleActive = SAMPLE_PARTNERS.filter((c) => c.status === 'active').length;
  const totalRevenue = SAMPLE_PARTNERS.reduce((s, c) => s + c.revenue, 0);

  return (
    <div className="flex flex-col gap-3.5 animate-soa-fade">
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
      >
        <StatTile
          label="Partners"
          value={num(SAMPLE_PARTNERS.length)}
          icon={Building2}
          bg="var(--tint-stone-bg)"
          fg="var(--tint-stone-fg)"
        />
        <StatTile
          label="Active subscriptions"
          value={num(activeSubs ?? sampleActive)}
          icon={CheckCircle2}
        />
        <StatTile
          label="Partner revenue"
          value={compactMoney(totalRevenue)}
          icon={TrendingUp}
          bg="var(--tint-clay-bg)"
          fg="var(--tint-clay-strong)"
        />
      </div>

      {/* Filters */}
      <Card
        padded={false}
        className="flex-row flex-wrap items-center gap-2.5"
        style={{ padding: '13px 15px' }}
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="ic absolute w-4 h-4 pointer-events-none"
            style={{
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'color-mix(in srgb, var(--color-text) 42%, transparent)',
            }}
          />
          <input
            className="soa-input"
            style={{ paddingLeft: 40 }}
            placeholder="Search partners…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="grid place-items-center"
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 26,
                height: 26,
                border: 'none',
                background: 'transparent',
                borderRadius: 999,
                color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
              }}
            >
              <X className="ic w-[15px] h-[15px]" />
            </button>
          )}
        </div>
        <div
          className="inline-flex overflow-hidden"
          style={{
            border: '1px solid var(--color-divider)',
            borderRadius: 'var(--radius-control)',
          }}
        >
          {(['all', 'active', 'pending', 'inactive'] as const).map((s, i) => {
            const on = status === s;
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className="capitalize"
                style={{
                  padding: '7px 13px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  border: 'none',
                  borderLeft: i > 0 ? '1px solid var(--color-divider)' : undefined,
                  background: on ? 'var(--color-accent)' : 'transparent',
                  color: on ? '#fff' : 'color-mix(in srgb, var(--color-text) 60%, transparent)',
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => router.push('/dashboard/b2b/analytics')}
          className="flex items-center gap-1.5"
          style={{
            height: 36,
            padding: '0 14px',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--color-divider)',
            background: 'transparent',
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text)',
          }}
        >
          <LineChart className="ic w-3.5 h-3.5" />
          Analytics
        </button>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No partners found"
          hint="Adjust your search or filters"
        />
      ) : (
        <Card padded={false} className="overflow-hidden">
          {filtered.map((c) => {
            const st = STATUS_TINT[c.status];
            const lic = LICENCE_TINT[c.licence];
            const avatar = tintFor(Number(c.id));
            return (
              <button
                key={c.id}
                onClick={() => router.push(`/dashboard/b2b/companies/${c.id}`)}
                className="w-full text-left flex items-center gap-3 transition-colors"
                style={{
                  padding: '13px 16px',
                  border: 'none',
                  borderTop: '1px solid var(--color-divider)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    'color-mix(in srgb, var(--color-text) 4%, transparent)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span
                  className="grid place-items-center flex-none"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    background: avatar.bg,
                    color: avatar.fg,
                    fontFamily: 'var(--font-body)',
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  {c.name.charAt(0)}
                </span>

                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2 flex-wrap">
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{c.name}</span>
                    <Pill bg={lic.bg} fg={lic.fg}>
                      {c.licence}
                    </Pill>
                    <span
                      className="inline-flex items-center gap-[5px]"
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: '2px 9px',
                        borderRadius: 999,
                        background: st.bg,
                        color: st.fg,
                        textTransform: 'capitalize',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          flex: 'none',
                          background: st.dot,
                        }}
                      />
                      {c.status}
                    </span>
                  </span>
                  <span
                    className="block truncate mt-0.5"
                    style={{
                      fontSize: 11.5,
                      color: 'color-mix(in srgb, var(--color-text) 52%, transparent)',
                    }}
                  >
                    {c.email} · joined {dateShort(c.joined)}
                  </span>
                </span>

                <span className="hidden sm:block flex-none text-right w-20">
                  <span className="tnum block" style={{ fontWeight: 700, fontSize: 13.5 }}>
                    {num(c.events)}
                  </span>
                  <span
                    className="block"
                    style={{
                      fontSize: 10,
                      color: 'color-mix(in srgb, var(--color-text) 42%, transparent)',
                    }}
                  >
                    events
                  </span>
                </span>

                <span
                  className="tnum flex-none text-right"
                  style={{
                    width: 104,
                    fontWeight: 600,
                    fontSize: 13,
                    color: 'var(--tint-olive-strong)',
                  }}
                >
                  {money(c.revenue)}
                </span>

                <ChevronRight
                  className="ic w-3.5 h-3.5 flex-none"
                  style={{ color: 'color-mix(in srgb, var(--color-text) 30%, transparent)' }}
                />
              </button>
            );
          })}
        </Card>
      )}

      <p
        className="m-0"
        style={{
          fontSize: 11.5,
          color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
        }}
      >
        Partner rows are sample data
        {activeSubs !== null && ' — the active-subscription count is live'}.
      </p>
    </div>
  );
}
