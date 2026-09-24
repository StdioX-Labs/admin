'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import type { Company } from '@/lib/api';

/**
 * Picks a company by typing its name or its id.
 *
 * A plain select stops being usable once there are more companies than fit on
 * screen — you cannot get to one without knowing where it sits in the order,
 * and an id is not searchable at all. This filters on both: administrators
 * usually have the id to hand from a URL or a report, and the name otherwise.
 *
 * Matching on id is prefix-based rather than substring, because "3" should
 * offer 3, 30 and 312 rather than every company with a 3 anywhere in its id.
 */
export function CompanyPicker({
  companies,
  loading,
  value,
  onChange,
  inputId = 'company-picker',
}: {
  companies: Company[];
  loading?: boolean;
  /** Selected company id as a string; '' for none. */
  value: string;
  onChange: (companyId: string) => void;
  inputId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = companies.find((c) => String(c.id) === value) ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        String(c.id).startsWith(q) ||
        (c.emailAddress ?? '').toLowerCase().includes(q)
    );
  }, [companies, query]);

  useEffect(() => setHighlight(0), [query, open]);

  // Close when focus or a click leaves the control.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const choose = (c: Company) => {
    onChange(String(c.id));
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return setOpen(true);
      setHighlight((h) => {
        const next = e.key === 'ArrowDown' ? h + 1 : h - 1;
        return Math.max(0, Math.min(matches.length - 1, next));
      });
    } else if (e.key === 'Enter') {
      if (open && matches[highlight]) {
        e.preventDefault();
        choose(matches[highlight]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <Search
        className="ic absolute w-4 h-4 pointer-events-none"
        style={{
          left: 13,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'color-mix(in srgb, var(--color-text) 42%, transparent)',
        }}
      />
      <input
        id={inputId}
        className="soa-input"
        style={{ paddingLeft: 38, paddingRight: 56 }}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${inputId}-list`}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={loading}
        placeholder={loading ? 'Loading companies…' : 'Search by company name or ID'}
        // Typing filters; the selected company shows when the field is at rest.
        value={open ? query : (selected?.companyName ?? '')}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />

      <div
        className="absolute flex items-center gap-1"
        style={{ right: 8, top: '50%', transform: 'translateY(-50%)' }}
      >
        {value && !loading && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setQuery('');
            }}
            aria-label="Clear company"
            className="grid place-items-center"
            style={{
              width: 22,
              height: 22,
              border: 'none',
              background: 'transparent',
              borderRadius: 999,
              color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
            }}
          >
            <X className="ic w-[14px] h-[14px]" />
          </button>
        )}
        <ChevronDown
          className="ic w-4 h-4 pointer-events-none"
          style={{ color: 'color-mix(in srgb, var(--color-text) 42%, transparent)' }}
        />
      </div>

      {open && (
        <ul
          id={`${inputId}-list`}
          role="listbox"
          className="absolute left-0 right-0 overflow-y-auto animate-soa-fade-fast"
          style={{
            zIndex: 20,
            top: 'calc(100% + 4px)',
            maxHeight: 240,
            margin: 0,
            padding: 4,
            listStyle: 'none',
            background: 'var(--color-neutral-100)',
            border: '1px solid var(--color-divider)',
            borderRadius: 'var(--radius-control)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {matches.length === 0 ? (
            <li
              style={{
                padding: '9px 10px',
                fontSize: 12.5,
                color: 'color-mix(in srgb, var(--color-text) 52%, transparent)',
              }}
            >
              No company matches “{query}”
            </li>
          ) : (
            matches.map((c, i) => {
              const isSelected = String(c.id) === value;
              return (
                <li key={c.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => choose(c)}
                    className="w-full flex items-center gap-2 text-left"
                    style={{
                      padding: '8px 10px',
                      border: 'none',
                      borderRadius: 8,
                      background:
                        i === highlight
                          ? 'color-mix(in srgb, var(--color-text) 7%, transparent)'
                          : 'transparent',
                      color: 'var(--color-text)',
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                    }}
                  >
                    <span className="flex-1 min-w-0 truncate">{c.companyName}</span>
                    <span
                      className="tnum flex-none"
                      style={{
                        fontSize: 11,
                        color: 'color-mix(in srgb, var(--color-text) 48%, transparent)',
                      }}
                    >
                      #{c.id}
                    </span>
                    {isSelected && (
                      <Check className="ic w-3.5 h-3.5 flex-none" style={{ color: 'var(--color-accent)' }} />
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
