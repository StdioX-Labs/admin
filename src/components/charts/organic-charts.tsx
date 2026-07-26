'use client';

/**
 * Hand-drawn SVG charts, ported from the Organic design project.
 *
 * Deliberately dependency-free: the design draws its own axes, grid and
 * marks, and uses native <title> elements for tooltips. That keeps the charts
 * crisp at any width, keyboard/screen-reader legible, and consistent with the
 * rest of the system's stroke language.
 */

import { MONTHLY, CHANNEL_MIX, type MonthRow, type ChannelRow } from '@/lib/platform-analytics';
import { compact, money } from '@/components/ui/soa';

const AXIS_FILL = 'rgba(32,30,29,.45)';
const LABEL_FILL = 'rgba(32,30,29,.5)';
const GRID_STROKE = 'rgba(32,30,29,.08)';
const FONT = 'var(--font-body), sans-serif';

const ACCENT = '#c67139';
const OLIVE = '#7a8a5e';

/** Horizontal gridlines plus their left-hand value labels. */
function Grid({
  padL,
  padT,
  ih,
  width,
  padR,
  max,
  steps = 3,
  format = compact,
}: {
  padL: number;
  padT: number;
  ih: number;
  width: number;
  padR: number;
  max: number;
  steps?: number;
  format?: (n: number) => string;
}) {
  return (
    <>
      {Array.from({ length: steps + 1 }, (_, g) => {
        const gy = padT + ih - (g / steps) * ih;
        const gv = (max * g) / steps;
        return (
          <g key={g}>
            <line x1={padL} y1={gy} x2={width - padR} y2={gy} stroke={GRID_STROKE} />
            <text
              x={padL - 7}
              y={gy + 3}
              textAnchor="end"
              fontSize="9.5"
              fill={AXIS_FILL}
              fontFamily={FONT}
            >
              {format(gv)}
            </text>
          </g>
        );
      })}
    </>
  );
}

function MonthLabels({
  rows,
  x,
  height,
}: {
  rows: MonthRow[];
  x: (i: number) => number;
  height: number;
}) {
  return (
    <>
      {rows.map((m, i) => (
        <text
          key={m.month}
          x={x(i)}
          y={height - 7}
          textAnchor="middle"
          fontSize="9.5"
          fill={LABEL_FILL}
          fontFamily={FONT}
        >
          {m.month}
        </text>
      ))}
    </>
  );
}

