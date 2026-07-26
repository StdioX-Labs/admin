'use client';

import { useState, useMemo } from 'react';
import { DollarSign, Wallet, Percent, Activity, Download } from 'lucide-react';
import { Card, KpiCard, Pill, money, dateShort } from '@/components/ui/soa';
import { PLATFORM_KPIS as K } from '@/lib/platform-analytics';

/**
 * ⚠️ Transaction rows are a placeholder dataset.
 *
 * The proxy route `POST /api/transactions/detailed` and its client
 * (`transactionsApi.fetchDetailed`) already exist and return exactly this
 * shape — wire them in here when a company/event scope is chosen for the
 * ledger. The KPI row above is real reporting data.
 */

type TxType = 'Ticket Sale' | 'Commission' | 'Payout' | 'Refund';
type TxStatus = 'Completed' | 'Pending' | 'Failed';
type Channel = 'M-Pesa' | 'Paystack' | 'LittlePay';

interface Tx {
  id: string;
  type: TxType;
  party: string;
  channel: Channel;
  amount: number;
  status: TxStatus;
  date: string;
}

const SAMPLE_TX: Tx[] = [
  { id: 'TXN-4821', type: 'Ticket Sale', party: 'Nairobi Jazz Festival', channel: 'M-Pesa', amount: 250000, status: 'Completed', date: '2026-04-22' },
  { id: 'PAY-1180', type: 'Payout', party: 'Sarafina Sounds', channel: 'M-Pesa', amount: -1800000, status: 'Completed', date: '2026-04-22' },
  { id: 'COM-0934', type: 'Commission', party: 'Blankets & Wine', channel: 'Paystack', amount: 115200, status: 'Completed', date: '2026-04-21' },
  { id: 'REF-0212', type: 'Refund', party: 'Koroga Festival', channel: 'M-Pesa', amount: -5000, status: 'Completed', date: '2026-04-21' },
  { id: 'TXN-4809', type: 'Ticket Sale', party: 'Safari Rally Fan Zone', channel: 'LittlePay', amount: 42000, status: 'Pending', date: '2026-04-20' },
  { id: 'PAY-1176', type: 'Payout', party: 'Koroga Productions', channel: 'Paystack', amount: -720000, status: 'Pending', date: '2026-04-20' },
  { id: 'TXN-4790', type: 'Ticket Sale', party: 'Tech & Startup Summit', channel: 'Paystack', amount: 180000, status: 'Completed', date: '2026-04-19' },
  { id: 'REF-0209', type: 'Refund', party: 'Blankets & Wine', channel: 'M-Pesa', amount: -6000, status: 'Failed', date: '2026-04-19' },
  { id: 'COM-0928', type: 'Commission', party: 'Safari Rally Fan Zone', channel: 'M-Pesa', amount: 36400, status: 'Completed', date: '2026-04-18' },
  { id: 'TXN-4771', type: 'Ticket Sale', party: 'Nairobi Jazz Festival', channel: 'M-Pesa', amount: 500000, status: 'Completed', date: '2026-04-18' },
  { id: 'PAY-1170', type: 'Payout', party: 'StartupHub Kenya', channel: 'Paystack', amount: -480000, status: 'Completed', date: '2026-04-17' },
  { id: 'TXN-4760', type: 'Ticket Sale', party: 'Koroga Festival', channel: 'LittlePay', amount: 27500, status: 'Completed', date: '2026-04-17' },
];

const TYPE_TINT: Record<TxType, { bg: string; fg: string }> = {
  'Ticket Sale': { bg: 'var(--tint-olive-bg)', fg: 'var(--tint-olive-fg)' },
  Commission: { bg: 'var(--tint-clay-bg)', fg: 'var(--tint-clay-fg)' },
  Payout: { bg: 'var(--tint-stone-bg)', fg: 'var(--tint-stone-fg)' },
  Refund: { bg: 'var(--tint-danger-bg)', fg: 'var(--tint-danger-fg)' },
};

const STATUS_TINT: Record<TxStatus, { bg: string; fg: string }> = {
  Completed: { bg: 'var(--tint-olive-bg)', fg: 'var(--tint-olive-fg)' },
  Pending: { bg: 'var(--tint-sand-bg)', fg: 'var(--tint-sand-fg)' },
  Failed: { bg: 'var(--tint-danger-bg)', fg: 'var(--tint-danger-fg)' },
};

/** Money in is olive, money out is clay. */
function amountColor(n: number) {
  return n >= 0 ? 'var(--tint-olive-strong)' : 'var(--color-accent-700)';
}

function signed(n: number) {
  return `${n >= 0 ? '+' : '−'}${money(Math.abs(n))}`;
}

