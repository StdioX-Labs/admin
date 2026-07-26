'use client';

import {
  TrendingUp,
  DollarSign,
  BarChart2,
  Percent,
  CalendarDays,
  Ticket,
  Banknote,
  CheckCircle2,
  Users,
  Star,
  Activity,
} from 'lucide-react';
import { Card, KpiCard, SectionEyebrow, money, num } from '@/components/ui/soa';
import {
  GmvChart,
  ChannelDonut,
  ChannelLegend,
  CommissionBars,
  MarginChart,
} from '@/components/charts/organic-charts';
import { MONTHLY, PLATFORM_KPIS as K } from '@/lib/platform-analytics';

const OLIVE = { bg: 'var(--tint-olive-bg)', fg: 'var(--tint-olive-strong)' };
const CLAY = { bg: 'var(--tint-clay-bg)', fg: 'var(--tint-clay-strong)' };
const SAND = { bg: 'var(--tint-sand-bg)', fg: 'var(--tint-sand-fg)' };
const EMBER = { bg: '#f6dfce', fg: '#8c491a' };

const KPI_GRID = 'grid gap-3';
const KPI_GRID_STYLE = { gridTemplateColumns: 'repeat(auto-fit, minmax(178px, 1fr))' };

export default function AnalyticsPage() {
  const financial = [
    { label: 'Total GMV', value: money(K.gmv), note: 'all channels', icon: TrendingUp, ...OLIVE },
    { label: 'Total income', value: money(K.totalIncome), note: 'platform earnings', icon: DollarSign, ...CLAY },
    { label: 'Gross profit', value: money(K.grossProfit), note: 'after direct costs', icon: BarChart2, ...SAND },
    { label: 'Gross margin', value: `${K.grossMargin}%`, note: 'benchmark 80–95%', icon: Percent, ...OLIVE },
  ];

  const operational = [
    { label: 'Total events', value: num(K.events), icon: CalendarDays, ...CLAY },
    {
      label: 'Tickets sold',
      value: num(K.tickets),
      note: `~${num(Math.round(K.tickets / K.events))} / event`,
      icon: Ticket,
      ...OLIVE,
    },
    { label: 'Avg ticket price', value: money(K.avgTicket), icon: Banknote, ...SAND },
    { label: 'Avg check-in rate', value: `${K.checkinRate}%`, note: 'of tickets scanned', icon: CheckCircle2, ...OLIVE },
  ];

  const growth = [
    { label: 'Repeat organizers', value: num(K.repeatOrgs), note: '2+ events hosted', icon: Users, ...CLAY },
    { label: 'Best month', value: money(K.bestMonthIncome), note: 'Dec 2025 · 42% of year', icon: Star, ...SAND },
    { label: 'Direct costs', value: money(K.directCosts), note: 'M-Pesa fees + refunds', icon: Activity, ...EMBER },
  ];

  const rows = MONTHLY.map((m, i) => {
    const cost = m.commission - m.grossProfit;
    return {
      key: m.month,
      month: m.month + (i < 8 ? " '25" : " '26"),
      peak: m.month === 'Dec',
      gmv: m.gmv > 0 ? money(m.gmv) : '—',
      commission: m.commission > 0 ? money(m.commission) : '—',
      cost: cost > 0 ? money(cost) : '—',
      profit: m.grossProfit !== 0 ? money(m.grossProfit) : '—',
      profitColor: m.grossProfit > 0 ? 'var(--tint-olive-strong)' : 'var(--tint-danger-strong)',
      margin: m.margin > 0 ? `${m.margin}%` : '—',
      marginColor: m.margin >= 97 ? 'var(--tint-olive-strong)' : 'var(--tint-sand-fg)',
    };
  });

  return (
    <div className="flex flex-col gap-4 animate-soa-fade">
      <div className="flex flex-wrap gap-2.5 items-center justify-between">
        <SectionEyebrow>Financial</SectionEyebrow>
        <span
          className="inline-flex items-center"
          style={{
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: 'var(--radius-tag)',
            background: 'var(--color-neutral-200)',
            color: 'var(--color-neutral-800)',
          }}
        >
          12 months · KSH · ~10% take rate
        </span>
      </div>

      <div className={KPI_GRID} style={KPI_GRID_STYLE}>
        {financial.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {/* GMV + channel mix */}
      <div className="grid gap-3.5 grid-cols-1 lg:grid-cols-3 items-start">
        <Card className="lg:col-span-2 min-w-0" padded={false} style={{ padding: '16px 18px' }}>
          <div className="card-kicker">Gross merchandise value</div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 18 }}>
            Monthly GMV
          </div>
          <GmvChart />
        </Card>
        <Card className="min-w-0" padded={false} style={{ padding: '16px 18px' }}>
          <div className="card-kicker">Payment channels</div>
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: 18,
              marginBottom: 6,
            }}
          >
            GMV by channel
          </div>
          <ChannelDonut />
          <ChannelLegend />
        </Card>
      </div>

      {/* Commission + margin */}
      <div className="grid gap-3.5 grid-cols-1 lg:grid-cols-2 items-start">
        <Card className="min-w-0" padded={false} style={{ padding: '16px 18px' }}>
          <div className="card-kicker">Platform income</div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 18 }}>
            Monthly commission
          </div>
          <CommissionBars />
        </Card>
        <Card className="min-w-0" padded={false} style={{ padding: '16px 18px' }}>
          <div className="card-kicker">Profitability</div>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 18 }}>
            Gross margin
          </div>
          <MarginChart />
        </Card>
      </div>

      <div className="mt-1">
        <SectionEyebrow>Operations &amp; attendance</SectionEyebrow>
      </div>
      <div className={KPI_GRID} style={KPI_GRID_STYLE}>
        {operational.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="mt-1">
        <SectionEyebrow>Growth</SectionEyebrow>
      </div>
      <div className={KPI_GRID} style={KPI_GRID_STYLE}>
        {growth.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {/* Monthly summary */}
      <Card padded={false} className="overflow-hidden">
        <div style={{ padding: '14px 16px 11px' }}>
          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16 }}>
            Monthly financial summary
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
            }}
          >
            GMV · Income · Direct costs · Gross profit · Margin
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="soa-table" style={{ minWidth: 520 }}>
            <thead>
              <tr>
                <th>Month</th>
                <th style={{ textAlign: 'right' }}>GMV</th>
                <th style={{ textAlign: 'right' }}>Commission</th>
                <th style={{ textAlign: 'right' }}>Direct costs</th>
                <th style={{ textAlign: 'right' }}>Gross profit</th>
                <th style={{ textAlign: 'right' }}>Margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.key} style={m.peak ? { background: 'var(--tint-clay-bg)' } : undefined}>
                  <td style={{ fontWeight: 600 }}>
                    {m.month}
                    {m.peak && (
                      <span
                        className="ml-1.5 inline-flex items-center"
                        style={{
                          fontSize: 9,
                          padding: '1px 7px',
                          borderRadius: 'var(--radius-tag)',
                          background: 'var(--color-accent-200)',
                          color: 'var(--color-accent-800)',
                        }}
                      >
                        Peak
                      </span>
                    )}
                  </td>
                  <td className="tnum" style={{ textAlign: 'right' }}>{m.gmv}</td>
                  <td className="tnum" style={{ textAlign: 'right', color: 'var(--tint-clay-strong)' }}>
                    {m.commission}
                  </td>
                  <td className="tnum" style={{ textAlign: 'right', color: 'var(--color-accent-700)' }}>
                    {m.cost}
                  </td>
                  <td
                    className="tnum"
                    style={{ textAlign: 'right', fontWeight: 600, color: m.profitColor }}
                  >
                    {m.profit}
                  </td>
                  <td
                    className="tnum"
                    style={{ textAlign: 'right', fontWeight: 600, color: m.marginColor }}
                  >
                    {m.margin}
                  </td>
                </tr>
              ))}
              <tr
                style={{
                  borderTop: '2px solid var(--color-divider)',
                  background: 'var(--color-surface)',
                }}
              >
                <td style={{ fontWeight: 700 }}>Total</td>
                <td className="tnum" style={{ textAlign: 'right', fontWeight: 700 }}>
                  {money(K.gmv)}
                </td>
                <td
                  className="tnum"
                  style={{ textAlign: 'right', fontWeight: 700, color: 'var(--tint-clay-strong)' }}
                >
                  {money(K.totalIncome)}
                </td>
                <td
                  className="tnum"
                  style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-accent-700)' }}
                >
                  {money(K.directCosts)}
                </td>
                <td
                  className="tnum"
                  style={{ textAlign: 'right', fontWeight: 700, color: 'var(--tint-olive-strong)' }}
                >
                  {money(K.grossProfit)}
                </td>
                <td
                  className="tnum"
                  style={{ textAlign: 'right', fontWeight: 700, color: 'var(--tint-olive-strong)' }}
                >
                  {K.grossMargin}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
