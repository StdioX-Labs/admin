'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { eventsApi, createEventApi } from '@/lib/api';
import {
  ArrowLeft,
  Plus,
  Loader2,
  Check,
  Pencil,
  X,
  Ticket,
  MapPin,
  Building2,
  Globe,
  EyeOff,
  Tag,
  ChevronDown,
  ChevronUp,
  Upload,
  PauseCircle,
  PlayCircle,
  XCircle,
} from 'lucide-react';
import { SuspendTicketModal } from '@/components/ui/suspend-ticket-modal';
import { Card, ErrorNote, Pill, SuccessNote, Toggle, money, num } from '@/components/ui/soa';
import { DateTimePicker, Field } from '@/components/ui/date-time-picker';
import { TicketSalesTable } from '@/components/ui/ticket-sales-table';
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
const STATUSES = ['ACTIVE', 'CLOSED', 'SOLDOUT', 'PENDING', 'ONHOLD', 'FLASHSALE', 'POSTPONED'];

interface ApiTicket {
  id: number;
  ticketName: string;
  ticketPrice: number;
  quantityAvailable: number;
  soldQuantity: number;
  isActive: boolean;
  ticketsToIssue: number;
  isSoldOut: boolean;
  ticketLimitPerPerson: number;
  numberOfComplementary: number;
  ticketSaleStartDate: string;
  ticketSaleEndDate: string;
  isFree: boolean;
  ticketStatus: string;
  smsPurchaseMessageTemplate?: string | null;
  emailPurchaseMessageTemplate?: string | null;
}

interface ApiEvent {
  id: number;
  eventName: string;
  slug: string;
  eventDescription: string;
  eventPosterUrl: string;
  eventLocation: string;
  ticketSaleStartDate: string;
  ticketSaleEndDate: string;
  eventStartDate: string;
  eventEndDate: string;
  isActive: boolean;
  published?: boolean;
  status?: string;
  percentageCommission?: number;
  percentageComission?: number;
  currency?: string;
  eventCategoryId?: number;
  companyId?: number;
  companyName?: string;
  tickets: ApiTicket[];
}

interface TicketFigureRow {
  ticketId: number;
  ticketsPerSale: number;
  salesPaid: number;
  ticketsPaid: number;
  ticketsComplimentary: number;
  revenue: number;
  allocated: number;
}

interface TicketRow {
  ticketId: number;
  ticketName: string;
  ticketPrice: number;
  quantityAvailable: number;
  soldQuantity: number;
  isActive: boolean;
  ticketsToIssue: number;
  isSoldOut: boolean;
  ticketLimitPerPerson: number;
  numberOfComplementary: number;
  ticketSaleStartDate: string;
  ticketSaleEndDate: string;
  isFree: boolean;
  ticketStatus: string;
  smsPurchaseMessageTemplate: string | null;
  emailPurchaseMessageTemplate: string | null;
}

interface EventForm {
  eventName: string;
  eventDescription: string;
  eventPosterUrl: string;
  eventCategoryId: string;
  eventLocation: string;
  ticketSaleStartDate: string;
  ticketSaleEndDate: string;
  eventStartDate: string;
  eventEndDate: string;
  status: string;
  percentageCommission: string;
  currency: string;
  published: boolean;
  slug: string;
  companyId: number;
  companyName: string;
}

