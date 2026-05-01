'use client';

import { Card } from "@/components/ui/card";
import {
  CalendarDays, Ticket, TrendingUp, Users, Trophy, Banknote, CheckCircle, RefreshCw, ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ── static data ───────────────────────────────────────────────────────────────

const kpis = {
  events: 234,
  tickets: 1285839,
  gmv: 31141865,
  avgTicketPrice: 2500,
  largestEventSize: 10570,
  highestEventValue: 9215100,
  avgCheckinRate: 86,
  repeatOrganizers: 53,
};

const monthlyGMV = [
  { month: 'May', gmv: 1600000 },
  { month: 'Jun', gmv: 1900000 },
  { month: 'Jul', gmv: 2100000 },
  { month: 'Aug', gmv: 2300000 },
  { month: 'Sep', gmv: 2000000 },
  { month: 'Oct', gmv: 2800000 },
  { month: 'Nov', gmv: 3200000 },
  { month: 'Dec', gmv: 3800000 },
  { month: 'Jan', gmv: 2500000 },
  { month: 'Feb', gmv: 2700000 },
  { month: 'Mar', gmv: 3100000 },
  { month: 'Apr', gmv: 3241865 },
];

const monthlyTickets = [
  { month: 'May', tickets: 62000 },
  { month: 'Jun', tickets: 75000 },
  { month: 'Jul', tickets: 88000 },
  { month: 'Aug', tickets: 98000 },
  { month: 'Sep', tickets: 83000 },
  { month: 'Oct', tickets: 115000 },
  { month: 'Nov', tickets: 132000 },
  { month: 'Dec', tickets: 160000 },
  { month: 'Jan', tickets: 103000 },
  { month: 'Feb', tickets: 113000 },
  { month: 'Mar', tickets: 128000 },
  { month: 'Apr', tickets: 128839 },
];

const eventsByCategory = [
  { name: 'Music',        value: 62, color: '#7c3aed' },
  { name: 'Corporate',   value: 48, color: '#2563eb' },
  { name: 'Sports',      value: 41, color: '#059669' },
  { name: 'Arts & Culture', value: 35, color: '#d97706' },
  { name: 'Food & Drink', value: 28, color: '#ea580c' },
  { name: 'Tech',        value: 20, color: '#0284c7' },
];

const checkinByCategory = [
  { category: 'Music',     rate: 91 },
  { category: 'Corporate', rate: 88 },
  { category: 'Tech',      rate: 86 },
  { category: 'Sports',    rate: 84 },
  { category: 'Arts',      rate: 82 },
  { category: 'Food',      rate: 79 },
];

const topEvents = [
  { name: 'Nairobi Music Festival',      category: 'Music',       gmv: 9215100, attendees: 10570, checkin: 94 },
  { name: 'Corporate Summit Kenya 2024', category: 'Corporate',   gmv: 5840000, attendees: 2336,  checkin: 91 },
  { name: 'EA Sports Awards Night',      category: 'Sports',      gmv: 4120500, attendees: 3298,  checkin: 88 },
  { name: 'Nairobi Tech Week',           category: 'Tech',        gmv: 3650000, attendees: 1825,  checkin: 86 },
  { name: 'Taste of East Africa',        category: 'Food & Drink',gmv: 2980000, attendees: 1192,  checkin: 82 },
];

// ── formatters ────────────────────────────────────────────────────────────────

function fmt(n: number) { return new Intl.NumberFormat('en-KE').format(n); }
function fmtShort(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);
}

