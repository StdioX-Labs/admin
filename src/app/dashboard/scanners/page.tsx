'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Download, KeyRound, Power, RotateCcw, ScanLine, Search, UserPlus } from 'lucide-react';
import { Card, EmptyState, ErrorNote, Pill, SuccessNote, ago, dateShort, num, timeShort } from '@/components/ui/soa';
import {
  companyApi,
  scannersApi,
  type Checkin,
  type Company,
  type Scanner,
  type ScannerEvent,
} from '@/lib/api';
import { formatKenyanPhone, normalizeKenyanPhone } from '@/lib/phone';
import { useFlashMessage } from '@/components/events/event-actions';

/**
 * Door staff for the gate scanner app.
 *
 * A scanner is a phone number and password that signs in to the gate app, attached to one event
 * at a time. Moving them to another event here moves every phone they're signed in on; switching
 * them off or giving them a new password signs those phones out. Check-ins show who let each
 * ticket in, by name and number.
 */

const accentButton = {
  height: 34,
  padding: '0 16px',
  borderRadius: 'var(--radius-control)',
  border: 'none',
  background: 'var(--color-accent)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  fontFamily: 'var(--font-body)',
  boxShadow: 'var(--shadow-sm)',
} as const;

const quietButton = {
  height: 30,
  padding: '0 10px',
  borderRadius: 'var(--radius-control)',
  border: '1px solid color-mix(in srgb, var(--color-text) 14%, transparent)',
  background: 'transparent',
  color: 'var(--color-text)',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'var(--font-body)',
} as const;

const CHANNEL: Record<string, string> = { H: 'Live', B: 'Synced after outage', S: 'By SMS', L: 'Found by search' };

/** Easy to read out and type on a phone: no 0/O, 1/l/I. */
function newPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function errorText(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'data' in err) {
    const d = (err as { data?: { message?: string } }).data;
    if (d?.message) return d.message;
  }
  return err instanceof Error ? err.message : fallback;
}