export default function FinancePage() {
  const [type, setType] = useState<'all' | TxType>('all');
  const [channel, setChannel] = useState<'all' | Channel>('all');

  const rows = useMemo(
    () =>
      SAMPLE_TX.filter(
        (t) => (type === 'all' || t.type === type) && (channel === 'all' || t.channel === channel)
      ),
    [type, channel]
  );

  const kpis = [
    {
      label: 'Total GMV',
      value: money(K.gmv),
      note: 'all channels, 12 months',
      icon: DollarSign,
      bg: 'var(--tint-olive-bg)',
      fg: 'var(--tint-olive-strong)',
    },
    {
      label: 'Platform income',
      value: money(K.totalIncome),
      note: 'commission earned',
      icon: Wallet,
      bg: 'var(--tint-clay-bg)',
      fg: 'var(--tint-clay-strong)',
    },
    {
      label: 'Gross margin',
      value: `${K.grossMargin}%`,
      note: 'after direct costs',
      icon: Percent,
      bg: 'var(--tint-sand-bg)',
      fg: 'var(--tint-sand-fg)',
    },
    {
      label: 'Direct costs',
      value: money(K.directCosts),
      note: 'M-Pesa fees + refunds',
      icon: Activity,
      bg: '#f6dfce',
      fg: '#8c491a',
    },
  ];

  const selectStyle = { width: 'auto', minWidth: 130, background: 'var(--color-surface)' } as const;

  return (
    <div className="flex flex-col gap-3.5 animate-soa-fade">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}
      >
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2.5" style={{ padding: '13px 16px' }}>
          <span
            className="mr-auto"
            style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 16 }}
          >
            Transactions
          </span>
          <select
            className="soa-input"
            style={selectStyle}
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            aria-label="Filter by type"
          >
            <option value="all">All types</option>
            <option value="Ticket Sale">Ticket Sale</option>
            <option value="Commission">Commission</option>
            <option value="Payout">Payout</option>
            <option value="Refund">Refund</option>
          </select>
          <select
            className="soa-input"
            style={selectStyle}
            value={channel}
            onChange={(e) => setChannel(e.target.value as typeof channel)}
            aria-label="Filter by channel"
          >
            <option value="all">All channels</option>
            <option value="M-Pesa">M-Pesa</option>
            <option value="Paystack">Paystack</option>
            <option value="LittlePay">LittlePay</option>
          </select>
          <button
            className="flex items-center gap-1.5"
            style={{
              height: 36,
              padding: '0 14px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-divider)',
              background: 'var(--color-surface)',
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text)',
            }}
          >
            <Download className="ic w-[15px] h-[15px]" />
            Export
          </button>
        </div>

        {rows.length === 0 ? (
          <div
            style={{
              padding: '44px 20px',
              textAlign: 'center',
              fontSize: 13,
              color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
              borderTop: '1px solid var(--color-divider)',
            }}
          >
            No transactions match these filters
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div
              className="overflow-x-auto hidden md:block"
              style={{ borderTop: '1px solid var(--color-divider)' }}
            >
              <table className="soa-table" style={{ minWidth: 720 }}>
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Channel</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{t.party}</div>
                        <div
                          className="tnum"
                          style={{
                            fontSize: 10.5,
                            color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                          }}
                        >
                          {t.id}
                        </div>
                      </td>
                      <td
                        className="tnum"
                        style={{
                          fontSize: 12.5,
                          color: 'color-mix(in srgb, var(--color-text) 60%, transparent)',
                        }}
                      >
                        {dateShort(t.date)}
                      </td>
                      <td>
                        <Pill bg={TYPE_TINT[t.type].bg} fg={TYPE_TINT[t.type].fg}>
                          {t.type}
                        </Pill>
                      </td>
                      <td style={{ fontSize: 12.5 }}>{t.channel}</td>
                      <td
                        className="tnum"
                        style={{ textAlign: 'right', fontWeight: 700, color: amountColor(t.amount) }}
                      >
                        {signed(t.amount)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Pill bg={STATUS_TINT[t.status].bg} fg={STATUS_TINT[t.status].fg}>
                          {t.status}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile rows */}
            <div className="md:hidden">
              {rows.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2.5"
                  style={{ padding: '12px 16px', borderTop: '1px solid var(--color-divider)' }}
                >
                  <div className="flex-1 min-w-0">
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.party}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Pill bg={TYPE_TINT[t.type].bg} fg={TYPE_TINT[t.type].fg}>
                        {t.type}
                      </Pill>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'color-mix(in srgb, var(--color-text) 48%, transparent)',
                        }}
                      >
                        {t.channel} · {dateShort(t.date)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-none">
                    <div
                      className="tnum"
                      style={{ fontWeight: 700, fontSize: 13.5, color: amountColor(t.amount) }}
                    >
                      {signed(t.amount)}
                    </div>
                    <div className="mt-1">
                      <Pill bg={STATUS_TINT[t.status].bg} fg={STATUS_TINT[t.status].fg}>
                        {t.status}
                      </Pill>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <p
        className="m-0"
        style={{
          fontSize: 11.5,
          color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
        }}
      >
        Ledger rows are sample data. The KPI row reflects reconciled 12-month reporting figures.
      </p>
    </div>
  );
}
