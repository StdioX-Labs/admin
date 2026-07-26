'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEventApi, companyApi } from '@/lib/api';
import {
  Building2,
  Search,
  MapPin,
  ExternalLink,
  Ticket,
  Plus,
  X,
  Upload,
  Loader2,
  Check,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { Card, Toggle, money } from '@/components/ui/soa';
import { DateTimePicker, Field } from '@/components/ui/date-time-picker';
import {
  MAX_TICKETS_TO_ISSUE,
  clampTicketsToIssue,
  validateTicketsToIssue,
} from '@/lib/ticket-limits';

const CATEGORIES = [
  { id: 1, label: 'Music' },
  { id: 2, label: 'Sports' },
  { id: 3, label: 'Arts & Culture' },
  { id: 4, label: 'Comedy' },
  { id: 5, label: 'Food & Drink' },
  { id: 6, label: 'Business' },
  { id: 7, label: 'Technology' },
  { id: 8, label: 'Charity' },
  { id: 9, label: 'Other' },
];

const CURRENCIES = ['KES', 'USD', 'UGX', 'TZS', 'RWF', 'ZAR', 'GHS', 'NGN', 'MWK', 'AUD', 'CAD'];

interface TicketForm {
  key: string;
  ticketName: string;
  ticketPrice: string;
  quantityAvailable: string;
  ticketsToIssue: string;
  ticketLimitPerPerson: string;
  numberOfComplementary: string;
  ticketSaleStartDate: string;
  ticketSaleEndDate: string;
  isFree: boolean;
  sms: string;
  email: string;
}

interface EventForm {
  eventName: string;
  eventDescription: string;
  eventPosterUrl: string;
  eventCategoryId: string;
  eventLocation: string;
  eventStartDate: string;
  eventEndDate: string;
  ticketSaleStartDate: string;
  ticketSaleEndDate: string;
  percentageCommission: string;
  currency: string;
  slug: string;
  companyId: string;
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toIso(local: string) {
  if (!local) return '';
  return new Date(local).toISOString();
}

function emptyTicket(): TicketForm {
  return {
    key: Math.random().toString(36).slice(2),
    ticketName: '',
    ticketPrice: '',
    quantityAvailable: '',
    ticketsToIssue: '',
    ticketLimitPerPerson: '1',
    numberOfComplementary: '0',
    ticketSaleStartDate: '',
    ticketSaleEndDate: '',
    isFree: false,
    sms: '',
    email: '',
  };
}

function Steps({ current }: { current: number }) {
  const labels = ['Event details', 'Tickets', 'Review'];
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={label} className="flex items-center gap-2.5">
            {i > 0 && (
              <span
                style={{
                  height: 1,
                  width: 26,
                  background: done ? 'var(--color-accent-2-300)' : 'var(--color-divider)',
                }}
              />
            )}
            <span className="inline-flex items-center gap-2">
              <span
                className="grid place-items-center flex-none"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--font-body)',
                  background: done
                    ? 'var(--tint-olive-bg)'
                    : active
                      ? 'var(--color-accent)'
                      : 'var(--color-surface)',
                  color: done ? 'var(--tint-olive-strong)' : active ? '#fff' : 'var(--color-text)',
                  border: done || active ? 'none' : '1px solid var(--color-divider)',
                }}
              >
                {done ? <Check className="ic w-3 h-3" /> : n}
              </span>
              <span
                className="hidden sm:block"
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: active
                    ? 'var(--color-text)'
                    : 'color-mix(in srgb, var(--color-text) 55%, transparent)',
                }}
              >
                {label}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function CreateEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successEventId, setSuccessEventId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [form, setForm] = useState<EventForm>({
    eventName: '',
    eventDescription: '',
    eventPosterUrl: '',
    eventCategoryId: '',
    eventLocation: '',
    eventStartDate: '',
    eventEndDate: '',
    ticketSaleStartDate: '',
    ticketSaleEndDate: '',
    percentageCommission: '5',
    currency: 'KES',
    slug: '',
    companyId: '',
  });

  const [tickets, setTickets] = useState<TicketForm[]>([emptyTicket()]);

  const setField = (key: keyof EventForm, value: string) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'eventName' && !f.slug) next.slug = slugify(value);
      return next;
    });
  };

  const setTicketField = (idx: number, key: keyof TicketForm, value: string | boolean) => {
    setTickets((prev) => prev.map((t, i) => (i !== idx ? t : { ...t, [key]: value })));
  };

  const lookupCompany = async () => {
    const id = form.companyId.trim();
    if (!id || isNaN(Number(id))) {
      setLookupError('Enter a valid numeric company ID');
      return;
    }
    setLookupLoading(true);
    setLookupError('');
    setCompanyName('');
    try {
      const resp = await companyApi.getById(id);
      if (resp.status && resp.company?.companyName) setCompanyName(resp.company.companyName);
      else setLookupError(resp.message || 'Company not found');
    } catch {
      setLookupError('Failed to look up company');
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePosterUpload = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Invalid file type. Use JPEG, PNG, GIF, or WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File too large. Maximum size is 10MB.');
      return;
    }
    setIsUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const resp = await fetch('/api/upload-image', { method: 'POST', body: fd });
      const data = await resp.json();
      if (!resp.ok || !data.success) throw new Error(data.error || 'Upload failed');
      setField('eventPosterUrl', data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // ── validation ──────────────────────────────────────────────────────────
  const step1Errors: string[] = [];
  if (!form.companyId.trim() || isNaN(Number(form.companyId))) step1Errors.push('Company ID is required');
  if (!form.eventName.trim()) step1Errors.push('Event name is required');
  if (!form.eventDescription.trim()) step1Errors.push('Description is required');
  if (!form.eventCategoryId) step1Errors.push('Category is required');
  if (!form.eventLocation.trim()) step1Errors.push('Location is required');
  if (!form.eventStartDate) step1Errors.push('Event start date is required');
  if (!form.eventEndDate) step1Errors.push('Event end date is required');
  if (!form.ticketSaleStartDate) step1Errors.push('Ticket sale start date is required');
  if (!form.ticketSaleEndDate) step1Errors.push('Ticket sale end date is required');
  if (!form.slug.trim()) step1Errors.push('Slug is required');

  const step2Errors: string[] = [];
  if (tickets.length === 0) step2Errors.push('At least one ticket type is required');
  tickets.forEach((t, i) => {
    if (!t.ticketName.trim()) step2Errors.push(`Ticket ${i + 1}: name is required`);
    if (!t.isFree && (!t.ticketPrice || isNaN(Number(t.ticketPrice))))
      step2Errors.push(`Ticket ${i + 1}: price is required`);
    if (!t.quantityAvailable || isNaN(Number(t.quantityAvailable)))
      step2Errors.push(`Ticket ${i + 1}: quantity is required`);
    const issueError = validateTicketsToIssue(
      t.ticketsToIssue,
      parseInt(t.quantityAvailable) || 0,
      `Ticket ${i + 1}`
    );
    if (issueError) step2Errors.push(issueError);
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const catId = parseInt(form.eventCategoryId);
      const commission = parseFloat(form.percentageCommission) || 5;
      const companyIdNum = parseInt(form.companyId);

      const eventResp = await createEventApi.createEvent({
        eventName: form.eventName.trim(),
        eventDescription: form.eventDescription.trim(),
        eventPosterUrl: form.eventPosterUrl.trim(),
        eventCategory: { id: catId },
        ticketSaleStartDate: toIso(form.ticketSaleStartDate),
        ticketSaleEndDate: toIso(form.ticketSaleEndDate),
        eventLocation: form.eventLocation.trim(),
        eventStartDate: toIso(form.eventStartDate),
        eventEndDate: toIso(form.eventEndDate),
        percentageComission: commission,
        company: { id: companyIdNum },
        slug: form.slug.trim(),
        currency: form.currency,
      });

      if (!eventResp.status) throw new Error(eventResp.message || 'Failed to create event');

      const eventId = eventResp.event_id ?? eventResp.event?.id;
      if (!eventId) throw new Error('Event created but ID not returned');

      for (const t of tickets) {
        const qty = parseInt(t.quantityAvailable) || 0;
        const ticketResp = await createEventApi.createTicket({
          event: { id: eventId },
          ticketName: t.ticketName.trim(),
          ticketPrice: t.isFree ? 0 : parseFloat(t.ticketPrice) || 0,
          quantityAvailable: qty,
          ticketsToIssue: clampTicketsToIssue(t.ticketsToIssue, qty),
          ticketLimitPerPerson: parseInt(t.ticketLimitPerPerson) || 0,
          numberOfComplementary: parseInt(t.numberOfComplementary) || 0,
          ticketSaleStartDate: toIso(t.ticketSaleStartDate || form.ticketSaleStartDate),
          ticketSaleEndDate: toIso(t.ticketSaleEndDate || form.ticketSaleEndDate),
          isFree: t.isFree,
          smsPurchaseMessageTemplate: t.sms || undefined,
          emailPurchaseMessageTemplate: t.email || undefined,
        });
        if (!ticketResp.status) throw new Error(`Ticket "${t.ticketName}" failed: ${ticketResp.message}`);
      }

      setSuccessEventId(eventId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── success ─────────────────────────────────────────────────────────────
  if (successEventId) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center flex flex-col items-center gap-4 animate-soa-fade">
        <div
          className="grid place-items-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            background: 'var(--tint-olive-bg)',
            color: 'var(--tint-olive-strong)',
          }}
        >
          <CheckCircle2 className="ic w-7 h-7" />
        </div>
        <h2 className="m-0" style={{ fontSize: 20 }}>
          Event created
        </h2>
        <p className="m-0 text-sm text-muted-foreground">
          Event <span className="tnum font-semibold text-foreground">#{successEventId}</span> for{' '}
          <span className="font-semibold text-foreground">
            {companyName || `Company #${form.companyId}`}
          </span>{' '}
          with {tickets.length} ticket type{tickets.length === 1 ? '' : 's'} is ready.
        </p>
        <div className="flex justify-center gap-2 pt-1">
          <button
            onClick={() => router.push('/dashboard/events')}
            style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              padding: '9px 16px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-divider)',
              background: 'transparent',
            }}
          >
            View all events
          </button>
          <button
            onClick={() => {
              setSuccessEventId(null);
              setStep(1);
              setCompanyName('');
              setForm({
                eventName: '',
                eventDescription: '',
                eventPosterUrl: '',
                eventCategoryId: '',
                eventLocation: '',
                eventStartDate: '',
                eventEndDate: '',
                ticketSaleStartDate: '',
                ticketSaleEndDate: '',
                percentageCommission: '5',
                currency: 'KES',
                slug: '',
                companyId: '',
              });
              setTickets([emptyTicket()]);
            }}
            style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              padding: '9px 16px',
              borderRadius: 'var(--radius-control)',
              border: 'none',
              background: 'var(--color-accent)',
              color: '#fff',
            }}
          >
            Create another
          </button>
        </div>
      </div>
    );
  }

  const currentErrors = step === 1 ? step1Errors : step === 2 ? step2Errors : [];
  const canContinue = currentErrors.length === 0;
  const cat = CATEGORIES.find((c) => c.id === parseInt(form.eventCategoryId));

  return (
    <div className="max-w-[780px] mx-auto flex flex-col gap-4 animate-soa-fade pb-6">
      <Steps current={step} />

      <Card padded={false} style={{ padding: '20px 22px' }}>
        {/* ── Step 1 ───────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-soa-fade-fast">
            <div
              style={{
                border: '1px solid var(--color-divider)',
                borderRadius: 12,
                padding: '14px 15px',
                background: 'var(--color-surface)',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  marginBottom: 10,
                  color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
                }}
              >
                Organizing company
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Field label="Company ID" required>
                    <div className="relative">
                      <Building2
                        className="ic absolute w-[15px] h-[15px] pointer-events-none"
                        style={{
                          left: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'color-mix(in srgb, var(--color-text) 42%, transparent)',
                        }}
                      />
                      <input
                        className="soa-input"
                        inputMode="numeric"
                        value={form.companyId}
                        onChange={(e) => {
                          setField('companyId', e.target.value);
                          setCompanyName('');
                          setLookupError('');
                        }}
                        placeholder="e.g. 12"
                        style={{ paddingLeft: 36, background: 'var(--color-neutral-100)' }}
                      />
                    </div>
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={lookupCompany}
                  disabled={lookupLoading || !form.companyId.trim()}
                  className="flex items-center gap-1.5 flex-none disabled:opacity-50"
                  style={{
                    height: 36,
                    padding: '0 15px',
                    borderRadius: 'var(--radius-control)',
                    border: '1px solid var(--color-divider)',
                    background: 'var(--color-neutral-100)',
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {lookupLoading ? (
                    <Loader2 className="ic w-[15px] h-[15px] animate-spin" />
                  ) : (
                    <Search className="ic w-[15px] h-[15px]" />
                  )}
                  Lookup
                </button>
              </div>
              {companyName && (
                <div
                  className="flex items-center gap-2 mt-2.5"
                  style={{
                    padding: '8px 11px',
                    borderRadius: 9,
                    background: 'var(--tint-olive-bg)',
                  }}
                >
                  <CheckCircle2
                    className="ic w-[15px] h-[15px]"
                    style={{ color: 'var(--tint-olive-strong)' }}
                  />
                  <span
                    style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tint-olive-fg)' }}
                  >
                    {companyName}
                  </span>
                </div>
              )}
              {lookupError && (
                <div
                  className="flex items-center gap-1.5 mt-2.5"
                  style={{ fontSize: 12, color: 'var(--tint-danger-fg)' }}
                >
                  <XCircle className="ic w-3.5 h-3.5" />
                  {lookupError}
                </div>
              )}
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))' }}>
              <Field label="Event name" required>
                <input
                  className="soa-input"
                  value={form.eventName}
                  onChange={(e) => setField('eventName', e.target.value)}
                  placeholder="e.g. Nairobi Jazz Festival"
                />
              </Field>
              <Field label="Category" required>
                <select
                  className="soa-input"
                  value={form.eventCategoryId}
                  onChange={(e) => setField('eventCategoryId', e.target.value)}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Description" required>
              <textarea
                className="soa-input"
                rows={4}
                value={form.eventDescription}
                onChange={(e) => setField('eventDescription', e.target.value)}
                placeholder="Tell attendees what to expect…"
                style={{ minHeight: 88 }}
              />
            </Field>

            <Field label="Location" required>
              <div className="relative">
                <MapPin
                  className="ic absolute w-[15px] h-[15px] pointer-events-none"
                  style={{
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'color-mix(in srgb, var(--color-text) 42%, transparent)',
                  }}
                />
                <input
                  className="soa-input"
                  value={form.eventLocation}
                  onChange={(e) => setField('eventLocation', e.target.value)}
                  placeholder="e.g. KICC, Nairobi"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </Field>

            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))' }}>
              <Field label="Event starts" required>
                <DateTimePicker value={form.eventStartDate} onChange={(v) => setField('eventStartDate', v)} />
              </Field>
              <Field label="Event ends" required>
                <DateTimePicker value={form.eventEndDate} onChange={(v) => setField('eventEndDate', v)} />
              </Field>
              <Field label="Ticket sales start" required>
                <DateTimePicker
                  value={form.ticketSaleStartDate}
                  onChange={(v) => setField('ticketSaleStartDate', v)}
                />
              </Field>
              <Field label="Ticket sales end" required>
                <DateTimePicker
                  value={form.ticketSaleEndDate}
                  onChange={(v) => setField('ticketSaleEndDate', v)}
                />
              </Field>
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))' }}>
              <Field label="Commission %">
                <input
                  className="soa-input tnum"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.percentageCommission}
                  onChange={(e) => setField('percentageCommission', e.target.value)}
                  placeholder="5"
                />
              </Field>
              <Field label="Currency">
                <select
                  className="soa-input"
                  value={form.currency}
                  onChange={(e) => setField('currency', e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="URL slug" required>
                <div className="relative">
                  <ExternalLink
                    className="ic absolute w-[15px] h-[15px] pointer-events-none"
                    style={{
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'color-mix(in srgb, var(--color-text) 42%, transparent)',
                    }}
                  />
                  <input
                    className="soa-input tnum"
                    value={form.slug}
                    onChange={(e) => setField('slug', slugify(e.target.value))}
                    placeholder="my-event"
                    style={{ paddingLeft: 36 }}
                  />
                </div>
              </Field>
            </div>

            <Field label="Event poster">
              <div className="flex gap-3.5 items-start flex-wrap">
                <label
                  className="grid place-items-center cursor-pointer flex-none"
                  style={{
                    width: 120,
                    height: 160,
                    borderRadius: 10,
                    border: '1px dashed var(--color-divider)',
                    background: form.eventPosterUrl
                      ? `url('${form.eventPosterUrl}') center/cover`
                      : 'var(--color-surface)',
                  }}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    className="sr-only"
                    disabled={isUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePosterUpload(f);
                      e.target.value = '';
                    }}
                  />
                  {isUploading ? (
                    <Loader2 className="ic w-5 h-5 animate-spin text-muted-foreground" />
                  ) : !form.eventPosterUrl ? (
                    <span className="flex flex-col items-center gap-1.5 text-muted-foreground">
                      <Upload className="ic w-5 h-5" />
                      <span style={{ fontSize: 11 }}>Drop poster</span>
                    </span>
                  ) : null}
                </label>
                <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                  <p
                    className="m-0"
                    style={{
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
                    }}
                  >
                    Portrait artwork works best (3:4).
                    <br />
                    JPEG, PNG or WebP · up to 10&nbsp;MB.
                  </p>
                  <div className="relative">
                    <input
                      className="soa-input"
                      value={form.eventPosterUrl}
                      onChange={(e) => {
                        setField('eventPosterUrl', e.target.value);
                        setUploadError('');
                      }}
                      placeholder="or paste an image URL"
                      style={{ paddingRight: 34 }}
                    />
                    {form.eventPosterUrl && (
                      <button
                        type="button"
                        onClick={() => setField('eventPosterUrl', '')}
                        aria-label="Clear poster"
                        className="grid place-items-center"
                        style={{
                          position: 'absolute',
                          right: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 22,
                          height: 22,
                          border: 'none',
                          background: 'transparent',
                          color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                        }}
                      >
                        <X className="ic w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {uploadError && (
                    <p
                      className="m-0 flex items-center gap-1.5"
                      style={{ fontSize: 12, color: 'var(--tint-danger-fg)' }}
                    >
                      <XCircle className="ic w-3.5 h-3.5" />
                      {uploadError}
                    </p>
                  )}
                </div>
              </div>
            </Field>
          </div>
        )}

        {/* ── Step 2 ───────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-3 animate-soa-fade-fast">
            {tickets.map((t, idx) => (
              <div
                key={t.key}
                style={{
                  border: '1px solid var(--color-divider)',
                  borderRadius: 12,
                  padding: '14px 15px',
                  background: 'var(--color-surface)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="inline-flex items-center gap-2"
                    style={{ fontSize: 13, fontWeight: 700 }}
                  >
                    <Ticket className="ic w-[15px] h-[15px]" style={{ color: 'var(--color-accent)' }} />
                    Ticket type {idx + 1}
                  </span>
                  {tickets.length > 1 && (
                    <button
                      onClick={() => setTickets((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label={`Remove ticket type ${idx + 1}`}
                      className="grid place-items-center"
                      style={{
                        width: 28,
                        height: 28,
                        border: 'none',
                        background: 'transparent',
                        borderRadius: 8,
                        color: 'var(--tint-danger-fg)',
                      }}
                    >
                      <X className="ic w-[15px] h-[15px]" />
                    </button>
                  )}
                </div>

                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))' }}>
                  <Field label="Ticket name" required>
                    <input
                      className="soa-input"
                      value={t.ticketName}
                      onChange={(e) => setTicketField(idx, 'ticketName', e.target.value)}
                      placeholder="e.g. VIP, Regular, Early Bird"
                      style={{ background: 'var(--color-neutral-100)' }}
                    />
                  </Field>
                  <Field label={`Price (${form.currency})`}>
                    <div className="flex items-center gap-2.5">
                      <input
                        className="soa-input tnum"
                        type="number"
                        min="0"
                        value={t.isFree ? '' : t.ticketPrice}
                        onChange={(e) => setTicketField(idx, 'ticketPrice', e.target.value)}
                        disabled={t.isFree}
                        placeholder={t.isFree ? 'Free' : '0'}
                        style={{ background: 'var(--color-neutral-100)' }}
                      />
                      <Toggle
                        checked={t.isFree}
                        onChange={(v) => {
                          setTicketField(idx, 'isFree', v);
                          if (v) setTicketField(idx, 'ticketPrice', '0');
                        }}
                        label="Free ticket"
                      />
                      <span
                        className="text-muted-foreground flex-none"
                        style={{ fontSize: 12 }}
                      >
                        Free
                      </span>
                    </div>
                  </Field>
                </div>

                <div
                  className="grid gap-3 mt-3"
                  style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))' }}
                >
                  <Field label="Quantity available" required>
                    <input
                      className="soa-input tnum"
                      type="number"
                      min="1"
                      value={t.quantityAvailable}
                      onChange={(e) => setTicketField(idx, 'quantityAvailable', e.target.value)}
                      placeholder="100"
                      style={{ background: 'var(--color-neutral-100)' }}
                    />
                  </Field>
                  <Field label="Tickets to issue">
                    <input
                      className="soa-input tnum"
                      type="number"
                      min="0"
                      max={MAX_TICKETS_TO_ISSUE}
                      value={t.ticketsToIssue}
                      onChange={(e) => setTicketField(idx, 'ticketsToIssue', e.target.value)}
                      placeholder="0"
                      style={{ background: 'var(--color-neutral-100)' }}
                    />
                    <div
                      style={{
                        fontSize: 10.5,
                        marginTop: 5,
                        color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                      }}
                    >
                      Pre-generated up front. Leave blank to issue none · max{' '}
                      {MAX_TICKETS_TO_ISSUE.toLocaleString()}
                    </div>
                  </Field>
                  <Field label="Limit per person">
                    <input
                      className="soa-input tnum"
                      type="number"
                      min="0"
                      value={t.ticketLimitPerPerson}
                      onChange={(e) => setTicketField(idx, 'ticketLimitPerPerson', e.target.value)}
                      style={{ background: 'var(--color-neutral-100)' }}
                    />
                  </Field>
                  <Field label="Complementary">
                    <input
                      className="soa-input tnum"
                      type="number"
                      min="0"
                      value={t.numberOfComplementary}
                      onChange={(e) => setTicketField(idx, 'numberOfComplementary', e.target.value)}
                      style={{ background: 'var(--color-neutral-100)' }}
                    />
                  </Field>
                </div>

                <div
                  className="grid gap-3 mt-3"
                  style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))' }}
                >
                  <Field label="Ticket sales start">
                    <DateTimePicker
                      value={t.ticketSaleStartDate || form.ticketSaleStartDate}
                      onChange={(v) => setTicketField(idx, 'ticketSaleStartDate', v)}
                    />
                  </Field>
                  <Field label="Ticket sales end">
                    <DateTimePicker
                      value={t.ticketSaleEndDate || form.ticketSaleEndDate}
                      onChange={(v) => setTicketField(idx, 'ticketSaleEndDate', v)}
                    />
                  </Field>
                </div>

                <div
                  className="mt-3.5 pt-3"
                  style={{ borderTop: '1px solid var(--color-divider)' }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      marginBottom: 10,
                      color: 'color-mix(in srgb, var(--color-text) 48%, transparent)',
                    }}
                  >
                    Notification templates
                  </div>
                  <Field label="SMS on purchase">
                    <textarea
                      className="soa-input"
                      rows={3}
                      value={t.sms}
                      onChange={(e) => setTicketField(idx, 'sms', e.target.value)}
                      placeholder="Hi {first_name}, your {ticket_name} ticket for {event_name} is confirmed. Access: {ticket_link}"
                      style={{ minHeight: 64, fontSize: 12.5, background: 'var(--color-neutral-100)' }}
                    />
                    <div
                      style={{
                        fontSize: 10.5,
                        marginTop: 5,
                        color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                      }}
                    >
                      Placeholders: {'{first_name}'} · {'{event_name}'} · {'{ticket_name}'} ·{' '}
                      {'{ticket_link}'}
                    </div>
                  </Field>
                  <div className="mt-3">
                    <Field label="Email on purchase">
                      <textarea
                        className="soa-input"
                        rows={4}
                        value={t.email}
                        onChange={(e) => setTicketField(idx, 'email', e.target.value)}
                        placeholder="Dear {first_name}, thank you for purchasing your {ticket_name} ticket for {event_name}. We look forward to seeing you!"
                        style={{ minHeight: 80, fontSize: 12.5, background: 'var(--color-neutral-100)' }}
                      />
                      <div
                        style={{
                          fontSize: 10.5,
                          marginTop: 5,
                          color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                        }}
                      >
                        Placeholders: {'{first_name}'} · {'{event_name}'} · {'{ticket_name}'}
                      </div>
                    </Field>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => setTickets((prev) => [...prev, emptyTicket()])}
              className="w-full flex items-center justify-center gap-2"
              style={{
                padding: 11,
                border: '1px dashed var(--color-divider)',
                borderRadius: 12,
                background: 'transparent',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--font-body)',
                color: 'var(--color-accent-700)',
              }}
            >
              <Plus className="ic w-4 h-4" />
              Add another ticket type
            </button>
          </div>
        )}

        {/* ── Step 3 ───────────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="flex flex-col gap-3.5 animate-soa-fade-fast">
            <div className="flex gap-3.5 items-start">
              <div
                className="flex-none"
                style={{
                  width: 76,
                  height: 100,
                  borderRadius: 9,
                  border: '1px solid var(--color-divider)',
                  background: form.eventPosterUrl
                    ? `url('${form.eventPosterUrl}') center/cover`
                    : 'var(--color-surface)',
                }}
              />
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.15 }}>
                  {form.eventName}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    marginTop: 4,
                    lineHeight: 1.5,
                    color: 'color-mix(in srgb, var(--color-text) 62%, transparent)',
                  }}
                >
                  {form.eventDescription}
                </div>
                <div className="flex flex-wrap gap-x-3.5 gap-y-1 mt-2">
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{
                      fontSize: 12,
                      color: 'color-mix(in srgb, var(--color-text) 58%, transparent)',
                    }}
                  >
                    <Building2 className="ic w-3 h-3" />
                    {companyName || `Company #${form.companyId}`}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{
                      fontSize: 12,
                      color: 'color-mix(in srgb, var(--color-text) 58%, transparent)',
                    }}
                  >
                    <MapPin className="ic w-3 h-3" />
                    {form.eventLocation}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{
                      fontSize: 12,
                      color: 'color-mix(in srgb, var(--color-text) 58%, transparent)',
                    }}
                  >
                    <Clock className="ic w-3 h-3" />
                    {cat?.label}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="grid grid-cols-3 gap-2.5 py-3"
              style={{
                borderTop: '1px solid var(--color-divider)',
                borderBottom: '1px solid var(--color-divider)',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 9.5,
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                  }}
                >
                  Commission
                </div>
                <div className="tnum" style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>
                  {form.percentageCommission}%
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 9.5,
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                  }}
                >
                  Currency
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{form.currency}</div>
              </div>
              <div className="min-w-0">
                <div
                  style={{
                    fontSize: 9.5,
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                  }}
                >
                  Slug
                </div>
                <div
                  className="tnum truncate"
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    marginTop: 3,
                    color: 'var(--color-accent-700)',
                  }}
                >
                  {form.slug}
                </div>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '.09em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  marginBottom: 8,
                  color: 'color-mix(in srgb, var(--color-text) 52%, transparent)',
                }}
              >
                {tickets.length} ticket type{tickets.length === 1 ? '' : 's'}
              </div>
              <div className="flex flex-col gap-2">
                {tickets.map((t, i) => {
                  const qty = parseInt(t.quantityAvailable) || 0;
                  const price = t.isFree ? 0 : parseFloat(t.ticketPrice) || 0;
                  return (
                    <div
                      key={t.key}
                      className="flex items-center justify-between gap-2.5"
                      style={{
                        padding: '11px 13px',
                        border: '1px solid var(--color-divider)',
                        borderRadius: 10,
                        background: 'var(--color-surface)',
                      }}
                    >
                      <div className="min-w-0">
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {t.ticketName || `Ticket ${i + 1}`}
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            marginTop: 1,
                            color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
                          }}
                        >
                          {qty} available · limit {t.ticketLimitPerPerson || 0}/person
                        </div>
                      </div>
                      <div className="tnum flex-none" style={{ fontSize: 14, fontWeight: 700 }}>
                        {t.isFree ? 'Free' : money(price)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {submitError && (
              <div
                className="flex items-center gap-2"
                style={{
                  border: '1px solid color-mix(in srgb, var(--tint-danger-strong) 35%, transparent)',
                  background: 'var(--tint-danger-bg)',
                  borderRadius: 12,
                  padding: '11px 14px',
                  fontSize: 12.5,
                  color: 'var(--tint-danger-fg)',
                }}
              >
                <XCircle className="ic w-4 h-4 flex-none" />
                {submitError}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Validation hints */}
      {currentErrors.length > 0 && (
        <div
          className="flex flex-col gap-1"
          style={{
            border: '1px solid #e8c9a0',
            background: '#fff6ec',
            borderRadius: 12,
            padding: '11px 14px',
          }}
        >
          {currentErrors.slice(0, 3).map((e) => (
            <div
              key={e}
              className="flex items-center gap-2"
              style={{ fontSize: 12, color: 'var(--color-accent-700)' }}
            >
              <Clock className="ic w-3 h-3 flex-none" />
              {e}
            </div>
          ))}
          {currentErrors.length > 3 && (
            <div
              style={{
                fontSize: 11.5,
                paddingLeft: 20,
                color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
              }}
            >
              +{currentErrors.length - 3} more
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => (step > 1 ? setStep((s) => s - 1) : router.push('/dashboard/events'))}
          className="flex items-center gap-1.5"
          style={{
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'var(--font-body)',
            padding: '9px 16px',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--color-divider)',
            background: 'var(--color-neutral-100)',
          }}
        >
          <ChevronLeft className="ic w-[15px] h-[15px]" />
          {step === 1 ? 'Cancel' : 'Back'}
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canContinue}
            className="flex items-center gap-1.5 disabled:opacity-45"
            style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              padding: '9px 18px',
              borderRadius: 'var(--radius-control)',
              border: 'none',
              background: 'var(--color-accent)',
              color: '#fff',
            }}
          >
            Continue
            <ChevronRight className="ic w-[15px] h-[15px]" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 disabled:opacity-45"
            style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
              padding: '9px 18px',
              borderRadius: 'var(--radius-control)',
              border: 'none',
              background: 'var(--color-accent)',
              color: '#fff',
              minWidth: 140,
              justifyContent: 'center',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="ic w-[15px] h-[15px] animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Check className="ic w-[15px] h-[15px]" />
                Create event
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