/** Filled area + line of monthly GMV. */
export function GmvChart({ rows = MONTHLY }: { rows?: MonthRow[] }) {
  const W = 560;
  const H = 182;
  const padL = 42;
  const padR = 10;
  const padT = 12;
  const padB = 24;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const max = Math.max(...rows.map((m) => m.gmv)) * 1.12 || 1;
  const x = (i: number) => padL + (i / (rows.length - 1)) * iw;
  const y = (v: number) => padT + ih - (v / max) * ih;

  const line = rows
    .map((m, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(m.gmv).toFixed(1)}`)
    .join(' ');
  const area = `${line} L ${x(rows.length - 1).toFixed(1)} ${padT + ih} L ${padL} ${padT + ih} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Monthly gross merchandise value over the last 12 months"
      style={{ width: '100%', height: 'auto', display: 'block', marginTop: 6 }}
    >
      <defs>
        <linearGradient id="gGmv" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity=".26" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>
      <Grid padL={padL} padT={padT} ih={ih} width={W} padR={padR} max={max} />
      <path d={area} fill="url(#gGmv)" />
      <path
        d={line}
        fill="none"
        stroke={ACCENT}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <MonthLabels rows={rows} x={x} height={H} />
      {rows.map((m, i) => (
        <g key={m.month}>
          <circle cx={x(i)} cy={y(m.gmv)} r="2.4" fill={ACCENT} />
          <circle cx={x(i)} cy={y(m.gmv)} r="9" fill="transparent">
            <title>{`${m.month}: ${money(m.gmv)}`}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}

/** Donut of GMV split by payment channel, total in the hole. */
export function ChannelDonut({ rows = CHANNEL_MIX }: { rows?: ChannelRow[] }) {
  const total = rows.reduce((s, c) => s + c.value, 0);
  const cx = 80;
  const cy = 80;
  const r = 58;
  const ri = 37;

  let ang = -Math.PI / 2;
  const segments = rows.map((c) => {
    const a2 = ang + (c.value / total) * Math.PI * 2;
    const large = a2 - ang > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(ang);
    const y1 = cy + r * Math.sin(ang);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    const xi1 = cx + ri * Math.cos(a2);
    const yi1 = cy + ri * Math.sin(a2);
    const xi2 = cx + ri * Math.cos(ang);
    const yi2 = cy + ri * Math.sin(ang);
    ang = a2;
    return {
      name: c.name,
      pct: c.pct,
      color: c.color,
      d: `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L${xi1.toFixed(1)} ${yi1.toFixed(1)} A${ri} ${ri} 0 ${large} 0 ${xi2.toFixed(1)} ${yi2.toFixed(1)} Z`,
    };
  });

  return (
    <svg
      viewBox="0 0 160 160"
      role="img"
      aria-label="Gross merchandise value split by payment channel"
      style={{ width: '100%', height: 'auto', maxWidth: 150, display: 'block', margin: '2px auto 0' }}
    >
      {segments.map((s) => (
        <path key={s.name} d={s.d} fill={s.color}>
          <title>{`${s.name}: ${s.pct}%`}</title>
        </path>
      ))}
      <text
        x="80"
        y="77"
        textAnchor="middle"
        fontSize="15"
        fontFamily={FONT}
        fontWeight="700"
        fill="#201e1d"
      >
        {compact(total)}
      </text>
      <text
        x="80"
        y="93"
        textAnchor="middle"
        fontSize="8.5"
        fontFamily={FONT}
        fill="rgba(32,30,29,.5)"
        letterSpacing=".1em"
      >
        TOTAL GMV
      </text>
    </svg>
  );
}

/** Monthly platform commission as bars. */
export function CommissionBars({ rows = MONTHLY }: { rows?: MonthRow[] }) {
  const W = 560;
  const H = 176;
  const padL = 44;
  const padR = 8;
  const padT = 10;
  const padB = 24;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const max = Math.max(...rows.map((m) => m.commission)) * 1.12 || 1;
  const step = iw / rows.length;
  const bw = Math.min(24, step * 0.5);
  const x = (i: number) => padL + step * i + step / 2;
  const y = (v: number) => padT + ih - (v / max) * ih;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Monthly platform commission"
      style={{ width: '100%', height: 'auto', display: 'block', marginTop: 6 }}
    >
      <Grid padL={padL} padT={padT} ih={ih} width={W} padR={padR} max={max} />
      {rows.map((m, i) => {
        const by = y(m.commission);
        return (
          <rect
            key={m.month}
            x={x(i) - bw / 2}
            y={by}
            width={bw}
            height={Math.max(0, padT + ih - by)}
            rx="3"
            fill={ACCENT}
          >
            <title>{`${m.month}: ${money(m.commission)}`}</title>
          </rect>
        );
      })}
      <MonthLabels rows={rows} x={x} height={H} />
    </svg>
  );
}

/** Gross margin line, zoomed to the 80–100% band where the signal lives. */
export function MarginChart({ rows = MONTHLY }: { rows?: MonthRow[] }) {
  const data = rows.filter((m) => m.margin > 0);
  const W = 560;
  const H = 170;
  const padL = 38;
  const padR = 10;
  const padT = 12;
  const padB = 24;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const lo = 80;
  const hi = 100;
  const x = (i: number) => padL + (i / (data.length - 1)) * iw;
  const y = (v: number) => padT + ih - ((v - lo) / (hi - lo)) * ih;

  const line = data
    .map((m, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(m.margin).toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Monthly gross margin percentage"
      style={{ width: '100%', height: 'auto', display: 'block', marginTop: 6 }}
    >
      {[80, 90, 100].map((gv) => (
        <g key={gv}>
          <line x1={padL} y1={y(gv)} x2={W - padR} y2={y(gv)} stroke={GRID_STROKE} />
          <text
            x={padL - 7}
            y={y(gv) + 3}
            textAnchor="end"
            fontSize="9.5"
            fill={AXIS_FILL}
            fontFamily={FONT}
          >
            {gv}%
          </text>
        </g>
      ))}
      <path
        d={line}
        fill="none"
        stroke={OLIVE}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((m, i) => (
        <g key={m.month}>
          <circle cx={x(i)} cy={y(m.margin)} r="3" fill={OLIVE} />
          <circle cx={x(i)} cy={y(m.margin)} r="9" fill="transparent">
            <title>{`${m.month}: ${m.margin}%`}</title>
          </circle>
        </g>
      ))}
      <MonthLabels rows={data} x={x} height={H} />
    </svg>
  );
}

/** Colour swatch + name + percentage rows under the donut. */
export function ChannelLegend({ rows = CHANNEL_MIX }: { rows?: ChannelRow[] }) {
  return (
    <div className="flex flex-col gap-[7px] mt-3">
      {rows.map((c) => (
        <div key={c.name} className="flex items-center gap-2" style={{ fontSize: 12 }}>
          <span
            style={{ width: 9, height: 9, borderRadius: 3, flex: 'none', background: c.color }}
          />
          <span className="flex-1">{c.name}</span>
          <span className="tnum font-semibold">{c.pct}%</span>
        </div>
      ))}
    </div>
  );
}