interface NewTicketForm {
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

function toLocalDt(s: string | null | undefined): string {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${Y}-${M}-${D}T${h}:${m}`;
  } catch {
    return '';
  }
}

function toISO(s: string): string {
  if (!s) return '';
  return new Date(s).toISOString();
}

function emptyNewTicket(): NewTicketForm {
  return {
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

const PLACEHOLDER_HINT = 'Placeholders: {first_name} · {event_name} · {ticket_name}';

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Opened from the approvals queue? Send every exit back there instead of to
  // the events list, so a correct-then-approve round trip keeps its place.
  const from = searchParams?.get('from');
  const RETURNS_TO = {
    approvals: { href: '/dashboard/events/approvals', label: 'Approvals' },
    sales: { href: '/dashboard/events/sales', label: 'Active sales' },
  } as const;
  const { href: backTo, label: backLabel } =
    RETURNS_TO[from as keyof typeof RETURNS_TO] ?? { href: '/dashboard/events', label: 'Events' };
  const { id: eventId } = use(params);

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingTicketId, setSavingTicketId] = useState<number | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // soldQuantity on the detail payload is never incremented and
  // numberOfComplementary is a per-tier allowance rather than an issue count,
  // so the sales table is fed from the endpoint that reports both honestly.
  const [figures, setFigures] = useState<TicketFigureRow[] | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingTicketId, setEditingTicketId] = useState<number | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [expandedTickets, setExpandedTickets] = useState<Set<number>>(new Set());

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendActionType, setSuspendActionType] = useState<'suspend' | 'activate'>('suspend');
  const [suspendTicketId, setSuspendTicketId] = useState<number | null>(null);
  const [suspendTicketName, setSuspendTicketName] = useState('');
  const [suspendError, setSuspendError] = useState('');
  const [isSuspending, setIsSuspending] = useState(false);

  const [form, setForm] = useState<EventForm>({
    eventName: '',
    eventDescription: '',
    eventPosterUrl: '',
    eventCategoryId: '',
    eventLocation: '',
    ticketSaleStartDate: '',
    ticketSaleEndDate: '',
    eventStartDate: '',
    eventEndDate: '',
    status: '',
    percentageCommission: '',
    currency: 'KES',
    published: false,
    slug: '',
    companyId: 0,
    companyName: '',
  });

  const [ticketForms, setTicketForms] = useState<Record<number, Partial<TicketRow>>>({});
  const [newTicket, setNewTicket] = useState<NewTicketForm>(emptyNewTicket());

  const fetchEvent = useCallback(async ({ silent = false } = {}) => {
    // A refresh after a save must not unmount the form. `isLoading` swaps the
    // whole page for a centred spinner, which collapses the scroll container
    // from a few thousand pixels to about a hundred; the browser then clamps
    // the scroll offset, so the user is thrown to the top and sees a screen of
    // empty space where the form was. Reads triggered by the user's own save
    // refresh in place — the Save button is already showing its own spinner.
    if (!silent) setIsLoading(true);
    setError('');
    try {
      const resp = await eventsApi.getEventById(eventId);
      if (resp.status && resp.event) {
        const e = resp.event as ApiEvent;
        setForm({
          eventName: e.eventName || '',
          eventDescription: e.eventDescription || '',
          eventPosterUrl: e.eventPosterUrl || '',
          eventCategoryId: e.eventCategoryId ? String(e.eventCategoryId) : '',
          eventLocation: e.eventLocation || '',
          ticketSaleStartDate: toLocalDt(e.ticketSaleStartDate),
          ticketSaleEndDate: toLocalDt(e.ticketSaleEndDate),
          eventStartDate: toLocalDt(e.eventStartDate),
          eventEndDate: toLocalDt(e.eventEndDate),
          status: e.status || (e.isActive ? 'ACTIVE' : 'ONHOLD'),
          percentageCommission: String(e.percentageCommission ?? e.percentageComission ?? ''),
          currency: e.currency || 'KES',
          published: e.published ?? false,
          slug: e.slug || '',
          companyId: e.companyId ?? 0,
          companyName: e.companyName || '',
        });

        const mapped: TicketRow[] = (e.tickets || []).map((t) => ({
          ticketId: t.id,
          ticketName: t.ticketName,
          ticketPrice: t.ticketPrice,
          quantityAvailable: t.quantityAvailable,
          soldQuantity: t.soldQuantity,
          isActive: t.isActive,
          ticketsToIssue: t.ticketsToIssue,
          isSoldOut: t.isSoldOut,
          ticketLimitPerPerson: t.ticketLimitPerPerson,
          numberOfComplementary: t.numberOfComplementary,
          ticketSaleStartDate: t.ticketSaleStartDate,
          ticketSaleEndDate: t.ticketSaleEndDate,
          isFree: t.isFree,
          ticketStatus: t.ticketStatus,
          smsPurchaseMessageTemplate: t.smsPurchaseMessageTemplate ?? null,
          emailPurchaseMessageTemplate: t.emailPurchaseMessageTemplate ?? null,
        }));
        setTickets(mapped);

        const forms: Record<number, Partial<TicketRow>> = {};
        mapped.forEach((t) => {
          forms[t.ticketId] = {
            ...t,
            ticketSaleStartDate: toLocalDt(t.ticketSaleStartDate),
            ticketSaleEndDate: toLocalDt(t.ticketSaleEndDate),
          };
        });
        setTicketForms(forms);
      } else {
        setError(resp.message || 'Failed to load event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/events/${eventId}/ticket-summary`, {
          credentials: 'include',
        });
        const data = await resp.json();
        if (!cancelled) setFigures(resp.ok && data.status ? data.figures : null);
      } catch {
        if (!cancelled) setFigures(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const setF = (key: keyof EventForm, value: string | boolean | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateTicketForm = (id: number, key: string, value: string | number | boolean) =>
    setTicketForms((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));

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
      setF('eventPosterUrl', data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload: Record<string, unknown> = {
        eventName: form.eventName,
        eventDescription: form.eventDescription,
        eventPosterUrl: form.eventPosterUrl,
        eventLocation: form.eventLocation,
        ticketSaleStartDate: toISO(form.ticketSaleStartDate),
        ticketSaleEndDate: toISO(form.ticketSaleEndDate),
        eventStartDate: toISO(form.eventStartDate),
        eventEndDate: toISO(form.eventEndDate),
        published: form.published,
        slug: form.slug,
      };
      // Blank fields mean "leave unchanged", so they're omitted entirely.
      if (form.status) payload.status = form.status;
      if (form.percentageCommission !== '')
        payload.percentageCommission = parseFloat(form.percentageCommission) || 0;
      if (form.currency) payload.currency = form.currency;
      if (form.eventCategoryId) payload.eventCategoryId = parseInt(form.eventCategoryId);

      const resp = await eventsApi.updateEvent(eventId, payload);
      if (resp.status === true) {
        setSuccess('Event updated successfully');
        await fetchEvent({ silent: true });
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(resp.message || 'Failed to update event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTicket = async (ticketId: number) => {
    setSavingTicketId(ticketId);
    setError('');
    setSuccess('');
    try {
      const tf = ticketForms[ticketId];
      if (!tf) return;
      const resp = await eventsApi.updateTicket(ticketId, {
        ticketName: tf.ticketName,
        ticketPrice: tf.isFree ? 0 : tf.ticketPrice,
        quantityAvailable: tf.quantityAvailable,
        isActive: tf.isActive,
        ticketsToIssue: clampTicketsToIssue(
          tf.ticketsToIssue,
          Number(tf.quantityAvailable) || 0
        ),
        ticketLimitPerPerson: tf.ticketLimitPerPerson,
        numberOfComplementary: tf.numberOfComplementary,
        ticketSaleStartDate: tf.ticketSaleStartDate ? toISO(tf.ticketSaleStartDate) : undefined,
        ticketSaleEndDate: tf.ticketSaleEndDate ? toISO(tf.ticketSaleEndDate) : undefined,
        isFree: tf.isFree,
        smsPurchaseMessageTemplate: tf.smsPurchaseMessageTemplate ?? undefined,
        emailPurchaseMessageTemplate: tf.emailPurchaseMessageTemplate ?? undefined,
      });
      if (resp.status === true) {
        setSuccess(`Ticket "${tf.ticketName}" updated`);
        setEditingTicketId(null);
        await fetchEvent({ silent: true });
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(resp.message || 'Failed to update ticket');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket');
    } finally {
      setSavingTicketId(null);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(newTicket.quantityAvailable) || 0;
    const issueError = validateTicketsToIssue(newTicket.ticketsToIssue, qty);
    if (issueError) {
      setError(issueError);
      return;
    }
    setIsCreatingTicket(true);
    setError('');
    setSuccess('');
    try {
      const resp = await createEventApi.createTicket({
        event: { id: parseInt(eventId) },
        ticketName: newTicket.ticketName.trim(),
        ticketPrice: newTicket.isFree ? 0 : parseFloat(newTicket.ticketPrice) || 0,
        quantityAvailable: qty,
        ticketsToIssue: clampTicketsToIssue(newTicket.ticketsToIssue, qty),
        ticketLimitPerPerson: parseInt(newTicket.ticketLimitPerPerson) || 0,
        numberOfComplementary: parseInt(newTicket.numberOfComplementary) || 0,
        ticketSaleStartDate: toISO(newTicket.ticketSaleStartDate),
        ticketSaleEndDate: toISO(newTicket.ticketSaleEndDate),
        isFree: newTicket.isFree,
        smsPurchaseMessageTemplate: newTicket.sms || undefined,
        emailPurchaseMessageTemplate: newTicket.email || undefined,
      });
      if (resp.status === true) {
        setSuccess(`Ticket "${newTicket.ticketName}" created`);
        setShowNewTicket(false);
        setNewTicket(emptyNewTicket());
        await fetchEvent({ silent: true });
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(resp.message || 'Failed to create ticket');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const openSuspendModal = (id: number, name: string, action: 'suspend' | 'activate') => {
    setSuspendTicketId(id);
    setSuspendTicketName(name);
    setSuspendActionType(action);
    setSuspendError('');
    setShowSuspendModal(true);
  };

  const handleSuspendConfirm = async (otp: string) => {
    if (suspendTicketId === null) return;
    setIsSuspending(true);
    setSuspendError('');
    try {
      const ticketStatus = suspendActionType === 'suspend' ? 'ONHOLD' : 'ACTIVE';
      const resp = await eventsApi.toggleTicketStatus(suspendTicketId, { otp, ticketStatus });
      if (resp.status === true) {
        setSuccess(
          `Ticket sales ${suspendActionType === 'suspend' ? 'suspended' : 'activated'} successfully`
        );
        setShowSuspendModal(false);
        await fetchEvent({ silent: true });
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setSuspendError(resp.message || `Failed to ${suspendActionType} ticket sales`);
      }
    } catch (err) {
      setSuspendError(
        err instanceof Error ? err.message : `Failed to ${suspendActionType} ticket sales`
      );
    } finally {
      setIsSuspending(false);
    }
  };

  const toggleTicketExpand = (id: number) =>
    setExpandedTickets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="ic w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!form.eventName) {
    return (
      <div className="py-16 text-center">
        <XCircle
          className="ic w-10 h-10 mx-auto mb-3"
          style={{ color: 'color-mix(in srgb, var(--color-text) 22%, transparent)' }}
        />
        <p className="text-sm text-muted-foreground">Event not found</p>
        <button
          onClick={() => router.push(backTo)}
          className="mt-4"
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
          Back to events
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[780px] mx-auto flex flex-col gap-4 animate-soa-fade pb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <button
          onClick={() => router.push(backTo)}
          className="flex items-center gap-1.5"
          style={{
            fontSize: 12.5,
            border: 'none',
            background: 'transparent',
            color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
            minHeight: 36,
          }}
        >
          <ArrowLeft className="ic w-3.5 h-3.5" />
          {backLabel}
        </button>
        <span style={{ color: 'color-mix(in srgb, var(--color-text) 30%, transparent)' }}>/</span>
        <span className="truncate max-w-[240px]" style={{ fontSize: 12.5, fontWeight: 600 }}>
          {form.eventName}
        </span>
        <span
          className="tnum ml-auto"
          style={{ fontSize: 10, color: 'color-mix(in srgb, var(--color-text) 40%, transparent)' }}
        >
          #{eventId}
        </span>
      </div>

      {(form.companyName || form.companyId > 0) && (
        <div
          className="flex items-center gap-2"
          style={{
            padding: '9px 13px',
            borderRadius: 'var(--radius-card)',
            background: 'var(--color-neutral-100)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Building2
            className="ic w-3.5 h-3.5 flex-none"
            style={{ color: 'color-mix(in srgb, var(--color-text) 55%, transparent)' }}
          />
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>
            {form.companyName || 'Unknown company'}
          </span>
          <span
            className="tnum"
            style={{ fontSize: 10, color: 'color-mix(in srgb, var(--color-text) 40%, transparent)' }}
          >
            #{form.companyId}
          </span>
        </div>
      )}

      {error && <ErrorNote message={error} />}
      {success && <SuccessNote message={success} />}

      {/* ── Event details ────────────────────────────────────────────── */}
      <form onSubmit={handleSaveEvent}>
        <Card padded={false} style={{ padding: 20, gap: 16 }}>
          <div
            className="flex items-center justify-between pb-3"
            style={{ borderBottom: '1px solid var(--color-divider)' }}
          >
            <h2 className="m-0" style={{ fontSize: 15 }}>
              Event details
            </h2>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 disabled:opacity-50"
              style={{
                height: 32,
                padding: '0 14px',
                borderRadius: 'var(--radius-control)',
                border: 'none',
                background: 'var(--color-accent)',
                color: '#fff',
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: 'var(--font-body)',
              }}
            >
              {isSaving ? (
                <Loader2 className="ic w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="ic w-3.5 h-3.5" />
              )}
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))' }}>
            <Field label="Event name" required>
              <input
                className="soa-input"
                value={form.eventName}
                onChange={(e) => setF('eventName', e.target.value)}
              />
            </Field>
            <Field label="Category">
              <div className="relative">
                <Tag
                  className="ic absolute w-3.5 h-3.5 pointer-events-none"
                  style={{
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'color-mix(in srgb, var(--color-text) 42%, transparent)',
                  }}
                />
                <select
                  className="soa-input"
                  value={form.eventCategoryId}
                  onChange={(e) => setF('eventCategoryId', e.target.value)}
                  style={{ paddingLeft: 36 }}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          </div>

          <Field label="Description" required>
            <textarea
              className="soa-input"
              rows={3}
              value={form.eventDescription}
              onChange={(e) => setF('eventDescription', e.target.value)}
            />
          </Field>

          <Field label="Location" required>
            <div className="relative">
              <MapPin
                className="ic absolute w-3.5 h-3.5 pointer-events-none"
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
                onChange={(e) => setF('eventLocation', e.target.value)}
                style={{ paddingLeft: 36 }}
              />
            </div>
          </Field>

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))' }}>
            <Field label="Event starts" required>
              <DateTimePicker value={form.eventStartDate} onChange={(v) => setF('eventStartDate', v)} />
            </Field>
            <Field label="Event ends" required>
              <DateTimePicker value={form.eventEndDate} onChange={(v) => setF('eventEndDate', v)} />
            </Field>
            <Field label="Ticket sales start">
              <DateTimePicker
                value={form.ticketSaleStartDate}
                onChange={(v) => setF('ticketSaleStartDate', v)}
              />
            </Field>
            <Field label="Ticket sales end">
              <DateTimePicker
                value={form.ticketSaleEndDate}
                onChange={(v) => setF('ticketSaleEndDate', v)}
              />
            </Field>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))' }}>
            <Field label="Status">
              <select
                className="soa-input"
                value={form.status}
                onChange={(e) => setF('status', e.target.value)}
              >
                <option value="">— no change —</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Commission %">
              <input
                className="soa-input tnum"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.percentageCommission}
                onChange={(e) => setF('percentageCommission', e.target.value)}
                placeholder="e.g. 5"
              />
            </Field>
            <Field label="Currency">
              <select
                className="soa-input"
                value={form.currency}
                onChange={(e) => setF('currency', e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="URL slug">
            <input
              className="soa-input tnum"
              value={form.slug}
              onChange={(e) => setF('slug', e.target.value)}
            />
          </Field>

          <Field label="Poster image">
            <div className="flex gap-3.5 items-start flex-wrap">
              <label
                className="relative grid place-items-center cursor-pointer flex-none"
                style={{
                  width: 96,
                  height: 128,
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
                    <Upload className="ic w-4 h-4" />
                    <span style={{ fontSize: 10.5 }}>Upload</span>
                  </span>
                ) : null}
              </label>
              <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                <div className="relative">
                  <input
                    className="soa-input"
                    value={form.eventPosterUrl}
                    onChange={(e) => {
                      setF('eventPosterUrl', e.target.value);
                      setUploadError('');
                    }}
                    placeholder="or paste an image URL"
                    style={{ paddingRight: 34 }}
                  />
                  {form.eventPosterUrl && (
                    <button
                      type="button"
                      onClick={() => setF('eventPosterUrl', '')}
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
                <p
                  className="m-0"
                  style={{
                    fontSize: 11.5,
                    color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
                  }}
                >
                  JPEG, PNG or WebP · up to 10&nbsp;MB.
                </p>
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

          <div
            className="flex items-center justify-between pt-3"
            style={{ borderTop: '1px solid var(--color-divider)' }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Published</div>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'color-mix(in srgb, var(--color-text) 52%, transparent)',
                }}
              >
                Visible to buyers on soldoutafrica.com
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Toggle
                checked={form.published}
                onChange={(v) => setF('published', v)}
                label="Published"
              />
              <span
                className="inline-flex items-center gap-1"
                style={{
                  fontSize: 10,
                  color: form.published
                    ? 'var(--color-accent-2-700)'
                    : 'color-mix(in srgb, var(--color-text) 50%, transparent)',
                }}
              >
                {form.published ? (
                  <>
                    <Globe className="ic w-2.5 h-2.5" />
                    Live
                  </>
                ) : (
                  <>
                    <EyeOff className="ic w-2.5 h-2.5" />
                    Hidden
                  </>
                )}
              </span>
            </div>
          </div>
        </Card>
      </form>

      <SuspendTicketModal
        isOpen={showSuspendModal}
        onClose={() => {
          if (!isSuspending) {
            setShowSuspendModal(false);
            setSuspendError('');
          }
        }}
        actionType={suspendActionType}
        ticketName={suspendTicketName}
        error={suspendError}
        isLoading={isSuspending}
        onRequestOtp={async () => {
          setSuspendError('');
          await eventsApi.requestChallenge();
        }}
        onConfirm={handleSuspendConfirm}
      />

      {/* ── Tickets ──────────────────────────────────────────────────── */}
      <Card padded={false} style={{ padding: 20, gap: 16 }}>
        <div
          className="flex items-center justify-between pb-3"
          style={{ borderBottom: '1px solid var(--color-divider)' }}
        >
          <div className="flex items-center gap-2">
            <Ticket
              className="ic w-3.5 h-3.5"
              style={{ color: 'color-mix(in srgb, var(--color-text) 55%, transparent)' }}
            />
            <h2 className="m-0" style={{ fontSize: 15 }}>
              Tickets{' '}
              <span style={{ color: 'color-mix(in srgb, var(--color-text) 50%, transparent)' }}>
                ({tickets.length})
              </span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowNewTicket((v) => !v)}
            className="flex items-center gap-1.5"
            style={{
              height: 32,
              padding: '0 14px',
              borderRadius: 'var(--radius-control)',
              border: showNewTicket ? '1px solid var(--color-divider)' : 'none',
              background: showNewTicket ? 'transparent' : 'var(--color-accent)',
              color: showNewTicket ? 'var(--color-text)' : '#fff',
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: 'var(--font-body)',
            }}
          >
            {showNewTicket ? (
              <>
                <X className="ic w-3.5 h-3.5" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="ic w-3.5 h-3.5" />
                Add ticket
              </>
            )}
          </button>
        </div>

        {/* New ticket */}
        {showNewTicket && (
          <form
            onSubmit={handleCreateTicket}
            className="flex flex-col gap-3 animate-soa-fade-fast"
            style={{
              border: '1px solid var(--color-divider)',
              borderRadius: 12,
              padding: 15,
              background: 'var(--color-surface)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: 'color-mix(in srgb, var(--color-text) 55%, transparent)',
              }}
            >
              New ticket
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))' }}>
              <Field label="Name" required>
                <input
                  className="soa-input"
                  value={newTicket.ticketName}
                  onChange={(e) => setNewTicket((t) => ({ ...t, ticketName: e.target.value }))}
                  placeholder="e.g. VIP"
                  style={{ background: 'var(--color-neutral-100)' }}
                />
              </Field>
              <Field label={`Price (${form.currency})`}>
                <div className="flex items-center gap-2.5">
                  <input
                    className="soa-input tnum"
                    type="number"
                    min="0"
                    value={newTicket.isFree ? '' : newTicket.ticketPrice}
                    onChange={(e) => setNewTicket((t) => ({ ...t, ticketPrice: e.target.value }))}
                    disabled={newTicket.isFree}
                    placeholder={newTicket.isFree ? 'Free' : '0'}
                    style={{ background: 'var(--color-neutral-100)' }}
                  />
                  <Toggle
                    checked={newTicket.isFree}
                    onChange={(v) =>
                      setNewTicket((t) => ({ ...t, isFree: v, ticketPrice: v ? '0' : t.ticketPrice }))
                    }
                    label="Free ticket"
                  />
                  <span className="text-muted-foreground flex-none" style={{ fontSize: 12 }}>
                    Free
                  </span>
                </div>
              </Field>
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))' }}>
              <Field label="Quantity" required>
                <input
                  className="soa-input tnum"
                  type="number"
                  min="1"
                  value={newTicket.quantityAvailable}
                  onChange={(e) => setNewTicket((t) => ({ ...t, quantityAvailable: e.target.value }))}
                  placeholder="100"
                  style={{ background: 'var(--color-neutral-100)' }}
                />
              </Field>
              <Field label="To issue">
                <input
                  className="soa-input tnum"
                  type="number"
                  min="0"
                  max={MAX_TICKETS_TO_ISSUE}
                  value={newTicket.ticketsToIssue}
                  onChange={(e) => setNewTicket((t) => ({ ...t, ticketsToIssue: e.target.value }))}
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
                  Blank issues none · max {MAX_TICKETS_TO_ISSUE.toLocaleString()}
                </div>
              </Field>
              <Field label="Limit / person">
                <input
                  className="soa-input tnum"
                  type="number"
                  min="0"
                  value={newTicket.ticketLimitPerPerson}
                  onChange={(e) =>
                    setNewTicket((t) => ({ ...t, ticketLimitPerPerson: e.target.value }))
                  }
                  style={{ background: 'var(--color-neutral-100)' }}
                />
              </Field>
              <Field label="Complementary">
                <input
                  className="soa-input tnum"
                  type="number"
                  min="0"
                  value={newTicket.numberOfComplementary}
                  onChange={(e) =>
                    setNewTicket((t) => ({ ...t, numberOfComplementary: e.target.value }))
                  }
                  style={{ background: 'var(--color-neutral-100)' }}
                />
              </Field>
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))' }}>
              <Field label="Sales start">
                <DateTimePicker
                  value={newTicket.ticketSaleStartDate}
                  onChange={(v) => setNewTicket((t) => ({ ...t, ticketSaleStartDate: v }))}
                />
              </Field>
              <Field label="Sales end">
                <DateTimePicker
                  value={newTicket.ticketSaleEndDate}
                  onChange={(v) => setNewTicket((t) => ({ ...t, ticketSaleEndDate: v }))}
                />
              </Field>
            </div>

            <div className="pt-3" style={{ borderTop: '1px solid var(--color-divider)' }}>
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
                  value={newTicket.sms}
                  onChange={(e) => setNewTicket((t) => ({ ...t, sms: e.target.value }))}
                  placeholder="Hi {first_name}, your {ticket_name} ticket for {event_name} is confirmed. Access: {ticket_link}"
                  style={{ minHeight: 64, background: 'var(--color-neutral-100)' }}
                />
              </Field>
              <div className="mt-3">
                <Field label="Email on purchase">
                  <textarea
                    className="soa-input"
                    rows={4}
                    value={newTicket.email}
                    onChange={(e) => setNewTicket((t) => ({ ...t, email: e.target.value }))}
                    placeholder="Dear {first_name}, thank you for purchasing your {ticket_name} ticket for {event_name}."
                    style={{ minHeight: 76, background: 'var(--color-neutral-100)' }}
                  />
                  <div
                    style={{
                      fontSize: 10.5,
                      marginTop: 5,
                      color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                    }}
                  >
                    {PLACEHOLDER_HINT}
                  </div>
                </Field>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isCreatingTicket}
                className="flex items-center gap-1.5 disabled:opacity-50"
                style={{
                  height: 32,
                  padding: '0 14px',
                  borderRadius: 'var(--radius-control)',
                  border: 'none',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  fontSize: 12.5,
                  fontWeight: 700,
                  fontFamily: 'var(--font-body)',
                }}
              >
                {isCreatingTicket ? (
                  <Loader2 className="ic w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="ic w-3.5 h-3.5" />
                )}
                {isCreatingTicket ? 'Creating…' : 'Create ticket'}
              </button>
            </div>
          </form>
        )}

        {/* Sales to date, before the editable list. Revenue is derived from
            price x sold — /event/get returns no per-ticket revenue field. */}
        {tickets.length > 0 && (
          <div
            className="overflow-hidden"
            style={{
              border: '1px solid var(--color-divider)',
              borderRadius: 12,
              background: 'var(--color-neutral-100)',
            }}
          >
            <div
              className="flex items-baseline justify-between gap-3 flex-wrap"
              style={{ padding: '13px 16px 11px' }}
            >
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 14 }}>
                Sales to date
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'color-mix(in srgb, var(--color-text) 48%, transparent)',
                }}
              >
                {figures
                  ? 'Paid, complimentary and revenue as the platform reports them'
                  : 'Sales figures unavailable — showing configuration only'}
              </span>
            </div>
            <TicketSalesTable
              rows={tickets.map((t) => {
                const f = figures?.find((x) => x.ticketId === t.ticketId);
                return {
                  id: t.ticketId,
                  name: t.ticketName,
                  price: t.ticketPrice,
                  isFree: t.isFree,
                  status: t.ticketStatus,
                  allocation: f?.allocated || t.quantityAvailable,
                  ticketsPerSale: f?.ticketsPerSale ?? t.ticketsToIssue ?? 1,
                  paid: f?.ticketsPaid ?? 0,
                  complimentary: f?.ticketsComplimentary ?? 0,
                  revenue: f?.revenue ?? 0,
                  limitPerPerson: t.ticketLimitPerPerson,
                };
              })}
              commission={
                form.percentageCommission !== ''
                  ? parseFloat(form.percentageCommission) || null
                  : null
              }
            />
          </div>
        )}

        {/* Existing tickets */}
        {tickets.length === 0 ? (
          <div
            className="py-12 text-center"
            style={{ border: '1px dashed var(--color-divider)', borderRadius: 12 }}
          >
            <Ticket
              className="ic w-8 h-8 mx-auto mb-2"
              style={{ color: 'color-mix(in srgb, var(--color-text) 22%, transparent)' }}
            />
            <p className="m-0 text-xs text-muted-foreground">No tickets yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tickets.map((ticket) => {
              const tf = ticketForms[ticket.ticketId] || {};
              const isEditing = editingTicketId === ticket.ticketId;
              const isExpanded = expandedTickets.has(ticket.ticketId);
              const remaining = ticket.quantityAvailable - ticket.soldQuantity;
              const status = ticket.ticketStatus || (ticket.isActive ? 'ACTIVE' : 'INACTIVE');
              const statusTint =
                status === 'ACTIVE'
                  ? { bg: 'var(--tint-olive-bg)', fg: 'var(--tint-olive-fg)' }
                  : status === 'ONHOLD'
                    ? { bg: 'var(--tint-clay-bg)', fg: 'var(--tint-clay-fg)' }
                    : { bg: 'var(--tint-stone-bg)', fg: 'var(--tint-stone-fg)' };

              return (
                <div
                  key={ticket.ticketId}
                  className="overflow-hidden"
                  style={{
                    border: '1px solid var(--color-divider)',
                    borderRadius: 12,
                    background: 'var(--color-surface)',
                  }}
                >
                  <div className="flex items-center gap-2 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="truncate" style={{ fontSize: 14, fontWeight: 600 }}>
                          {ticket.ticketName}
                        </span>
                        <Pill bg={statusTint.bg} fg={statusTint.fg}>
                          {status.toLowerCase()}
                        </Pill>
                        {ticket.isFree && (
                          <Pill bg="var(--color-accent-2-100)" fg="var(--color-accent-2-800)">
                            free
                          </Pill>
                        )}
                        {ticket.isSoldOut && (
                          <Pill bg="var(--tint-sand-bg)" fg="var(--tint-sand-fg)">
                            sold out
                          </Pill>
                        )}
                      </div>
                      <div className="flex gap-3 mt-0.5 flex-wrap">
                        <span
                          className="tnum"
                          style={{
                            fontSize: 11.5,
                            color: 'color-mix(in srgb, var(--color-text) 60%, transparent)',
                          }}
                        >
                          {ticket.isFree ? 'Free' : money(ticket.ticketPrice)}
                        </span>
                        <span
                          className="tnum"
                          style={{
                            fontSize: 11.5,
                            color: 'color-mix(in srgb, var(--color-text) 60%, transparent)',
                          }}
                        >
                          {num(ticket.soldQuantity)}/{num(ticket.quantityAvailable)} sold ·{' '}
                          <span
                            style={{
                              color:
                                remaining <= 0
                                  ? 'var(--tint-sand-fg)'
                                  : 'var(--tint-olive-strong)',
                            }}
                          >
                            {num(remaining)} left
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 flex-none">
                      <button
                        type="button"
                        onClick={() => toggleTicketExpand(ticket.ticketId)}
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        className="grid place-items-center"
                        style={{
                          width: 32,
                          height: 32,
                          border: 'none',
                          background: 'transparent',
                          borderRadius: 8,
                          color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="ic w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="ic w-3.5 h-3.5" />
                        )}
                      </button>

                      {!isEditing ? (
                        <>
                          {ticket.ticketStatus === 'ONHOLD' ? (
                            <button
                              type="button"
                              onClick={() =>
                                openSuspendModal(ticket.ticketId, ticket.ticketName, 'activate')
                              }
                              title="Activate ticket sales"
                              className="grid place-items-center"
                              style={{
                                width: 32,
                                height: 32,
                                border: 'none',
                                background: 'transparent',
                                borderRadius: 8,
                                color: 'var(--tint-olive-strong)',
                              }}
                            >
                              <PlayCircle className="ic w-3.5 h-3.5" />
                            </button>
                          ) : !ticket.isSoldOut ? (
                            <button
                              type="button"
                              onClick={() =>
                                openSuspendModal(ticket.ticketId, ticket.ticketName, 'suspend')
                              }
                              title="Suspend ticket sales"
                              className="grid place-items-center"
                              style={{
                                width: 32,
                                height: 32,
                                border: 'none',
                                background: 'transparent',
                                borderRadius: 8,
                                color: 'var(--tint-clay-strong)',
                              }}
                            >
                              <PauseCircle className="ic w-3.5 h-3.5" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTicketId(ticket.ticketId);
                              setExpandedTickets((p) => new Set([...p, ticket.ticketId]));
                            }}
                            title="Edit ticket"
                            className="grid place-items-center"
                            style={{
                              width: 32,
                              height: 32,
                              border: 'none',
                              background: 'transparent',
                              borderRadius: 8,
                              color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
                            }}
                          >
                            <Pencil className="ic w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveTicket(ticket.ticketId)}
                            disabled={savingTicketId === ticket.ticketId}
                            className="flex items-center gap-1 disabled:opacity-50"
                            style={{
                              height: 30,
                              padding: '0 12px',
                              borderRadius: 'var(--radius-control)',
                              border: 'none',
                              background: 'var(--color-accent)',
                              color: '#fff',
                              fontSize: 12,
                              fontWeight: 700,
                              fontFamily: 'var(--font-body)',
                            }}
                          >
                            {savingTicketId === ticket.ticketId ? (
                              <Loader2 className="ic w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="ic w-3 h-3" />
                            )}
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTicketId(null)}
                            aria-label="Cancel edit"
                            className="grid place-items-center"
                            style={{
                              width: 30,
                              height: 30,
                              border: 'none',
                              background: 'transparent',
                              borderRadius: 8,
                              color: 'color-mix(in srgb, var(--color-text) 50%, transparent)',
                            }}
                          >
                            <X className="ic w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div
                      className="px-4 py-3 animate-soa-fade-fast"
                      style={{
                        borderTop: '1px solid var(--color-divider)',
                        background: 'var(--color-neutral-100)',
                      }}
                    >
                      {isEditing ? (
                        <div className="flex flex-col gap-3">
                          <div
                            className="grid gap-3"
                            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))' }}
                          >
                            <Field label="Ticket name">
                              <input
                                className="soa-input"
                                value={String(tf.ticketName ?? '')}
                                onChange={(e) =>
                                  updateTicketForm(ticket.ticketId, 'ticketName', e.target.value)
                                }
                              />
                            </Field>
                            <Field label="Price">
                              <div className="flex items-center gap-2.5">
                                <input
                                  className="soa-input tnum"
                                  type="number"
                                  min="0"
                                  value={tf.isFree ? '' : String(tf.ticketPrice ?? '')}
                                  onChange={(e) =>
                                    updateTicketForm(
                                      ticket.ticketId,
                                      'ticketPrice',
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  disabled={!!tf.isFree}
                                />
                                <Toggle
                                  checked={!!tf.isFree}
                                  onChange={(v) => updateTicketForm(ticket.ticketId, 'isFree', v)}
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
                            className="grid gap-3"
                            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))' }}
                          >
                            <Field label="Quantity">
                              <input
                                className="soa-input tnum"
                                type="number"
                                min="0"
                                value={String(tf.quantityAvailable ?? '')}
                                onChange={(e) =>
                                  updateTicketForm(
                                    ticket.ticketId,
                                    'quantityAvailable',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                              />
                            </Field>
                            <Field label="To issue">
                              <input
                                className="soa-input tnum"
                                type="number"
                                min="0"
                                max={MAX_TICKETS_TO_ISSUE}
                                value={String(tf.ticketsToIssue ?? '')}
                                onChange={(e) =>
                                  updateTicketForm(
                                    ticket.ticketId,
                                    'ticketsToIssue',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                              />
                            </Field>
                            <Field label="Limit / person">
                              <input
                                className="soa-input tnum"
                                type="number"
                                min="0"
                                value={String(tf.ticketLimitPerPerson ?? '')}
                                onChange={(e) =>
                                  updateTicketForm(
                                    ticket.ticketId,
                                    'ticketLimitPerPerson',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                              />
                            </Field>
                            <Field label="Complementary">
                              <input
                                className="soa-input tnum"
                                type="number"
                                min="0"
                                value={String(tf.numberOfComplementary ?? '')}
                                onChange={(e) =>
                                  updateTicketForm(
                                    ticket.ticketId,
                                    'numberOfComplementary',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                              />
                            </Field>
                          </div>

                          <div
                            className="grid gap-3"
                            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))' }}
                          >
                            <Field label="Sales start">
                              <DateTimePicker
                                value={String(tf.ticketSaleStartDate ?? '')}
                                onChange={(v) =>
                                  updateTicketForm(ticket.ticketId, 'ticketSaleStartDate', v)
                                }
                              />
                            </Field>
                            <Field label="Sales end">
                              <DateTimePicker
                                value={String(tf.ticketSaleEndDate ?? '')}
                                onChange={(v) =>
                                  updateTicketForm(ticket.ticketId, 'ticketSaleEndDate', v)
                                }
                              />
                            </Field>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12.5 }}>
                            <input
                              type="checkbox"
                              checked={!!tf.isActive}
                              onChange={(e) =>
                                updateTicketForm(ticket.ticketId, 'isActive', e.target.checked)
                              }
                            />
                            Active
                          </label>

                          <div className="pt-3" style={{ borderTop: '1px solid var(--color-divider)' }}>
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
                            <Field label="SMS template">
                              <textarea
                                className="soa-input"
                                rows={3}
                                value={String(tf.smsPurchaseMessageTemplate ?? '')}
                                onChange={(e) =>
                                  updateTicketForm(
                                    ticket.ticketId,
                                    'smsPurchaseMessageTemplate',
                                    e.target.value
                                  )
                                }
                                placeholder="Hi {first_name}, your {ticket_name} ticket for {event_name} is confirmed."
                                style={{ minHeight: 64 }}
                              />
                            </Field>
                            <div className="mt-3">
                              <Field label="Email template">
                                <textarea
                                  className="soa-input"
                                  rows={4}
                                  value={String(tf.emailPurchaseMessageTemplate ?? '')}
                                  onChange={(e) =>
                                    updateTicketForm(
                                      ticket.ticketId,
                                      'emailPurchaseMessageTemplate',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Dear {first_name}, thank you for purchasing your {ticket_name} ticket."
                                  style={{ minHeight: 76 }}
                                />
                                <div
                                  style={{
                                    fontSize: 10.5,
                                    marginTop: 5,
                                    color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                                  }}
                                >
                                  {PLACEHOLDER_HINT}
                                </div>
                              </Field>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              ['Available', num(ticket.quantityAvailable)],
                              ['Sold', num(ticket.soldQuantity)],
                              ['Limit/person', num(ticket.ticketLimitPerPerson)],
                              ['Complementary', num(ticket.numberOfComplementary)],
                            ].map(([label, value]) => (
                              <div key={label}>
                                <div
                                  style={{
                                    fontSize: 9.5,
                                    letterSpacing: '.06em',
                                    textTransform: 'uppercase',
                                    marginBottom: 2,
                                    color: 'color-mix(in srgb, var(--color-text) 45%, transparent)',
                                  }}
                                >
                                  {label}
                                </div>
                                <div className="tnum" style={{ fontWeight: 600, fontSize: 13 }}>
                                  {value}
                                </div>
                              </div>
                            ))}
                          </div>
                          {(ticket.smsPurchaseMessageTemplate ||
                            ticket.emailPurchaseMessageTemplate) && (
                            <div
                              className="flex gap-2 pt-2.5 flex-wrap"
                              style={{ borderTop: '1px solid var(--color-divider)' }}
                            >
                              {ticket.smsPurchaseMessageTemplate && (
                                <Pill bg="var(--tint-olive-bg)" fg="var(--tint-olive-fg)">
                                  SMS template set
                                </Pill>
                              )}
                              {ticket.emailPurchaseMessageTemplate && (
                                <Pill bg="var(--tint-clay-bg)" fg="var(--tint-clay-fg)">
                                  Email template set
                                </Pill>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
