'use client';

import { Card } from "@/components/ui/card";
import {
  TrendingUp, DollarSign, BarChart2, Percent,
  Zap, RefreshCw, Activity, Star,
  CalendarDays, Ticket, Banknote, CheckCircle,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ── real financial data (May 2025 – Apr 2026) ────────────────────────────────

const monthly = [
  { month: 'May',  gmv: 0,          income: 0,       grossProfit: -6,      margin: 0,    commission: 0,       tokea: 0 },
  { month: 'Jun',  gmv: 4614,       income: 461,     grossProfit: -36,     margin: 0,    commission: 461,     tokea: 0 },
  { month: 'Jul',  gmv: 339394,     income: 33939,   grossProfit: 32301,   margin: 95.2, commission: 33939,   tokea: 0 },
  { month: 'Aug',  gmv: 2780021,    income: 278002,  grossProfit: 272407,  margin: 98.0, commission: 278002,  tokea: 0 },
  { month: 'Sep',  gmv: 2860266,    income: 286027,  grossProfit: 279694,  margin: 97.8, commission: 286027,  tokea: 0 },
  { month: 'Oct',  gmv: 4101681,    income: 470168,  grossProfit: 419157,  margin: 89.1, commission: 410168,  tokea: 60000 },
  { month: 'Nov',  gmv: 730302,     income: 133030,  grossProfit: 129912,  margin: 97.7, commission: 73030,   tokea: 60000 },
  { month: 'Dec',  gmv: 14806586,   income: 1540659, grossProfit: 1532031, margin: 99.4, commission: 1480659, tokea: 60000 },
  { month: 'Jan',  gmv: 1021073,    income: 162107,  grossProfit: 160714,  margin: 99.1, commission: 102107,  tokea: 60000 },
  { month: 'Feb',  gmv: 1190658,    income: 179066,  grossProfit: 172954,  margin: 96.6, commission: 119066,  tokea: 60000 },
  { month: 'Mar',  gmv: 1888914,    income: 248891,  grossProfit: 243366,  margin: 97.8, commission: 188891,  tokea: 60000 },
  { month: 'Apr',  gmv: 1418356,    income: 201836,  grossProfit: 198001,  margin: 98.1, commission: 141836,  tokea: 60000 },
];

const channelMix = [
  { name: 'M-Pesa',    value: 27453391, pct: 88.2, color: '#059669' },
  { name: 'Paystack',  value: 2974043,  pct: 9.5,  color: '#2563eb' },
  { name: 'TOKEA Sub', value: 420000,   pct: 1.3,  color: '#7c3aed' },
  { name: 'LittlePay', value: 213430,   pct: 0.7,  color: '#d97706' },
  { name: 'Other',     value: 81000,    pct: 0.3,  color: '#6b7280' },
];

const kpis = {
  // financial
  gmv:          31141864,
  totalIncome:  3492186,
  grossProfit:  3400494,
  grossMargin:  97.4,
  takeRate:     10,
  tokeaMrr:     60000,
  tokeaArr:     720000,
  directCosts:  91692,
  // operational (from original platform data)
  events:       234,
  tickets:      1285839,
  avgTicket:    2500,
  checkinRate:  86,
  repeatOrgs:   53,
  largestEvent: 10570,
  bestMonthIncome: 1540659,
};

// ── formatters ────────────────────────────────────────────────────────────────

const fmt  = (n: number) => new Intl.NumberFormat('en-KE').format(n);
const fmtK = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};
const fmtC = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

