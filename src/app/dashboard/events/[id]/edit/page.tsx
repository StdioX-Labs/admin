'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { eventsApi, createEventApi } from '@/lib/api';
import {
  ArrowLeft,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pencil,
  X,
  Ticket,
  Calendar,
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
} from 'lucide-react';
import { SuspendTicketModal } from '@/components/ui/suspend-ticket-modal';

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

const STATUSES = ['ACTIVE', 'CLOSED', 'SOLDOUT', 'PENDING', 'ONHOLD', 'FLASHSALE', 'POSTPONED'];

// ─── Types ───────────────────────────────────────────────────────────────────

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
  createAt: string;
  smsPurchaseMessageTemplate?: string | null;
  emailPurchaseMessageTemplate?: string | null;
}

interface ApiEvent {
  id: number;
  eventName: string;
  slug: string;
  eventDescription: string;
  eventPosterUrl: string;
  category: string;
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

interface Ticket {
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
  smsPurchaseMessageTemplate: string;
  emailPurchaseMessageTemplate: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalDt(s: string | null | undefined): string {
  if (!s) return '';
  try {
    const d = new Date(s);
    const Y = d.getFullYear(), M = String(d.getMonth() + 1).padStart(2, '0'), D = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0'), m = String(d.getMinutes()).padStart(2, '0');
    return `${Y}-${M}-${D}T${h}:${m}`;
  } catch { return ''; }
}

function toISO(s: string): string {
  if (!s) return '';
  return new Date(s).toISOString();
}

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

function emptyNewTicket(): NewTicketForm {
  return { ticketName: '', ticketPrice: '', quantityAvailable: '', ticketsToIssue: '', ticketLimitPerPerson: '1', numberOfComplementary: '0', ticketSaleStartDate: '', ticketSaleEndDate: '', isFree: false, smsPurchaseMessageTemplate: '', emailPurchaseMessageTemplate: '' };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: eventId } = use(params);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingTicketId, setSavingTicketId] = useState<number | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingTicketId, setEditingTicketId] = useState<number | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [expandedTickets, setExpandedTickets] = useState<Set<number>>(new Set());

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendStep, setSuspendStep] = useState<'confirm' | 'otp'>('confirm');
  const [suspendActionType, setSuspendActionType] = useState<'suspend' | 'activate'>('suspend');
  const [suspendTicketId, setSuspendTicketId] = useState<number | null>(null);
  const [suspendTicketName, setSuspendTicketName] = useState('');
  const [suspendOtp, setSuspendOtp] = useState('');
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

  const [ticketForms, setTicketForms] = useState<Record<number, Partial<Ticket>>>({});
  const [newTicket, setNewTicket] = useState<NewTicketForm>(emptyNewTicket());

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchEvent(); }, [eventId]);

  const fetchEvent = async () => {
    setIsLoading(true);
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

        const mapped: Ticket[] = (e.tickets || []).map((t: ApiTicket) => ({
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

        const forms: Record<number, Partial<Ticket>> = {};
        mapped.forEach(t => {
          forms[t.ticketId] = {
            ticketName: t.ticketName,
            ticketPrice: t.ticketPrice,
            quantityAvailable: t.quantityAvailable,
            isActive: t.isActive,
            ticketsToIssue: t.ticketsToIssue,
            ticketLimitPerPerson: t.ticketLimitPerPerson,
            numberOfComplementary: t.numberOfComplementary,
            ticketSaleStartDate: toLocalDt(t.ticketSaleStartDate),
            ticketSaleEndDate: toLocalDt(t.ticketSaleEndDate),
            isFree: t.isFree,
            ticketStatus: t.ticketStatus,
            smsPurchaseMessageTemplate: t.smsPurchaseMessageTemplate,
            emailPurchaseMessageTemplate: t.emailPurchaseMessageTemplate,
          };
        });
        setTicketForms(forms);
      } else {
        setError(resp.message || 'Failed to load event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event');
    } finally {
      setIsLoading(false);
    }
  };

  const setF = (key: keyof EventForm, value: string | boolean | number) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  const handlePosterUpload = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) { setUploadError('Invalid file type. Use JPEG, PNG, GIF, or WebP.'); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError('File too large. Maximum size is 10MB.'); return; }
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

  const updateTicketForm = (id: number, key: string, value: string | number | boolean) => {
    setTicketForms(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(''); setSuccess('');
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
      if (form.status) payload.status = form.status;
      if (form.percentageCommission !== '') payload.percentageCommission = parseFloat(form.percentageCommission) || 0;
      if (form.currency) payload.currency = form.currency;
      if (form.eventCategoryId) payload.eventCategoryId = parseInt(form.eventCategoryId);

      const resp = await eventsApi.updateEvent(eventId, payload);
      if (resp.status === true) {
        setSuccess('Event updated successfully');
        await fetchEvent();
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
    setError(''); setSuccess('');
    try {
      const tf = ticketForms[ticketId];
      if (!tf) return;
      const resp = await eventsApi.updateTicket(ticketId, {
        ticketName: tf.ticketName,
        ticketPrice: tf.isFree ? 0 : tf.ticketPrice,
        quantityAvailable: tf.quantityAvailable,
        isActive: tf.isActive,
        ticketsToIssue: tf.ticketsToIssue,
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
        await fetchEvent();
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
    setIsCreatingTicket(true);
    setError(''); setSuccess('');
    try {
      const qty = parseInt(newTicket.quantityAvailable) || 0;
      const resp = await createEventApi.createTicket({
        event: { id: parseInt(eventId) },
        ticketName: newTicket.ticketName.trim(),
        ticketPrice: newTicket.isFree ? 0 : parseFloat(newTicket.ticketPrice) || 0,
        quantityAvailable: qty,
        ticketsToIssue: parseInt(newTicket.ticketsToIssue) || qty,
        ticketLimitPerPerson: parseInt(newTicket.ticketLimitPerPerson) || 1,
        numberOfComplementary: parseInt(newTicket.numberOfComplementary) || 0,
        ticketSaleStartDate: toISO(newTicket.ticketSaleStartDate),
        ticketSaleEndDate: toISO(newTicket.ticketSaleEndDate),
        isFree: newTicket.isFree,
        smsPurchaseMessageTemplate: newTicket.smsPurchaseMessageTemplate || undefined,
        emailPurchaseMessageTemplate: newTicket.emailPurchaseMessageTemplate || undefined,
      });
      if (resp.status === true) {
        setSuccess(`Ticket "${newTicket.ticketName}" created`);
        setShowNewTicket(false);
        setNewTicket(emptyNewTicket());
        await fetchEvent();
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

  const handleSuspendClick = (ticketId: number, ticketName: string) => {
    setSuspendTicketId(ticketId);
    setSuspendTicketName(ticketName);
    setSuspendActionType('suspend');
    setSuspendStep('confirm');
    setSuspendOtp('');
    setSuspendError('');
    setShowSuspendModal(true);
  };

  const handleActivateClick = (ticketId: number, ticketName: string) => {
    setSuspendTicketId(ticketId);
    setSuspendTicketName(ticketName);
    setSuspendActionType('activate');
    setSuspendStep('confirm');
    setSuspendOtp('');
    setSuspendError('');
    setShowSuspendModal(true);
  };

  const handleSuspendConfirm = () => {
    setSuspendStep('otp');
    setSuspendError('');
  };

  const handleSuspendOtpSubmit = async () => {
    if (!suspendTicketId) return;
    setIsSuspending(true);
    setSuspendError('');
    try {
      const ticketStatus = suspendActionType === 'suspend' ? 'ONHOLD' : 'ACTIVE';
      const resp = await eventsApi.toggleTicketStatus(suspendTicketId, { otp: suspendOtp, ticketStatus });
      if (resp.status === true) {
        setSuccess(`Ticket sales ${suspendActionType === 'suspend' ? 'suspended' : 'activated'} successfully`);
        setShowSuspendModal(false);
        setSuspendOtp('');
        await fetchEvent();
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setSuspendError(resp.message || `Failed to ${suspendActionType} ticket sales`);
      }
    } catch (err) {
      setSuspendError(err instanceof Error ? err.message : `Failed to ${suspendActionType} ticket sales`);
    } finally {
      setIsSuspending(false);
    }
  };

  const handleSuspendModalClose = () => {
    if (isSuspending) return;
    setShowSuspendModal(false);
    setSuspendStep('confirm');
    setSuspendOtp('');
    setSuspendError('');
  };

  const toggleTicketExpand = (id: number) => {
    setExpandedTickets(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!form.eventName && !isLoading) {
    return (
      <div className="py-16 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Event not found</p>
        <Button onClick={() => router.push('/dashboard/events')} variant="outline" size="sm" className="mt-4 border-border bg-transparent text-xs">
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-12 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/events')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Events
        </button>
        <span className="text-muted-foreground/30">/</span>
        <span className="text-xs text-foreground font-medium truncate max-w-[200px]">{form.eventName}</span>
        <span className="text-[10px] font-mono text-muted-foreground/40 ml-auto">#{eventId}</span>
      </div>

      {/* Company badge */}
      {(form.companyName || form.companyId > 0) && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
          <span className="text-xs text-foreground font-medium">{form.companyName || 'Unknown Company'}</span>
          <span className="text-[10px] font-mono text-muted-foreground/40">#{form.companyId}</span>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5 py-2.5">
          <AlertDescription className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
            <span className="text-sm text-destructive">{error}</span>
          </AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-emerald-500/20 bg-emerald-500/5 py-2.5">
          <AlertDescription className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span className="text-sm text-emerald-400">{success}</span>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Event Details Form ─────────────────────────────────────────────── */}
      <form onSubmit={handleSaveEvent} className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Event Details</h2>
          <Button type="submit" disabled={isSaving} size="sm" className="h-7 text-xs gap-1.5">
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Event Name" required>
            <Input value={form.eventName} onChange={e => setF('eventName', e.target.value)} className="h-9 text-sm border-border bg-background" />
          </Field>
          <Field label="Category">
            <div className="relative">
              <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
              <select
                value={form.eventCategoryId}
                onChange={e => setF('eventCategoryId', e.target.value)}
                className="w-full h-9 text-sm rounded-md border border-border bg-background pl-8 pr-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
          </Field>
        </div>

        <Field label="Description" required>
          <textarea
            value={form.eventDescription}
            onChange={e => setF('eventDescription', e.target.value)}
            rows={3}
            className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </Field>

        <Field label="Location" required>
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
            <Input value={form.eventLocation} onChange={e => setF('eventLocation', e.target.value)} className="h-9 text-sm border-border bg-background pl-8" />
          </div>
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Event Start" required>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
              <Input type="datetime-local" value={form.eventStartDate} onChange={e => setF('eventStartDate', e.target.value)} className="h-9 text-sm border-border bg-background pl-8" />
            </div>
          </Field>
          <Field label="Event End" required>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
              <Input type="datetime-local" value={form.eventEndDate} onChange={e => setF('eventEndDate', e.target.value)} className="h-9 text-sm border-border bg-background pl-8" />
            </div>
          </Field>
          <Field label="Ticket Sale Start">
            <Input type="datetime-local" value={form.ticketSaleStartDate} onChange={e => setF('ticketSaleStartDate', e.target.value)} className="h-9 text-sm border-border bg-background" />
          </Field>
          <Field label="Ticket Sale End">
            <Input type="datetime-local" value={form.ticketSaleEndDate} onChange={e => setF('ticketSaleEndDate', e.target.value)} className="h-9 text-sm border-border bg-background" />
          </Field>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Status">
            <select
              value={form.status}
              onChange={e => setF('status', e.target.value)}
              className="w-full h-9 text-sm rounded-md border border-border bg-background px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">— no change —</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Commission %">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.percentageCommission}
              onChange={e => setF('percentageCommission', e.target.value)}
              placeholder="e.g. 5"
              className="h-9 text-sm border-border bg-background"
            />
          </Field>
          <Field label="Currency">
            <select
              value={form.currency}
              onChange={e => setF('currency', e.target.value)}
              className="w-full h-9 text-sm rounded-md border border-border bg-background px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <Field label="URL Slug">
          <Input value={form.slug} onChange={e => setF('slug', e.target.value)} className="h-9 text-sm border-border bg-background font-mono" />
        </Field>

        <Field label="Poster Image">
          <div className="space-y-2">
            <label className={`flex flex-col items-center justify-center gap-2 h-20 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
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
                <><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Uploading...</span></>
              ) : (
                <><Upload className="h-4 w-4 text-muted-foreground/50" /><span className="text-xs text-muted-foreground/70">Click to upload <span className="text-muted-foreground/40">· JPEG, PNG, WebP · max 10MB</span></span></>
              )}
            </label>
            <div className="relative">
              <Input value={form.eventPosterUrl} onChange={e => { setF('eventPosterUrl', e.target.value); setUploadError(''); }} placeholder="or paste image URL" className="h-9 text-sm border-border bg-background pr-8" />
              {form.eventPosterUrl && (
                <button type="button" onClick={() => setF('eventPosterUrl', '')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-destructive transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {uploadError && <p className="text-xs text-destructive flex items-center gap-1.5"><AlertCircle className="h-3 w-3 flex-shrink-0" />{uploadError}</p>}
            {form.eventPosterUrl && (
              <div className="w-28 h-18 rounded-md overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.eventPosterUrl} alt="poster" className="w-full h-full object-cover" style={{ height: '72px' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
          </div>
        </Field>

        {/* Published toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60">
          <div>
            <p className="text-xs font-medium text-foreground">Published</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Visible to the public on soldoutafrica.com</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setF('published', !form.published)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${form.published ? 'bg-emerald-500/80' : 'bg-muted-foreground/20'}`}
              role="switch"
              aria-checked={form.published}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form.published ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
            <span className={`flex items-center gap-1 text-[10px] ${form.published ? 'text-emerald-400' : 'text-muted-foreground/50'}`}>
              {form.published ? <><Globe className="h-2.5 w-2.5" />Live</> : <><EyeOff className="h-2.5 w-2.5" />Hidden</>}
            </span>
          </div>
        </div>
      </form>

      <SuspendTicketModal
        isOpen={showSuspendModal}
        onClose={handleSuspendModalClose}
        step={suspendStep}
        actionType={suspendActionType}
        ticketName={suspendTicketName}
        otp={suspendOtp}
        onOtpChange={setSuspendOtp}
        error={suspendError}
        isLoading={isSuspending}
        onConfirm={handleSuspendConfirm}
        onOtpSubmit={handleSuspendOtpSubmit}
        onBack={() => { setSuspendStep('confirm'); setSuspendError(''); }}
      />

      {/* ── Tickets ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Ticket className="h-3.5 w-3.5 text-muted-foreground/60" />
            <h2 className="text-sm font-semibold text-foreground">Tickets <span className="text-muted-foreground/50">({tickets.length})</span></h2>
          </div>
          <Button
            type="button"
            onClick={() => setShowNewTicket(v => !v)}
            size="sm"
            variant={showNewTicket ? 'outline' : 'default'}
            className="h-7 text-xs gap-1.5 border-border"
          >
            {showNewTicket ? <><X className="h-3 w-3" />Cancel</> : <><Plus className="h-3 w-3" />Add Ticket</>}
          </Button>
        </div>

        {/* New ticket form */}
        {showNewTicket && (
          <form onSubmit={handleCreateTicket} className="rounded-lg border border-border bg-background/50 p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Ticket</p>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Name" required>
                <Input value={newTicket.ticketName} onChange={e => setNewTicket(t => ({ ...t, ticketName: e.target.value }))} placeholder="e.g. VIP" className="h-9 text-sm border-border bg-background" />
              </Field>
              <Field label="Price">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={newTicket.isFree ? '' : newTicket.ticketPrice}
                    onChange={e => setNewTicket(t => ({ ...t, ticketPrice: e.target.value }))}
                    placeholder={newTicket.isFree ? 'Free' : '0.00'}
                    disabled={newTicket.isFree}
                    className="h-9 text-sm border-border bg-background disabled:opacity-40"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
                    <input type="checkbox" checked={newTicket.isFree} onChange={e => setNewTicket(t => ({ ...t, isFree: e.target.checked, ticketPrice: e.target.checked ? '0' : t.ticketPrice }))} className="rounded border-border" />
                    Free
                  </label>
                </div>
              </Field>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Quantity" required>
                <Input type="number" min="1" value={newTicket.quantityAvailable} onChange={e => setNewTicket(t => ({ ...t, quantityAvailable: e.target.value }))} placeholder="100" className="h-9 text-sm border-border bg-background" />
              </Field>
              <Field label="To Issue">
                <Input type="number" min="0" value={newTicket.ticketsToIssue} onChange={e => setNewTicket(t => ({ ...t, ticketsToIssue: e.target.value }))} placeholder="Same as qty" className="h-9 text-sm border-border bg-background" />
              </Field>
              <Field label="Limit / Person">
                <Input type="number" min="1" value={newTicket.ticketLimitPerPerson} onChange={e => setNewTicket(t => ({ ...t, ticketLimitPerPerson: e.target.value }))} className="h-9 text-sm border-border bg-background" />
              </Field>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Complementary">
                <Input type="number" min="0" value={newTicket.numberOfComplementary} onChange={e => setNewTicket(t => ({ ...t, numberOfComplementary: e.target.value }))} className="h-9 text-sm border-border bg-background" />
              </Field>
              <Field label="Sale Start">
                <Input type="datetime-local" value={newTicket.ticketSaleStartDate} onChange={e => setNewTicket(t => ({ ...t, ticketSaleStartDate: e.target.value }))} className="h-9 text-sm border-border bg-background" />
              </Field>
              <Field label="Sale End">
                <Input type="datetime-local" value={newTicket.ticketSaleEndDate} onChange={e => setNewTicket(t => ({ ...t, ticketSaleEndDate: e.target.value }))} className="h-9 text-sm border-border bg-background" />
              </Field>
            </div>

            <div className="space-y-3 pt-1 border-t border-border/60">
              <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider pt-1">Notification Templates</p>
              <Field label="SMS Template">
                <textarea
                  value={newTicket.smsPurchaseMessageTemplate}
                  onChange={e => setNewTicket(t => ({ ...t, smsPurchaseMessageTemplate: e.target.value }))}
                  rows={3}
                  placeholder="Hi {first_name}, your {ticket_name} ticket for {event_name} is confirmed. Access: {ticket_link}"
                  className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none font-mono"
                />
                <p className="text-[10px] text-muted-foreground/40 mt-1">Placeholders: <span className="font-mono">{'{first_name}'} {'{event_name}'} {'{ticket_name}'} {'{ticket_link}'}</span></p>
              </Field>
              <Field label="Email Template">
                <textarea
                  value={newTicket.emailPurchaseMessageTemplate}
                  onChange={e => setNewTicket(t => ({ ...t, emailPurchaseMessageTemplate: e.target.value }))}
                  rows={4}
                  placeholder="Dear {first_name},&#10;&#10;Thank you for purchasing your {ticket_name} ticket for {event_name}. We look forward to seeing you!"
                  className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
                <p className="text-[10px] text-muted-foreground/40 mt-1">Placeholders: <span className="font-mono">{'{first_name}'} {'{event_name}'} {'{ticket_name}'}</span></p>
              </Field>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={isCreatingTicket} size="sm" className="h-7 text-xs gap-1.5">
                {isCreatingTicket ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                {isCreatingTicket ? 'Creating...' : 'Create Ticket'}
              </Button>
            </div>
          </form>
        )}

        {/* Existing tickets */}
        {tickets.length === 0 ? (
          <div className="py-12 text-center rounded-lg border border-dashed border-border">
            <Ticket className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No tickets yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(ticket => {
              const tf = ticketForms[ticket.ticketId] || {};
              const isEditing = editingTicketId === ticket.ticketId;
              const isExpanded = expandedTickets.has(ticket.ticketId);
              const remaining = ticket.quantityAvailable - ticket.soldQuantity;

              return (
                <div key={ticket.ticketId} className="rounded-lg border border-border bg-background/30 overflow-hidden">
                  {/* Ticket header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{ticket.ticketName}</span>
                        <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                          ticket.ticketStatus === 'ACTIVE' || ticket.isActive
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : 'text-muted-foreground bg-accent border-border'
                        }`}>
                          {ticket.ticketStatus || (ticket.isActive ? 'ACTIVE' : 'INACTIVE')}
                        </span>
                        {ticket.isFree && (
                          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border text-blue-400 bg-blue-500/10 border-blue-500/20">Free</span>
                        )}
                        {ticket.isSoldOut && (
                          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border text-amber-400 bg-amber-500/10 border-amber-500/20">Sold Out</span>
                        )}
                      </div>
                      <div className="flex gap-3 mt-0.5">
                        <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                          {ticket.isFree ? 'Free' : `KES ${ticket.ticketPrice.toLocaleString()}`}
                        </span>
                        <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                          {ticket.soldQuantity}/{ticket.quantityAvailable} sold · <span className={remaining <= 0 ? 'text-amber-400' : 'text-emerald-400'}>{remaining} left</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleTicketExpand(ticket.ticketId)}
                        className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent/50 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      {!isEditing ? (
                        <>
                          {ticket.ticketStatus === 'ONHOLD' ? (
                            <Button
                              onClick={() => handleActivateClick(ticket.ticketId, ticket.ticketName)}
                              variant="ghost"
                              size="sm"
                              title="Activate ticket sales"
                              className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                            </Button>
                          ) : !ticket.isSoldOut ? (
                            <Button
                              onClick={() => handleSuspendClick(ticket.ticketId, ticket.ticketName)}
                              variant="ghost"
                              size="sm"
                              title="Suspend ticket sales"
                              className="h-7 w-7 p-0 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                            >
                              <PauseCircle className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                          <Button
                            onClick={() => { setEditingTicketId(ticket.ticketId); setExpandedTickets(p => new Set([...p, ticket.ticketId])); }}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleSaveTicket(ticket.ticketId)}
                            disabled={savingTicketId === ticket.ticketId}
                            size="sm"
                            className="h-7 text-xs gap-1"
                          >
                            {savingTicketId === ticket.ticketId ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            Save
                          </Button>
                          <Button
                            onClick={() => setEditingTicketId(null)}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded details / edit form */}
                  {isExpanded && (
                    <div className="border-t border-border/60 px-4 py-3 bg-background/20">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid sm:grid-cols-2 gap-3">
                            <Field label="Ticket Name">
                              <Input value={String(tf.ticketName ?? '')} onChange={e => updateTicketForm(ticket.ticketId, 'ticketName', e.target.value)} className="h-9 text-sm border-border bg-background" />
                            </Field>
                            <Field label="Price">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  value={tf.isFree ? '' : String(tf.ticketPrice ?? '')}
                                  onChange={e => updateTicketForm(ticket.ticketId, 'ticketPrice', parseFloat(e.target.value) || 0)}
                                  disabled={!!tf.isFree}
                                  className="h-9 text-sm border-border bg-background disabled:opacity-40"
                                />
                                <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
                                  <input type="checkbox" checked={!!tf.isFree} onChange={e => updateTicketForm(ticket.ticketId, 'isFree', e.target.checked)} className="rounded border-border" />
                                  Free
                                </label>
                              </div>
                            </Field>
                          </div>
                          <div className="grid sm:grid-cols-3 gap-3">
                            <Field label="Quantity">
                              <Input type="number" min="0" value={String(tf.quantityAvailable ?? '')} onChange={e => updateTicketForm(ticket.ticketId, 'quantityAvailable', parseInt(e.target.value) || 0)} className="h-9 text-sm border-border bg-background" />
                            </Field>
                            <Field label="To Issue">
                              <Input type="number" min="0" value={String(tf.ticketsToIssue ?? '')} onChange={e => updateTicketForm(ticket.ticketId, 'ticketsToIssue', parseInt(e.target.value) || 0)} className="h-9 text-sm border-border bg-background" />
                            </Field>
                            <Field label="Limit / Person">
                              <Input type="number" min="0" value={String(tf.ticketLimitPerPerson ?? '')} onChange={e => updateTicketForm(ticket.ticketId, 'ticketLimitPerPerson', parseInt(e.target.value) || 0)} className="h-9 text-sm border-border bg-background" />
                            </Field>
                          </div>
                          <div className="grid sm:grid-cols-3 gap-3">
                            <Field label="Complementary">
                              <Input type="number" min="0" value={String(tf.numberOfComplementary ?? '')} onChange={e => updateTicketForm(ticket.ticketId, 'numberOfComplementary', parseInt(e.target.value) || 0)} className="h-9 text-sm border-border bg-background" />
                            </Field>
                            <Field label="Sale Start">
                              <Input type="datetime-local" value={String(tf.ticketSaleStartDate ?? '')} onChange={e => updateTicketForm(ticket.ticketId, 'ticketSaleStartDate', e.target.value)} className="h-9 text-sm border-border bg-background" />
                            </Field>
                            <Field label="Sale End">
                              <Input type="datetime-local" value={String(tf.ticketSaleEndDate ?? '')} onChange={e => updateTicketForm(ticket.ticketId, 'ticketSaleEndDate', e.target.value)} className="h-9 text-sm border-border bg-background" />
                            </Field>
                          </div>
                          <div className="flex items-center gap-3 pt-1">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!tf.isActive}
                                onChange={e => updateTicketForm(ticket.ticketId, 'isActive', e.target.checked)}
                                className="rounded border-border"
                              />
                              Active
                            </label>
                          </div>

                          <div className="space-y-3 pt-2 border-t border-border/60">
                            <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Notification Templates</p>
                            <Field label="SMS Template">
                              <textarea
                                value={String(tf.smsPurchaseMessageTemplate ?? '')}
                                onChange={e => updateTicketForm(ticket.ticketId, 'smsPurchaseMessageTemplate', e.target.value)}
                                rows={3}
                                placeholder="Hi {first_name}, your {ticket_name} ticket for {event_name} is confirmed. Access: {ticket_link}"
                                className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none font-mono"
                              />
                              <p className="text-[10px] text-muted-foreground/40 mt-1">Placeholders: <span className="font-mono">{'{first_name}'} {'{event_name}'} {'{ticket_name}'} {'{ticket_link}'}</span></p>
                            </Field>
                            <Field label="Email Template">
                              <textarea
                                value={String(tf.emailPurchaseMessageTemplate ?? '')}
                                onChange={e => updateTicketForm(ticket.ticketId, 'emailPurchaseMessageTemplate', e.target.value)}
                                rows={4}
                                placeholder="Dear {first_name},&#10;&#10;Thank you for purchasing your {ticket_name} ticket for {event_name}. We look forward to seeing you!"
                                className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                              />
                              <p className="text-[10px] text-muted-foreground/40 mt-1">Placeholders: <span className="font-mono">{'{first_name}'} {'{event_name}'} {'{ticket_name}'}</span></p>
                            </Field>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Available</p>
                              <p className="font-medium text-foreground tabular-nums">{ticket.quantityAvailable}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Sold</p>
                              <p className="font-medium text-foreground tabular-nums">{ticket.soldQuantity}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Limit/Person</p>
                              <p className="font-medium text-foreground tabular-nums">{ticket.ticketLimitPerPerson}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-0.5">Comp.</p>
                              <p className="font-medium text-foreground tabular-nums">{ticket.numberOfComplementary}</p>
                            </div>
                          </div>
                          {(ticket.smsPurchaseMessageTemplate || ticket.emailPurchaseMessageTemplate) && (
                            <div className="flex gap-2 pt-1 border-t border-border/40">
                              {ticket.smsPurchaseMessageTemplate && (
                                <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border text-sky-400 bg-sky-500/10 border-sky-500/20">SMS template set</span>
                              )}
                              {ticket.emailPurchaseMessageTemplate && (
                                <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border text-violet-400 bg-violet-500/10 border-violet-500/20">Email template set</span>
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
      </div>

    </div>
  );
}