// ── small components ──────────────────────────────────────────────────────────

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
function GmvTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-emerald-500">GMV: {fmtCurrency(payload[0].value)}</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TicketsTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-blue-500">Tickets: {fmt(payload[0].value)}</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CheckinTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-green-500">Check-in rate: {payload[0].value}%</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground mt-0.5">{payload[0].value} events</p>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <div className="p-3">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Platform Analytics</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Key metrics across all events and organizers</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-accent px-3 py-1.5 rounded-lg w-fit">
            <ArrowUpRight className="w-3 h-3" />
            All-time · May 2024 – Apr 2025
          </div>
        </div>

        {/* KPI cards — 2×4 grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Events" value={fmt(kpis.events)} icon={CalendarDays}
            iconBg="bg-violet-100 dark:bg-violet-950" iconColor="text-violet-600 dark:text-violet-400"
            valueColor="text-violet-600 dark:text-violet-400" />
          <StatCard label="Tickets Sold" value={fmt(kpis.tickets)} icon={Ticket}
            iconBg="bg-blue-100 dark:bg-blue-950" iconColor="text-blue-600 dark:text-blue-400"
            valueColor="text-blue-600 dark:text-blue-400" />
          <StatCard label="Total GMV" value={fmtCurrency(kpis.gmv)} icon={TrendingUp}
            iconBg="bg-emerald-100 dark:bg-emerald-950" iconColor="text-emerald-600 dark:text-emerald-400"
            valueColor="text-emerald-600 dark:text-emerald-400" />
          <StatCard label="Avg Ticket Price" value={fmtCurrency(kpis.avgTicketPrice)} icon={Banknote}
            iconBg="bg-amber-100 dark:bg-amber-950" iconColor="text-amber-600 dark:text-amber-400"
            valueColor="text-amber-600 dark:text-amber-400" />

          <StatCard label="Largest Event" value={fmt(kpis.largestEventSize)} icon={Users}
            iconBg="bg-sky-100 dark:bg-sky-950" iconColor="text-sky-600 dark:text-sky-400"
            valueColor="text-sky-600 dark:text-sky-400" note="attendees" />
          <StatCard label="Best Event Value" value={fmtCurrency(kpis.highestEventValue)} icon={Trophy}
            iconBg="bg-orange-100 dark:bg-orange-950" iconColor="text-orange-600 dark:text-orange-400"
            valueColor="text-orange-600 dark:text-orange-400" />
          <StatCard label="Avg Check-in Rate" value={`${kpis.avgCheckinRate}%`} icon={CheckCircle}
            iconBg="bg-green-100 dark:bg-green-950" iconColor="text-green-600 dark:text-green-400"
            valueColor="text-green-600 dark:text-green-400" note="tickets scanned" />
          <StatCard label="Repeat Organizers" value={fmt(kpis.repeatOrganizers)} icon={RefreshCw}
            iconBg="bg-pink-100 dark:bg-pink-950" iconColor="text-pink-600 dark:text-pink-400"
            valueColor="text-pink-600 dark:text-pink-400" note="2+ events" />
        </div>

        {/* GMV trend + category breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="lg:col-span-2 p-4 bg-card border border-border">
            <p className="text-sm font-semibold text-foreground">Monthly GMV</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">Gross merchandise value — last 12 months</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyGMV} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.8)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.8)' }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip content={<GmvTooltip />} cursor={{ stroke: 'rgba(128,128,128,0.2)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="gmv" stroke="#059669" strokeWidth={2}
                    fill="url(#gmvGrad)" dot={false} activeDot={{ r: 4, fill: '#059669', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4 bg-card border border-border">
            <p className="text-sm font-semibold text-foreground">Events by Category</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">Distribution across 234 events</p>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={eventsByCategory} cx="50%" cy="50%"
                    innerRadius={36} outerRadius={56} dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {eventsByCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1.5">
              {eventsByCategory.map(cat => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-muted-foreground">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-accent overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(cat.value / 62) * 100}%`, backgroundColor: cat.color }} />
                    </div>
                    <span className="font-medium text-foreground w-5 text-right">{cat.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Ticket volume + check-in rates */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="p-4 bg-card border border-border">
            <p className="text-sm font-semibold text-foreground">Monthly Tickets Sold</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">Ticket volume per month</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTickets} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.8)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.8)' }} axisLine={false} tickLine={false} width={38} />
                  <Tooltip content={<TicketsTooltip />} cursor={{ fill: 'rgba(128,128,128,0.06)' }} />
                  <Bar dataKey="tickets" fill="#2563eb" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4 bg-card border border-border">
            <p className="text-sm font-semibold text-foreground">Check-in Rate by Category</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-4">Average attendance scan rate</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={checkinByCategory} layout="vertical"
                  margin={{ top: 0, right: 24, left: 8, bottom: 0 }} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" horizontal={false} />
                  <XAxis type="number" domain={[60, 100]} tickFormatter={v => `${v}%`}
                    tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.8)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category" width={56}
                    tick={{ fontSize: 11, fill: 'rgba(128,128,128,0.8)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CheckinTooltip />} cursor={{ fill: 'rgba(128,128,128,0.06)' }} />
                  <Bar dataKey="rate" fill="#059669" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Top events table */}
        <Card className="bg-card border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Top Events by Value</p>
            <p className="text-xs text-muted-foreground mt-0.5">Highest grossing events on the platform</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  {['#', 'Event', 'Category', 'GMV', 'Attendees', 'Check-in'].map((h, i) => (
                    <th key={h} className={`px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide ${i > 1 ? (i <= 3 ? 'text-right' : 'text-right hidden md:table-cell') : 'text-left'} ${i === 2 ? 'hidden sm:table-cell' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topEvents.map((ev, i) => (
                  <tr key={ev.name} className="border-b border-border last:border-0 hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-medium text-sm">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{ev.name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground border border-border">{ev.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmtCurrency(ev.gmv)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">{fmt(ev.attendees)}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className={`text-xs font-semibold ${ev.checkin >= 90 ? 'text-emerald-500' : 'text-blue-500'}`}>
                        {ev.checkin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Summary strip */}
        <Card className="p-4 bg-card border border-border">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {[
              { label: 'Revenue per event',    value: fmtCurrency(Math.round(kpis.gmv / kpis.events)) },
              { label: 'Tickets per event',    value: fmt(Math.round(kpis.tickets / kpis.events)) },
              { label: 'Repeat organizer rate',value: `${((kpis.repeatOrganizers / kpis.events) * 100).toFixed(1)}%` },
              { label: 'Platform GMV',         value: fmtCurrency(kpis.gmv) },
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