// ── sub-components ────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string; value: string; icon: React.ElementType;
  iconBg: string; iconColor: string; valueColor?: string; note?: string;
}
function StatCard({ label, value, icon: Icon, iconBg, iconColor, valueColor = 'text-foreground', note }: StatCardProps) {
  return (
    <Card className="p-4 bg-card border border-border hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
          <p className={`text-xl font-bold leading-tight ${valueColor}`}>{value}</p>
          {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
        </div>
        <div className={`p-2.5 rounded-lg flex-shrink-0 ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GmvTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs space-y-0.5">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-emerald-500">GMV: {fmtC(payload[0].value)}</p>
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const IncomeTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs space-y-0.5">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: { name: string; color: string; value: number }) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmtC(p.value)}</p>
      ))}
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MarginTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-blue-400">Margin: {payload[0].value}%</p>
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PieTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground mt-0.5">{fmtC(payload[0].value)} · {payload[0].payload.pct}%</p>
    </div>
  );
};

// ── page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <div className="p-3">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Platform Analytics</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Financial &amp; operational metrics — May 2025 to Apr 2026</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground bg-accent px-3 py-1.5 rounded-lg">
              Period: 12 months · KSH · 10% take rate
            </div>
          </div>
        </div>

        {/* ── Row 1: Financial KPIs ── */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60 mb-2.5">Financial</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total GMV" value={fmtC(kpis.gmv)} icon={TrendingUp}
              iconBg="bg-emerald-100 dark:bg-emerald-950" iconColor="text-emerald-600 dark:text-emerald-400"
              valueColor="text-emerald-600 dark:text-emerald-400" note="all channels" />
            <StatCard label="Total Income" value={fmtC(kpis.totalIncome)} icon={DollarSign}
              iconBg="bg-blue-100 dark:bg-blue-950" iconColor="text-blue-600 dark:text-blue-400"
              valueColor="text-blue-600 dark:text-blue-400" note="commission + TOKEA" />
            <StatCard label="Gross Profit" value={fmtC(kpis.grossProfit)} icon={BarChart2}
              iconBg="bg-violet-100 dark:bg-violet-950" iconColor="text-violet-600 dark:text-violet-400"
              valueColor="text-violet-600 dark:text-violet-400" note="after direct costs" />
            <StatCard label="Gross Margin" value={`${kpis.grossMargin}%`} icon={Percent}
              iconBg="bg-amber-100 dark:bg-amber-950" iconColor="text-amber-600 dark:text-amber-400"
              valueColor="text-amber-600 dark:text-amber-400" note="marketplace benchmark 80–95%" />
          </div>
        </div>

        {/* ── Row 2: Recurring revenue + best month ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Take Rate" value={`${kpis.takeRate}%`} icon={Zap}
            iconBg="bg-sky-100 dark:bg-sky-950" iconColor="text-sky-600 dark:text-sky-400"
            valueColor="text-sky-600 dark:text-sky-400" note="commission on event GMV" />
          <StatCard label="TOKEA MRR" value={fmtC(kpis.tokeaMrr)} icon={RefreshCw}
            iconBg="bg-pink-100 dark:bg-pink-950" iconColor="text-pink-600 dark:text-pink-400"
            valueColor="text-pink-600 dark:text-pink-400" note={`ARR ${fmtC(kpis.tokeaArr)}`} />
          <StatCard label="Best Month" value={fmtC(kpis.bestMonthIncome)} icon={Star}
            iconBg="bg-orange-100 dark:bg-orange-950" iconColor="text-orange-600 dark:text-orange-400"
            valueColor="text-orange-600 dark:text-orange-400" note="Dec 2025 · 44% of annual" />
          <StatCard label="Direct Costs" value={fmtC(kpis.directCosts)} icon={Activity}
            iconBg="bg-red-100 dark:bg-red-950" iconColor="text-red-500 dark:text-red-400"
            valueColor="text-red-500 dark:text-red-400" note="M-Pesa fees + refunds" />
        </div>

        {/* ── Row 3: Operational KPIs ── */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60 mb-2.5">Operational</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Events" value={fmt(kpis.events)} icon={CalendarDays}
              iconBg="bg-violet-100 dark:bg-violet-950" iconColor="text-violet-600 dark:text-violet-400" />
            <StatCard label="Tickets Sold" value={fmt(kpis.tickets)} icon={Ticket}
              iconBg="bg-blue-100 dark:bg-blue-950" iconColor="text-blue-600 dark:text-blue-400"
              note={`~${fmt(Math.round(kpis.tickets / kpis.events))} / event`} />
            <StatCard label="Avg Ticket Price" value={fmtC(kpis.avgTicket)} icon={Banknote}
              iconBg="bg-amber-100 dark:bg-amber-950" iconColor="text-amber-600 dark:text-amber-400" />
            <StatCard label="Avg Check-in Rate" value={`${kpis.checkinRate}%`} icon={CheckCircle}
              iconBg="bg-green-100 dark:bg-green-950" iconColor="text-green-600 dark:text-green-400"
              note="of tickets scanned" />
          </div>
        </div>

        {/* ── GMV Trend + Channel Mix ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="lg:col-span-2 p-4 bg-card border border-border">
            <p className="text-sm font-semibold text-foreground">Monthly GMV</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">Gross merchandise value · May 2025 – Apr 2026</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.8)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.8)' }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip content={<GmvTip />} cursor={{ stroke: 'rgba(128,128,128,0.2)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="gmv" stroke="#059669" strokeWidth={2}
                    fill="url(#gmvGrad)" dot={false} activeDot={{ r: 4, fill: '#059669', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4 bg-card border border-border">
            <p className="text-sm font-semibold text-foreground">GMV by Channel</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">Payment method breakdown</p>
            <div className="h-[110px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelMix} cx="50%" cy="50%"
                    innerRadius={32} outerRadius={52} dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {channelMix.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<PieTip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1.5">
              {channelMix.map(ch => (
                <div key={ch.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: ch.color }} />
                    <span className="text-muted-foreground">{ch.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 rounded-full bg-accent overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${ch.pct}%`, backgroundColor: ch.color }} />
                    </div>
                    <span className="font-medium text-foreground w-8 text-right">{ch.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Income breakdown + Gross Margin ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="p-4 bg-card border border-border">
            <p className="text-sm font-semibold text-foreground">Monthly Income</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">Commission vs TOKEA subscription</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.8)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.8)' }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip content={<IncomeTip />} cursor={{ fill: 'rgba(128,128,128,0.06)' }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="commission" name="Commission" stackId="a" fill="#2563eb" radius={[0,0,0,0]} />
                  <Bar dataKey="tokea"      name="TOKEA"      stackId="a" fill="#7c3aed" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4 bg-card border border-border">
            <p className="text-sm font-semibold text-foreground">Monthly Gross Margin</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">Gross profit as % of income (ex May–Jun ramp)</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly.filter(m => m.margin > 0)} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.8)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[80, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.8)' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<MarginTip />} cursor={{ stroke: 'rgba(128,128,128,0.2)', strokeWidth: 1 }} />
                  <Line type="monotone" dataKey="margin" stroke="#38bdf8" strokeWidth={2}
                    dot={{ r: 3, fill: '#38bdf8', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#38bdf8', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* ── Monthly financial summary table ── */}
        <Card className="bg-card border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Monthly Financial Summary</p>
            <p className="text-xs text-muted-foreground mt-0.5">GMV · Income · Gross Profit · Margin — May 2025 to Apr 2026</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  {['Month', 'GMV', 'Commission', 'TOKEA', 'Income', 'Direct Costs', 'Gross Profit', 'Margin'].map(h => (
                    <th key={h} className={`px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide ${h === 'Month' ? 'text-left' : 'text-right'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthly.map((m, i) => {
                  const directCost = m.income - m.grossProfit;
                  const isDecember = m.month === 'Dec';
                  return (
                    <tr key={m.month} className={`border-b border-border last:border-0 transition-colors ${isDecember ? 'bg-amber-500/5' : 'hover:bg-accent/20'}`}>
                      <td className={`px-3 py-2.5 font-medium text-sm ${isDecember ? 'text-amber-500' : 'text-foreground'}`}>
                        {m.month}{i < 7 ? ' \'25' : ' \'26'}
                        {isDecember && <span className="ml-1 text-[10px] bg-amber-500/20 text-amber-500 px-1 rounded">Peak</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-emerald-600 dark:text-emerald-400">{m.gmv > 0 ? fmtC(m.gmv) : '—'}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{m.commission > 0 ? fmtC(m.commission) : '—'}</td>
                      <td className="px-3 py-2.5 text-right text-violet-500">{m.tokea > 0 ? fmtC(m.tokea) : '—'}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-blue-500">{m.income > 0 ? fmtC(m.income) : '—'}</td>
                      <td className="px-3 py-2.5 text-right text-red-400">{directCost > 0 ? fmtC(directCost) : directCost < 0 ? fmtC(Math.abs(directCost)) : '—'}</td>
                      <td className={`px-3 py-2.5 text-right font-semibold ${m.grossProfit > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                        {m.grossProfit !== 0 ? fmtC(m.grossProfit) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {m.margin > 0 ? (
                          <span className={`text-xs font-semibold ${m.margin >= 97 ? 'text-emerald-500' : 'text-amber-500'}`}>{m.margin}%</span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-accent/50">
                  <td className="px-3 py-2.5 font-bold text-foreground text-sm">Total</td>
                  <td className="px-3 py-2.5 text-right font-bold text-emerald-500">{fmtC(kpis.gmv)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-muted-foreground">{fmtC(3072186)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-violet-500">{fmtC(420000)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-blue-500">{fmtC(kpis.totalIncome)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-red-400">{fmtC(kpis.directCosts)}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-emerald-500">{fmtC(kpis.grossProfit)}</td>
                  <td className="px-3 py-2.5 text-right"><span className="text-xs font-bold text-emerald-500">97.4%</span></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* ── Summary strip ── */}
        <Card className="p-4 bg-card border border-border">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {[
              { label: 'Avg monthly income',     value: fmtC(Math.round(kpis.totalIncome / 12)) },
              { label: 'Avg income (ex-Dec)',    value: fmtC(188000) },
              { label: 'TOKEA % of income',      value: '12.0%' },
              { label: 'M-Pesa % of event GMV',  value: '89.4%' },
            ].map(({ label, value }) => (
              <div key={label} className="px-4 py-2 first:pl-0 last:pr-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
