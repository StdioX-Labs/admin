'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEventApi, companyApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Ticket,
  Calendar,
  MapPin,
  Tag,
  Link as LinkIcon,
  Loader2,
  Building2,
  Search,
  Upload,
  X,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
  };
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Step indicators ──────────────────────────────────────────────────────────

function Steps({ current }: { current: number }) {
  const steps = ['Event Details', 'Tickets', 'Review'];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={idx} className="flex items-center gap-2">
            {i > 0 && <div className={`h-px w-8 flex-shrink-0 ${done ? 'bg-foreground/40' : 'bg-border'}`} />}
            <div className="flex items-center gap-1.5">
              <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0
                ${done ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  active ? 'bg-foreground text-background' :
                  'bg-accent text-muted-foreground border border-border'}`}>
                {done ? <CheckCircle2 className="h-3 w-3" /> : idx}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${active ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successEventId, setSuccessEventId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [companyLookupLoading, setCompanyLookupLoading] = useState(false);
  const [companyLookupError, setCompanyLookupError] = useState('');
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

  // ── Form helpers ──────────────────────────────────────────────────────────

  const setField = (key: keyof EventForm, value: string) => {
    setForm(f => {
      const next = { ...f, [key]: value };
      if (key === 'eventName' && !f.slug) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const setTicketField = (idx: number, key: keyof TicketForm, value: string | boolean) => {
    setTickets(prev => prev.map((t, i) => i !== idx ? t : { ...t, [key]: value }));
  };

  const addTicket = () => setTickets(prev => [...prev, emptyTicket()]);
  const removeTicket = (idx: number) => setTickets(prev => prev.filter((_, i) => i !== idx));

  // ── Company lookup ────────────────────────────────────────────────────────

  const lookupCompany = async () => {
    const id = form.companyId.trim();
    if (!id || isNaN(Number(id))) {
      setCompanyLookupError('Enter a valid numeric company ID');
      return;
    }
    setCompanyLookupLoading(true);
    setCompanyLookupError('');
    setCompanyName('');
    try {
      const resp = await companyApi.getById(id);
      if (resp.status && resp.company?.companyName) {
        setCompanyName(resp.company.companyName);
      } else {
        setCompanyLookupError(resp.message || 'Company not found');
      }
    } catch {
      setCompanyLookupError('Failed to look up company');
    } finally {
      setCompanyLookupLoading(false);
    }
  };

  // ── Poster upload ─────────────────────────────────────────────────────────

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

  // ── Validation ────────────────────────────────────────────────────────────

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
    if (!t.isFree && (!t.ticketPrice || isNaN(Number(t.ticketPrice)))) step2Errors.push(`Ticket ${i + 1}: price is required`);
    if (!t.quantityAvailable || isNaN(Number(t.quantityAvailable))) step2Errors.push(`Ticket ${i + 1}: quantity is required`);
  });

  // ── Submit ────────────────────────────────────────────────────────────────

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
        users: { id: 0 },
        company: { id: companyIdNum },
        slug: form.slug.trim(),
        currency: form.currency,
      });

      if (!eventResp.status) {
        throw new Error(eventResp.message || 'Failed to create event');
      }

      const eventId = eventResp.event_id ?? eventResp.event?.id;
      if (!eventId) throw new Error('Event created but ID not returned');

      for (const t of tickets) {
        const qty = parseInt(t.quantityAvailable) || 0;
        const ticketResp = await createEventApi.createTicket({
          event: { id: eventId },
          ticketName: t.ticketName.trim(),
          ticketPrice: t.isFree ? 0 : parseFloat(t.ticketPrice) || 0,
          quantityAvailable: qty,
          ticketsToIssue: parseInt(t.ticketsToIssue) || qty,
          ticketLimitPerPerson: parseInt(t.ticketLimitPerPerson) || 1,
          numberOfComplementary: parseInt(t.numberOfComplementary) || 0,
          ticketSaleStartDate: toIso(t.ticketSaleStartDate || form.ticketSaleStartDate),
          ticketSaleEndDate: toIso(t.ticketSaleEndDate || form.ticketSaleEndDate),
          isFree: t.isFree,
        });
        if (!ticketResp.status) {
          throw new Error(`Ticket "${t.ticketName}" failed: ${ticketResp.message}`);
        }
      }

      setSuccessEventId(eventId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────

  if (successEventId) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-7 w-7 text-emerald-400" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Event created!</h2>
        <p className="text-sm text-muted-foreground">
          Event ID <span className="font-mono text-foreground">#{successEventId}</span> for{' '}
          <span className="text-foreground font-medium">{companyName || `Company #${form.companyId}`}</span>{' '}
          with {tickets.length} ticket type{tickets.length !== 1 ? 's' : ''} has been created successfully.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" className="border-border bg-transparent text-xs" onClick={() => router.push('/dashboard/events')}>
            View all events
          </Button>
          <Button size="sm" className="text-xs" onClick={() => {
            setSuccessEventId(null);
            setStep(1);
            setCompanyName('');
            setForm({ eventName: '', eventDescription: '', eventPosterUrl: '', eventCategoryId: '', eventLocation: '', eventStartDate: '', eventEndDate: '', ticketSaleStartDate: '', ticketSaleEndDate: '', percentageCommission: '5', currency: 'KES', slug: '', companyId: '' });
            setTickets([emptyTicket()]);
          }}>
            Create another
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 1: Event Details ──────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-4">
      {/* Company selector */}
      <div className="rounded-lg border border-border bg-background/50 p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</p>
        <div className="flex items-end gap-2">
          <Field label="Company ID" required>
            <div className="relative">
              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
              <Input
                type="number"
                value={form.companyId}
                onChange={e => { setField('companyId', e.target.value); setCompanyName(''); setCompanyLookupError(''); }}
                placeholder="Enter company ID"
                className="h-9 text-sm border-border bg-background pl-8 w-48"
              />
            </div>
          </Field>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={lookupCompany}
            disabled={companyLookupLoading || !form.companyId.trim()}
            className="h-9 border-border bg-transparent text-xs gap-1.5 flex-shrink-0"
          >
            {companyLookupLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
            Lookup
          </Button>
        </div>
        {companyName && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-500/5 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-xs text-emerald-400 font-medium">{companyName}</span>
            <span className="text-[10px] text-muted-foreground/50 font-mono ml-auto">#{form.companyId}</span>
          </div>
        )}
        {companyLookupError && (
          <p className="text-xs text-destructive flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />{companyLookupError}
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Event Name" required>
          <Input
            value={form.eventName}
            onChange={e => setField('eventName', e.target.value)}
            placeholder="e.g. Nairobi Jazz Night"
            className="h-9 text-sm border-border bg-background"
          />
        </Field>
        <Field label="Category" required>
          <select
            value={form.eventCategoryId}
            onChange={e => setField('eventCategoryId', e.target.value)}
            className="w-full h-9 text-sm rounded-md border border-border bg-background px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Select category</option>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Description" required>
        <textarea
          value={form.eventDescription}
          onChange={e => setField('eventDescription', e.target.value)}
          placeholder="Describe your event..."
          rows={3}
          className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </Field>

      <Field label="Location" required>
        <div className="relative">
          <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
          <Input
            value={form.eventLocation}
            onChange={e => setField('eventLocation', e.target.value)}
            placeholder="e.g. KICC, Nairobi"
            className="h-9 text-sm border-border bg-background pl-8"
          />
        </div>
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Event Start Date & Time" required>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
            <Input
              type="datetime-local"
              value={form.eventStartDate}
              onChange={e => setField('eventStartDate', e.target.value)}
              className="h-9 text-sm border-border bg-background pl-8"
            />
          </div>
        </Field>
        <Field label="Event End Date & Time" required>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
            <Input
              type="datetime-local"
              value={form.eventEndDate}
              onChange={e => setField('eventEndDate', e.target.value)}
              className="h-9 text-sm border-border bg-background pl-8"
            />
          </div>
        </Field>
        <Field label="Ticket Sale Start" required>
          <Input
            type="datetime-local"
            value={form.ticketSaleStartDate}
            onChange={e => setField('ticketSaleStartDate', e.target.value)}
            className="h-9 text-sm border-border bg-background"
          />
        </Field>
        <Field label="Ticket Sale End" required>
          <Input
            type="datetime-local"
            value={form.ticketSaleEndDate}
            onChange={e => setField('ticketSaleEndDate', e.target.value)}
            className="h-9 text-sm border-border bg-background"
          />
        </Field>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Commission %" required>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={form.percentageCommission}
            onChange={e => setField('percentageCommission', e.target.value)}
            className="h-9 text-sm border-border bg-background"
          />
        </Field>
        <Field label="Currency" required>
          <select
            value={form.currency}
            onChange={e => setField('currency', e.target.value)}
            className="w-full h-9 text-sm rounded-md border border-border bg-background px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="URL Slug" required>
          <div className="relative">
            <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
            <Input
              value={form.slug}
              onChange={e => setField('slug', slugify(e.target.value))}
              placeholder="my-event-name"
              className="h-9 text-sm border-border bg-background pl-8 font-mono"
            />
          </div>
        </Field>
      </div>

      <Field label="Poster Image">
        <div className="space-y-2">
          {/* File upload area */}
          <label className={`flex flex-col items-center justify-center gap-2 h-24 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
            isUploading ? 'border-border bg-accent/20 pointer-events-none' : 'border-border hover:border-foreground/30 hover:bg-accent/20'
          }`}>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              className="sr-only"
              disabled={isUploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePosterUpload(f); e.target.value = ''; }}
            />
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 text-muted-foreground/50" />
                <span className="text-xs text-muted-foreground/70">Click to upload poster <span className="text-muted-foreground/40">· JPEG, PNG, WebP · max 10MB</span></span>
              </>
            )}
          </label>

          {/* URL fallback */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
              <Input
                value={form.eventPosterUrl}
                onChange={e => { setField('eventPosterUrl', e.target.value); setUploadError(''); }}
                placeholder="or paste image URL"
                className="h-9 text-sm border-border bg-background pl-8"
              />
            </div>
            {form.eventPosterUrl && (
              <button type="button" onClick={() => setField('eventPosterUrl', '')} className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {uploadError && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />{uploadError}
            </p>
          )}

          {form.eventPosterUrl && (
            <div className="rounded-md overflow-hidden border border-border w-32 h-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.eventPosterUrl} alt="poster preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}
        </div>
      </Field>
    </div>
  );

  // ── Step 2: Tickets ────────────────────────────────────────────────────────

  const renderStep2 = () => (
    <div className="space-y-4">
      {tickets.map((t, idx) => (
        <div key={t.key} className="rounded-lg border border-border bg-background/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="text-xs font-semibold text-foreground">Ticket Type {idx + 1}</span>
            </div>
            {tickets.length > 1 && (
              <button
                onClick={() => removeTicket(idx)}
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Ticket Name" required>
              <Input
                value={t.ticketName}
                onChange={e => setTicketField(idx, 'ticketName', e.target.value)}
                placeholder="e.g. VIP, General, Early Bird"
                className="h-9 text-sm border-border bg-background"
              />
            </Field>
            <Field label="Price">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={t.isFree ? '' : t.ticketPrice}
                  onChange={e => setTicketField(idx, 'ticketPrice', e.target.value)}
                  placeholder={t.isFree ? 'Free' : '0.00'}
                  disabled={t.isFree}
                  className="h-9 text-sm border-border bg-background disabled:opacity-40"
                />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={t.isFree}
                    onChange={e => {
                      setTicketField(idx, 'isFree', e.target.checked);
                      if (e.target.checked) setTicketField(idx, 'ticketPrice', '0');
                    }}
                    className="rounded border-border"
                  />
                  Free
                </label>
              </div>
            </Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Quantity Available" required>
              <Input
                type="number"
                min="1"
                value={t.quantityAvailable}
                onChange={e => setTicketField(idx, 'quantityAvailable', e.target.value)}
                placeholder="100"
                className="h-9 text-sm border-border bg-background"
              />
            </Field>
            <Field label="Tickets to Issue">
              <Input
                type="number"
                min="0"
                value={t.ticketsToIssue}
                onChange={e => setTicketField(idx, 'ticketsToIssue', e.target.value)}
                placeholder="Same as quantity"
                className="h-9 text-sm border-border bg-background"
              />
            </Field>
            <Field label="Limit per Person">
              <Input
                type="number"
                min="1"
                value={t.ticketLimitPerPerson}
                onChange={e => setTicketField(idx, 'ticketLimitPerPerson', e.target.value)}
                className="h-9 text-sm border-border bg-background"
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Complementary Tickets">
              <Input
                type="number"
                min="0"
                value={t.numberOfComplementary}
                onChange={e => setTicketField(idx, 'numberOfComplementary', e.target.value)}
                className="h-9 text-sm border-border bg-background"
              />
            </Field>
            <Field label="Sale Start">
              <Input
                type="datetime-local"
                value={t.ticketSaleStartDate || form.ticketSaleStartDate}
                onChange={e => setTicketField(idx, 'ticketSaleStartDate', e.target.value)}
                className="h-9 text-sm border-border bg-background"
              />
            </Field>
            <Field label="Sale End">
              <Input
                type="datetime-local"
                value={t.ticketSaleEndDate || form.ticketSaleEndDate}
                onChange={e => setTicketField(idx, 'ticketSaleEndDate', e.target.value)}
                className="h-9 text-sm border-border bg-background"
              />
            </Field>
          </div>
        </div>
      ))}

      <button
        onClick={addTicket}
        className="w-full h-10 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-accent/30 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-3.5 w-3.5" />
        Add ticket type
      </button>
    </div>
  );

  // ── Step 3: Review ─────────────────────────────────────────────────────────

  const renderStep3 = () => {
    const cat = CATEGORIES.find(c => c.id === parseInt(form.eventCategoryId));
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-background/30 p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-xs text-muted-foreground">
              {companyName ? (
                <><span className="text-foreground font-medium">{companyName}</span> <span className="text-muted-foreground/40 font-mono">#{form.companyId}</span></>
              ) : (
                <span className="font-mono text-foreground">Company #{form.companyId}</span>
              )}
            </span>
          </div>
          <div className="flex items-start gap-3">
            {form.eventPosterUrl && (
              <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.eventPosterUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">{form.eventName}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{form.eventDescription}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70"><MapPin className="h-2.5 w-2.5" />{form.eventLocation}</span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70"><Tag className="h-2.5 w-2.5" />{cat?.label}</span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70"><Calendar className="h-2.5 w-2.5" />{form.eventStartDate?.replace('T', ' ')}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
            <div>
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Commission</p>
              <p className="text-xs font-medium text-foreground mt-0.5">{form.percentageCommission}%</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Currency</p>
              <p className="text-xs font-medium text-foreground mt-0.5">{form.currency}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Slug</p>
              <p className="text-xs font-mono text-foreground mt-0.5 truncate">{form.slug}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tickets.length} Ticket Type{tickets.length !== 1 ? 's' : ''}</p>
          {tickets.map((t, i) => {
            const qty = parseInt(t.quantityAvailable) || 0;
            const price = t.isFree ? 0 : parseFloat(t.ticketPrice) || 0;
            return (
              <div key={t.key} className="rounded-lg border border-border bg-background/30 px-3 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">{t.ticketName || `Ticket ${i + 1}`}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                    {qty} tickets · limit {t.ticketLimitPerPerson}/person
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {t.isFree ? 'Free' : `${form.currency} ${price.toLocaleString()}`}
                </p>
              </div>
            );
          })}
        </div>

        {submitError && (
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 py-2.5">
            <AlertDescription className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
              <span className="text-sm text-destructive">{submitError}</span>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  // ── Navigation ────────────────────────────────────────────────────────────

  const canNext = step === 1 ? step1Errors.length === 0 : step === 2 ? step2Errors.length === 0 : true;
  const currentErrors = step === 1 ? step1Errors : step === 2 ? step2Errors : [];

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Create Event</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Fill in the event details and add ticket types</p>
      </div>

      <Steps current={step} />

      <div className="rounded-xl border border-border bg-card p-5">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {/* Validation hints */}
      {currentErrors.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 space-y-0.5">
          {currentErrors.slice(0, 3).map((e, i) => (
            <p key={i} className="text-xs text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />{e}
            </p>
          ))}
          {currentErrors.length > 3 && (
            <p className="text-xs text-amber-400/70">+{currentErrors.length - 3} more</p>
          )}
        </div>
      )}

      {/* Nav buttons */}
      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard/events')}
          className="border-border bg-transparent text-xs gap-1.5"
        >
          <ChevronLeft className="h-3 w-3" />
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>

        {step < 3 ? (
          <Button
            size="sm"
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext}
            className="text-xs gap-1.5"
          >
            Continue
            <ChevronRight className="h-3 w-3" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="text-xs gap-1.5 min-w-[120px]"
          >
            {isSubmitting ? (
              <><Loader2 className="h-3 w-3 animate-spin" />Creating...</>
            ) : (
              <>Create Event<CheckCircle2 className="h-3 w-3" /></>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
