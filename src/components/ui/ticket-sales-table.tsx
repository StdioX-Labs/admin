'use client';

/**
 * Per-ticket sales breakdown.
 *
 * One table shared by the Events list, the Sales leaderboard and the Edit
 * screen, so a ticket type reads the same everywhere. Callers normalise their
 * own shape into `TicketSalesRow` — `ticketSummaries[]` from the admin list
 * endpoints and `tickets[]` from `/event/get` carry different field names for
 * the same numbers.
 *
 * Below `md` the table becomes stacked cards; a 8-column figure table is not
 * usable on a phone even with horizontal scroll.
 */

import { Pill, ProgressBar, money, num } from '@/components/ui/soa';

export interface TicketSalesRow {
  id: number;
  name: string;
  price: number;
  isFree?: boolean;
  status?: string;
  /** Total allocation for this type. Undefined when the API doesn't report it. */
  allocation?: number;
  sold: number;
  revenue: number;
  /** Complementary tickets issued outside of sales. */
  complimentary?: number;
  /** Per-buyer cap, when known. */
  limitPerPerson?: number;
}

interface Props {
  rows: TicketSalesRow[];
  /** Commission %, used to derive the platform fee column. */
  commission?: number | null;
  /** Falls back to the summed row revenue when the caller has no event total. */
  totalRevenue?: number;
  totalSold?: number;
  /** Hide the allocation / remaining / sell-through group. */
  compact?: boolean;
}

function statusTint(status?: string) {
  switch (status) {
    case 'ACTIVE':
      return { bg: 'var(--tint-olive-bg)', fg: 'var(--tint-olive-fg)' };
    case 'ONHOLD':
      return { bg: 'var(--tint-clay-bg)', fg: 'var(--tint-clay-fg)' };
    case 'SOLDOUT':
      return { bg: 'var(--tint-sand-bg)', fg: 'var(--tint-sand-fg)' };
    default:
      return { bg: 'var(--tint-stone-bg)', fg: 'var(--tint-stone-fg)' };
  }
}

const MUTED = 'color-mix(in srgb, var(--color-text) 48%, transparent)';