export default function ScannersPage() {
  const flash = useFlashMessage(20000);
  const [error, setError] = useState('');

  // Company
  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company | null>(null);

  // Scanners and events of the chosen company
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [events, setEvents] = useState<ScannerEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  // New scanner form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(newPassword());
  const [eventId, setEventId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  // Check-ins
  const [checkinEvent, setCheckinEvent] = useState<string>('');
  const [checkins, setCheckins] = useState<Checkin[] | null>(null);
  const [loadingCheckins, setLoadingCheckins] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      companyApi
        .getAll(0, 20, search.trim() || undefined)
        .then((r) => setCompanies(r.data?.companies ?? []))
        .catch(() => setCompanies([]));
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async (c: Company) => {
    setLoading(true);
    setError('');
    try {
      const [s, e] = await Promise.all([scannersApi.list({ companyId: c.id }), scannersApi.events(c.id)]);
      setScanners(s.scanners ?? []);
      setEvents(e.events ?? []);
      setEventId((prev) => prev || (e.events?.[0] ? String(e.events[0].id) : ''));
      setCheckinEvent((prev) => prev || (e.events?.[0] ? String(e.events[0].id) : ''));
    } catch (err) {
      setError(errorText(err, 'Could not load scanners'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (company) void load(company);
  }, [company, load]);

  const eventName = useMemo(() => new Map(events.map((e) => [e.id, e.eventName])), [events]);

  async function create() {
    if (!company) return;
    const normalized = normalizeKenyanPhone(phone);
    if (!normalized) {
      setError('Enter the scanner’s phone number, like 0712 345 678.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const s = await scannersApi.create({
        companyId: company.id,
        name: name.trim(),
        phone: normalized,
        password,
        eventId: eventId ? Number(eventId) : null,
      });
      flash.show(
        `${s.name} can now sign in to the gate app with ${formatKenyanPhone(s.phone)} and password “${password}”` +
          (s.eventName ? `, scanning ${s.eventName}.` : '. Attach them to an event before they can scan.') +
          ' The app is at soldoutafrica.com/scanner (choose “Scanner login”).'
      );
      setName('');
      setPhone('');
      setPassword(newPassword());
      await load(company);
    } catch (err) {
      setError(errorText(err, 'Could not create the scanner'));
    } finally {
      setCreating(false);
    }
  }

  async function act(s: Scanner, fn: () => Promise<unknown>, done: string) {
    setBusyId(s.id);
    setError('');
    try {
      await fn();
      flash.show(done);
      if (company) await load(company);
    } catch (err) {
      setError(errorText(err, 'Could not update the scanner'));
    } finally {
      setBusyId(null);
    }
  }

  const reattach = (s: Scanner, value: string) => {
    const target = value ? Number(value) : null;
    const label = target ? eventName.get(target) ?? `event ${target}` : 'no event';
    return act(s, () => scannersApi.attach(s.id, target),
      target ? `${s.name} now scans ${label}. Their phones switch over within a minute.` : `${s.name} is no longer attached to an event.`);
  };

  const resetPassword = (s: Scanner) => {
    const pw = newPassword();
    if (!confirm(`Give ${s.name} a new password? Phones signed in with the old one are signed out.`)) return;
    return act(s, () => scannersApi.setPassword(s.id, pw), `${s.name}’s new password is “${pw}”. Their phones were signed out.`);
  };

  const toggle = (s: Scanner) => {
    if (s.active && !confirm(`Switch off ${s.name}? Their phones stop scanning straight away.`)) return;
    return act(s, () => scannersApi.setActive(s.id, !s.active), s.active ? `${s.name} is switched off.` : `${s.name} is switched on.`);
  };

  async function loadCheckins() {
    if (!checkinEvent) return;
    setLoadingCheckins(true);
    setError('');
    try {
      const r = await scannersApi.checkins(Number(checkinEvent));
      setCheckins(r.checkins ?? []);
    } catch (err) {
      setError(errorText(err, 'Could not load check-ins'));
    } finally {
      setLoadingCheckins(false);
    }
  }

  async function downloadCheckins() {
    if (!checkins?.length) return;
    const { saveBlob } = await import('@/lib/report-document');
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const rows = checkins.map((c) => [
      new Date(c.scannedAt).toLocaleString(),
      c.ticketName,
      c.barcode,
      c.orderCode,
      c.holderName ?? '',
      c.holderPhone ?? '',
      c.scannedByName ?? '',
      c.scannedByPhone ?? '',
      c.gate ?? '',
      CHANNEL[c.channel ?? ''] ?? '',
    ]);
    const csv = [
      ['Scanned at', 'Ticket', 'Barcode', 'Order', 'Holder', 'Holder phone', 'Scanned by', 'Scanned by phone', 'Gate', 'How'].join(','),
      ...rows.map((r) => r.map((v) => esc(String(v))).join(',')),
    ].join('\r\n');
    const label = (eventName.get(Number(checkinEvent)) ?? checkinEvent).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    saveBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `checkins-${label}.csv`);
  }

  const canCreate = company && name.trim().length >= 2 && phone.trim() && password.length >= 6 && !creating;

  return (
    <div className="flex flex-col gap-4">
      {/* Company */}
      <Card padded={false} className="flex-row flex-wrap items-center gap-2.5" style={{ padding: '13px 15px' }}>
        <div className="relative flex-1 min-w-[220px]">
          <Search className="ic absolute w-4 h-4 pointer-events-none"
            style={{ left: 14, top: '50%', transform: 'translateY(-50%)', color: 'color-mix(in srgb, var(--color-text) 42%, transparent)' }} />
          <input className="soa-input" style={{ paddingLeft: 40 }} placeholder="Find the organiser company…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="soa-input" style={{ maxWidth: 320 }} value={company?.id ?? ''} aria-label="Company"
          onChange={(e) => {
            const c = companies.find((x) => x.id === Number(e.target.value)) ?? null;
            setCompany(c);
            setScanners([]);
            setEvents([]);
            setEventId('');
            setCheckinEvent('');
            setCheckins(null);
          }}>
          <option value="">Choose a company</option>
          {company && !companies.some((c) => c.id === company.id) && <option value={company.id}>{company.companyName}</option>}
          {companies.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
        </select>
        {company && (
          <button onClick={() => load(company)} className="flex items-center gap-1.5" style={quietButton}>
            <RotateCcw className="ic w-3.5 h-3.5" /> Refresh
          </button>
        )}
      </Card>

      {flash.message && <SuccessNote message={flash.message} />}
      {error && <ErrorNote message={error} />}

      {!company && (
        <EmptyState icon={Building2} title="Choose a company" hint="Scanners belong to an organiser company and scan its events." />
      )}

      {company && (
        <>
          {/* New scanner */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="ic w-4 h-4" />
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Add a scanner</h2>
            </div>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))' }}>
              <input className="soa-input" placeholder="Name, e.g. Jane Wanjiku" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="soa-input" placeholder="Phone, e.g. 0712 345 678" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <div className="flex gap-2">
                <input className="soa-input flex-1" placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button onClick={() => setPassword(newPassword())} style={quietButton} title="Make a new password">New</button>
              </div>
              <select className="soa-input" value={eventId} onChange={(e) => setEventId(e.target.value)} aria-label="Event">
                <option value="">Not attached yet</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.eventName}{e.status !== 'ACTIVE' ? ` (${e.status.toLowerCase()})` : ''}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <button disabled={!canCreate} onClick={create} style={{ ...accentButton, opacity: canCreate ? 1 : 0.5 }}>
                {creating ? 'Creating…' : 'Create scanner'}
              </button>
              <span style={{ fontSize: 12.5, color: 'color-mix(in srgb, var(--color-text) 55%, transparent)' }}>
                They sign in on the gate app with this phone number and password.
              </span>
            </div>
          </Card>

          {/* Scanners */}
          <Card padded={false} className="overflow-hidden">
            <div className="flex items-center gap-2" style={{ padding: '14px 16px' }}>
              <ScanLine className="ic w-4 h-4" />
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Scanners at {company.companyName}</h2>
              <span style={{ fontSize: 12.5, opacity: 0.6 }}>{loading ? 'Loading…' : `${scanners.length}`}</span>
            </div>
            {scanners.length === 0 && !loading ? (
              <div style={{ padding: '0 16px 16px' }}>
                <EmptyState icon={ScanLine} title="No scanners yet" hint="Add one above, then give them the phone number and password." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="soa-table" style={{ minWidth: 820 }}>
                  <thead>
                    <tr>
                      <th>Scanner</th>
                      <th>Event (change to move them)</th>
                      <th>Phones</th>
                      <th>Let in</th>
                      <th>Last sign-in</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {scanners.map((s) => (
                      <tr key={s.id} style={{ opacity: busyId === s.id ? 0.5 : 1 }}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          <div className="tnum" style={{ fontSize: 12, opacity: 0.65 }}>{formatKenyanPhone(s.phone)}</div>
                        </td>
                        <td>
                          <select className="soa-input" style={{ height: 32, fontSize: 12.5, maxWidth: 260 }} value={s.eventId ?? ''}
                            disabled={busyId === s.id} onChange={(e) => reattach(s, e.target.value)} aria-label={`Event for ${s.name}`}>
                            <option value="">Not attached</option>
                            {s.eventId && !eventName.has(s.eventId) && <option value={s.eventId}>{s.eventName ?? `Event ${s.eventId}`} (over)</option>}
                            {events.map((e) => <option key={e.id} value={e.id}>{e.eventName}</option>)}
                          </select>
                        </td>
                        <td className="tnum">{num(s.phones)}</td>
                        <td className="tnum">{num(s.admitted)}</td>
                        <td style={{ fontSize: 12.5 }}>{s.lastLoginAt ? ago(s.lastLoginAt) : 'Never'}</td>
                        <td>
                          {s.active
                            ? <Pill bg="var(--tint-olive-bg)" fg="var(--tint-olive-fg)">Active</Pill>
                            : <Pill>Switched off</Pill>}
                        </td>
                        <td>
                          <div className="flex gap-1.5 justify-end">
                            <button style={quietButton} disabled={busyId === s.id} onClick={() => resetPassword(s)} title="New password">
                              <KeyRound className="ic w-3.5 h-3.5" />
                            </button>
                            <button style={quietButton} disabled={busyId === s.id} onClick={() => toggle(s)} title={s.active ? 'Switch off' : 'Switch on'}>
                              <Power className="ic w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Check-ins */}
          <Card>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Check-ins</h2>
              <select className="soa-input" style={{ maxWidth: 320 }} value={checkinEvent}
                onChange={(e) => { setCheckinEvent(e.target.value); setCheckins(null); }} aria-label="Event for check-ins">
                <option value="">Choose an event</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.eventName}</option>)}
              </select>
              <button style={accentButton} disabled={!checkinEvent || loadingCheckins} onClick={loadCheckins}>
                {loadingCheckins ? 'Loading…' : 'Show who scanned'}
              </button>
              {checkins && checkins.length > 0 && (
                <button style={quietButton} className="flex items-center gap-1.5" onClick={downloadCheckins}>
                  <Download className="ic w-3.5 h-3.5" /> CSV
                </button>
              )}
              {checkins && <span style={{ fontSize: 12.5, opacity: 0.6 }}>{num(checkins.length)} let in</span>}
            </div>
            {checkins && checkins.length === 0 && (
              <p style={{ fontSize: 13, opacity: 0.7, marginTop: 12 }}>Nobody has been scanned in at this event yet.</p>
            )}
            {checkins && checkins.length > 0 && (
              <div className="overflow-x-auto mt-3">
                <table className="soa-table" style={{ minWidth: 860 }}>
                  <thead>
                    <tr>
                      <th>Scanned</th>
                      <th>Ticket</th>
                      <th>Holder</th>
                      <th>Scanned by</th>
                      <th>Gate</th>
                      <th>How</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkins.slice(0, 500).map((c) => (
                      <tr key={c.ticketId}>
                        <td className="tnum" style={{ fontSize: 12.5 }}>{dateShort(c.scannedAt)} {timeShort(c.scannedAt)}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.ticketName}</div>
                          <div className="tnum" style={{ fontSize: 12, opacity: 0.65 }}>{c.barcode}</div>
                        </td>
                        <td>
                          <div>{c.holderName || '—'}</div>
                          {c.holderPhone && <div className="tnum" style={{ fontSize: 12, opacity: 0.65 }}>{formatKenyanPhone(c.holderPhone)}</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.scannedByName || '—'}</div>
                          {c.scannedByPhone && <div className="tnum" style={{ fontSize: 12, opacity: 0.65 }}>{formatKenyanPhone(c.scannedByPhone)}</div>}
                        </td>
                        <td>{c.gate || '—'}</td>
                        <td style={{ fontSize: 12.5 }}>{CHANNEL[c.channel ?? ''] ?? 'Older scanner'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {checkins.length > 500 && (
                  <p style={{ fontSize: 12.5, opacity: 0.6, marginTop: 8 }}>Showing the latest 500. The CSV has all {num(checkins.length)}.</p>
                )}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
