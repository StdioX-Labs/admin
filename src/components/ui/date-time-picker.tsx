'use client';

import { CalendarDays, Clock } from 'lucide-react';

const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const HOURS12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/**
 * Split date + 12-hour time control, emitting a `YYYY-MM-DDTHH:mm` string.
 *
 * The design mock uses a native `datetime-local` input. We keep this split
 * control instead: `datetime-local` was replaced deliberately (see the
 * date/time picker fixes in git history) because its mobile rendering cut off
 * on small viewports and its hit targets were too small. Row height and font
 * size here stay at 44px / 16px so mobile Safari doesn't zoom on focus.
 */
export function DateTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const datePart = value ? value.split('T')[0] : '';
  const rawTime = value && value.includes('T') ? value.split('T')[1].slice(0, 5) : '12:00';
  const h24 = parseInt(rawTime.split(':')[0]) || 0;
  const rawMin = parseInt(rawTime.split(':')[1]) || 0;
  const m = (Math.round(rawMin / 5) * 5) % 60;
  const isPM = h24 >= 12;
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;

  const emit = (d: string, newH12: number, newM: number, newIsPM: boolean) => {
    if (!d) {
      onChange('');
      return;
    }
    const h = (newH12 % 12) + (newIsPM ? 12 : 0);
    onChange(`${d}T${String(h).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
  };

  const selectStyle: React.CSSProperties = {
    flex: 1,
    height: 44,
    minHeight: 44,
    fontSize: 16,
    textAlign: 'center',
    background: 'var(--color-surface)',
    paddingRight: 28,
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <CalendarDays
          className="ic absolute w-4 h-4 pointer-events-none"
          style={{
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'color-mix(in srgb, var(--color-text) 42%, transparent)',
          }}
        />
        <input
          type="date"
          className="soa-input"
          value={datePart}
          onChange={(e) => emit(e.target.value, h12, m, isPM)}
          style={{ height: 44, minHeight: 44, fontSize: 16, paddingLeft: 38 }}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <Clock
          className="ic w-4 h-4 flex-none"
          style={{ color: 'color-mix(in srgb, var(--color-text) 40%, transparent)' }}
        />
        <select
          className="soa-input"
          aria-label="Hour"
          value={h12}
          onChange={(e) => emit(datePart, Number(e.target.value), m, isPM)}
          style={selectStyle}
        >
          {HOURS12.map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, '0')}
            </option>
          ))}
        </select>
        <span className="font-bold text-muted-foreground">:</span>
        <select
          className="soa-input"
          aria-label="Minute"
          value={m}
          onChange={(e) => emit(datePart, h12, Number(e.target.value), isPM)}
          style={selectStyle}
        >
          {MINUTES.map((min) => (
            <option key={min} value={min}>
              {String(min).padStart(2, '0')}
            </option>
          ))}
        </select>
        <select
          className="soa-input"
          aria-label="AM or PM"
          value={isPM ? 'PM' : 'AM'}
          onChange={(e) => emit(datePart, h12, m, e.target.value === 'PM')}
          style={{ ...selectStyle, flex: 'none', width: 78 }}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );
}

/** Label + required marker wrapper matching the design's `.field`. */
export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="field min-w-0">
      <label>
        {label}
        {required && <span style={{ color: 'var(--tint-danger-strong)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}