export function TicketSalesTable({
  rows,
  commission,
  totalRevenue,
  totalSold,
  compact = false,
}: Props) {
  if (rows.length === 0) return null;

  const showFee = commission != null && commission > 0;
  const hasAllocation = rows.some((r) => r.allocation != null && r.allocation > 0);
  const showFill = !compact && hasAllocation;

  const sumSold = totalSold ?? rows.reduce((s, r) => s + r.sold, 0);
  const sumRevenue = totalRevenue ?? rows.reduce((s, r) => s + r.revenue, 0);
  const sumAllocation = rows.reduce((s, r) => s + (r.allocation ?? 0), 0);
  const sumComp = rows.reduce((s, r) => s + (r.complimentary ?? 0), 0);
  const overallFill =
    sumAllocation > 0 ? Math.min(100, Math.round((sumSold / sumAllocation) * 100)) : 0;

  const fee = (revenue: number) => (showFee ? (revenue * (commission as number)) / 100 : 0);

  return (
    <>
      {/* ── Desktop ─────────────────────────────────────────────────────── */}
      <div className="soa-table-scroll hidden md:block">
        <table className="soa-table" style={{ minWidth: showFill ? 720 : 520 }}>
          <thead>
            <tr>
              <th>Ticket type</th>
              <th className="num">Price</th>
              {showFill && <th className="num">Allocation</th>}
              <th className="num">Sold</th>
              {showFill && <th className="num">Remaining</th>}
              {showFill && <th style={{ minWidth: 130 }}>Sell-through</th>}
              <th className="num">Revenue</th>
              {showFee && <th className="num">Platform fee</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const allocation = r.allocation ?? 0;
              const remaining = Math.max(0, allocation - r.sold);
              const fill = allocation > 0 ? Math.min(100, Math.round((r.sold / allocation) * 100)) : 0;
              const tint = statusTint(r.status);
              return (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontWeight: 600 }}>{r.name}</span>
                      {r.status && (
                        <Pill bg={tint.bg} fg={tint.fg}>
                          {r.status.toLowerCase()}
                        </Pill>
                      )}
                      {r.isFree && (
                        <Pill bg="var(--color-accent-2-100)" fg="var(--color-accent-2-800)">
                          free
                        </Pill>
                      )}
                    </div>
                    {(r.limitPerPerson != null || (r.complimentary ?? 0) > 0) && (
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>
                        {r.limitPerPerson != null && r.limitPerPerson > 0 && (
                          <>max {r.limitPerPerson}/person</>
                        )}
                        {r.limitPerPerson != null &&
                          r.limitPerPerson > 0 &&
                          (r.complimentary ?? 0) > 0 &&
                          ' · '}
                        {(r.complimentary ?? 0) > 0 && <>{num(r.complimentary)} comp</>}
                      </div>
                    )}
                  </td>
                  <td className="num">{r.isFree || r.price === 0 ? 'Free' : money(r.price)}</td>
                  {showFill && (
                    <td className="num" style={{ color: MUTED }}>
                      {allocation > 0 ? num(allocation) : '—'}
                    </td>
                  )}
                  <td className="num" style={{ fontWeight: 600 }}>
                    {num(r.sold)}
                  </td>
                  {showFill && (
                    <td
                      className="num"
                      style={{
                        color:
                          allocation === 0
                            ? MUTED
                            : remaining === 0
                              ? 'var(--tint-sand-fg)'
                              : 'var(--color-text)',
                      }}
                    >
                      {allocation > 0 ? num(remaining) : '—'}
                    </td>
                  )}
                  {showFill && (
                    <td>
                      {allocation > 0 ? (
                        <div className="flex items-center gap-2.5">
                          <div style={{ flex: 1, minWidth: 62 }}>
                            <ProgressBar pct={fill} height={6} />
                          </div>
                          <span
                            className="tnum flex-none"
                            style={{ fontSize: 11.5, fontWeight: 700, width: 34, textAlign: 'right' }}
                          >
                            {fill}%
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: MUTED }}>—</span>
                      )}
                    </td>
                  )}
                  <td
                    className="num"
                    style={{ fontWeight: 600, color: 'var(--tint-olive-strong)' }}
                  >
                    {money(r.revenue)}
                  </td>
                  {showFee && (
                    <td className="num" style={{ color: 'var(--tint-clay-strong)' }}>
                      {money(fee(r.revenue))}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>
                Total
                <span style={{ fontWeight: 400, color: MUTED, marginLeft: 6, fontSize: 12 }}>
                  {rows.length} type{rows.length === 1 ? '' : 's'}
                  {sumComp > 0 && ` · ${num(sumComp)} comp`}
                </span>
              </td>
              <td />
              {showFill && (
                <td className="num">{sumAllocation > 0 ? num(sumAllocation) : '—'}</td>
              )}
              <td className="num">{num(sumSold)}</td>
              {showFill && (
                <td className="num">
                  {sumAllocation > 0 ? num(Math.max(0, sumAllocation - sumSold)) : '—'}
                </td>
              )}
              {showFill && (
                <td>
                  <div className="flex items-center gap-2.5">
                    <div style={{ flex: 1, minWidth: 62 }}>
                      <ProgressBar pct={overallFill} height={6} />
                    </div>
                    <span
                      className="tnum flex-none"
                      style={{ fontSize: 11.5, width: 34, textAlign: 'right' }}
                    >
                      {overallFill}%
                    </span>
                  </div>
                </td>
              )}
              <td className="num" style={{ color: 'var(--tint-olive-strong)' }}>
                {money(sumRevenue)}
              </td>
              {showFee && (
                <td className="num" style={{ color: 'var(--tint-clay-strong)' }}>
                  {money(fee(sumRevenue))}
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Mobile ──────────────────────────────────────────────────────── */}
      <div className="md:hidden flex flex-col">
        {rows.map((r) => {
          const allocation = r.allocation ?? 0;
          const remaining = Math.max(0, allocation - r.sold);
          const fill = allocation > 0 ? Math.min(100, Math.round((r.sold / allocation) * 100)) : 0;
          const tint = statusTint(r.status);
          return (
            <div
              key={r.id}
              className="flex flex-col gap-2.5"
              style={{ padding: '13px 16px', borderTop: '1px solid var(--color-divider)' }}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span style={{ fontWeight: 600, fontSize: 13.5 }}>{r.name}</span>
                    {r.status && (
                      <Pill bg={tint.bg} fg={tint.fg}>
                        {r.status.toLowerCase()}
                      </Pill>
                    )}
                  </div>
                  <div className="tnum" style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>
                    {r.isFree || r.price === 0 ? 'Free' : money(r.price)}
                    {allocation > 0 && ` · ${num(allocation)} allocated`}
                  </div>
                </div>
                <div className="text-right flex-none">
                  <div
                    className="tnum"
                    style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--tint-olive-strong)' }}
                  >
                    {money(r.revenue)}
                  </div>
                  {showFee && (
                    <div
                      className="tnum"
                      style={{ fontSize: 11, color: 'var(--tint-clay-strong)' }}
                    >
                      {money(fee(r.revenue))} fee
                    </div>
                  )}
                </div>
              </div>

              {allocation > 0 ? (
                <div>
                  <div className="flex justify-between mb-1" style={{ fontSize: 11 }}>
                    <span style={{ color: MUTED }}>
                      <span className="tnum" style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                        {num(r.sold)}
                      </span>{' '}
                      sold · {num(remaining)} left
                    </span>
                    <span className="tnum" style={{ fontWeight: 700 }}>
                      {fill}%
                    </span>
                  </div>
                  <ProgressBar pct={fill} height={6} />
                </div>
              ) : (
                <div className="tnum" style={{ fontSize: 11, color: MUTED }}>
                  {num(r.sold)} sold
                </div>
              )}
            </div>
          );
        })}

        <div
          className="flex items-center justify-between"
          style={{
            padding: '13px 16px',
            borderTop: '2px solid var(--color-divider)',
            background: 'var(--color-surface)',
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>
            Total
            <span style={{ fontWeight: 400, color: MUTED, marginLeft: 5, fontSize: 11.5 }}>
              {num(sumSold)} sold
            </span>
          </span>
          <span
            className="tnum"
            style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--tint-olive-strong)' }}
          >
            {money(sumRevenue)}
          </span>
        </div>
      </div>
    </>
  );
}
