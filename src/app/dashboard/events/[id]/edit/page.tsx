'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { eventsApi } from "@/lib/api";
import Image from 'next/image';
import { ArrowLeft, Plus, X, Loader2, CheckCircle2 } from 'lucide-react';

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
  createdAt: string;
}

interface EventDetail {
  eventId: number;
  eventName: string;
  slug: string;
  eventDescription: string;
  eventPosterUrl: string;
  eventCategory: string;
  eventLocation: string;
  ticketSaleStartDate: string;
  ticketSaleEndDate: string;
  eventStartDate: string;
  eventEndDate: string;
  active: boolean;
  status: string;
  tickets: Ticket[];
}

interface NewTicketForm {
  ticketName: string;
  ticketPrice: number;
  quantityAvailable: number;
  ticketsToIssue: number;
  ticketLimitPerPerson: number;
  numberOfComplementary: number;
  ticketSaleStartDate: string;
  ticketSaleEndDate: string;
  isFree: boolean;
}

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const eventId = unwrappedParams.id;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [savingTicketId, setSavingTicketId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingTicketId, setEditingTicketId] = useState<number | null>(null);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);

  const [eventForm, setEventForm] = useState({
    eventName: '',
    eventDescription: '',
    eventCategory: '',
    eventLocation: '',
    eventPosterUrl: '',
    ticketSaleStartDate: '',
    ticketSaleEndDate: '',
    eventStartDate: '',
    eventEndDate: '',
  });

  const [ticketForms, setTicketForms] = useState<Record<number, Partial<Ticket>>>({});

  const [newTicketForm, setNewTicketForm] = useState<NewTicketForm>({
    ticketName: '',
    ticketPrice: 0,
    quantityAvailable: 0,
    ticketsToIssue: 1,
    ticketLimitPerPerson: 0,
    numberOfComplementary: 0,
    ticketSaleStartDate: '',
    ticketSaleEndDate: '',
    isFree: false,
  });

  useEffect(() => {
    fetchEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchEvent = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await eventsApi.getEventById(eventId);
      if (response.status && response.event) {
        const eventData = response.event as ApiEvent;
        const mappedEvent: EventDetail = {
          eventId: eventData.id,
          eventName: eventData.eventName,
          slug: eventData.slug,
          eventDescription: eventData.eventDescription,
          eventPosterUrl: eventData.eventPosterUrl,
          eventCategory: eventData.category,
          eventLocation: eventData.eventLocation,
          ticketSaleStartDate: eventData.ticketSaleStartDate,
          ticketSaleEndDate: eventData.ticketSaleEndDate,
          eventStartDate: eventData.eventStartDate,
          eventEndDate: eventData.eventEndDate,
          active: eventData.isActive,
          status: eventData.isActive ? 'ACTIVE' : 'INACTIVE',
          tickets: eventData.tickets.map((ticket: ApiTicket) => ({
            ticketId: ticket.id,
            ticketName: ticket.ticketName,
            ticketPrice: ticket.ticketPrice,
            quantityAvailable: ticket.quantityAvailable,
            soldQuantity: ticket.soldQuantity,
            isActive: ticket.isActive,
            ticketsToIssue: ticket.ticketsToIssue,
            isSoldOut: ticket.isSoldOut,
            ticketLimitPerPerson: ticket.ticketLimitPerPerson,
            numberOfComplementary: ticket.numberOfComplementary,
            ticketSaleStartDate: ticket.ticketSaleStartDate,
            ticketSaleEndDate: ticket.ticketSaleEndDate,
            isFree: ticket.isFree,
            ticketStatus: ticket.ticketStatus,
            createdAt: ticket.createAt,
          })),
        } as EventDetail;

        setEvent(mappedEvent);
        setEventForm({
          eventName: mappedEvent.eventName || '',
          eventDescription: mappedEvent.eventDescription || '',
          eventCategory: mappedEvent.eventCategory || '',
          eventLocation: mappedEvent.eventLocation || '',
          eventPosterUrl: mappedEvent.eventPosterUrl || '',
          ticketSaleStartDate: formatDateTimeLocal(mappedEvent.ticketSaleStartDate),
          ticketSaleEndDate: formatDateTimeLocal(mappedEvent.ticketSaleEndDate),
          eventStartDate: formatDateTimeLocal(mappedEvent.eventStartDate),
          eventEndDate: formatDateTimeLocal(mappedEvent.eventEndDate),
        });

        const initialTicketForms: Record<number, Partial<Ticket>> = {};
        mappedEvent.tickets.forEach((ticket: Ticket) => {
          initialTicketForms[ticket.ticketId] = {
            ticketName: ticket.ticketName || '',
            ticketPrice: ticket.ticketPrice ?? 0,
            quantityAvailable: ticket.quantityAvailable ?? 0,
            isActive: ticket.isActive ?? true,
            ticketsToIssue: ticket.ticketsToIssue ?? 1,
            ticketLimitPerPerson: ticket.ticketLimitPerPerson ?? 0,
            numberOfComplementary: ticket.numberOfComplementary ?? 0,
            ticketSaleStartDate: formatDateTimeLocal(ticket.ticketSaleStartDate),
            ticketSaleEndDate: formatDateTimeLocal(ticket.ticketSaleEndDate),
            isFree: ticket.isFree ?? false,
          };
        });
        setTicketForms(initialTicketForms);
      } else {
        setError(response.message || 'Failed to load event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTimeLocal = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const formatToISO = (dateTimeLocal: string): string => {
    if (!dateTimeLocal) return '';
    return new Date(dateTimeLocal).toISOString();
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      
      const response = await fetch('https://api.cloudinary.com/v1_1/deubdntzs/image/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload image');

      const data = await response.json();
      setEventForm({ ...eventForm, eventPosterUrl: data.secure_url });
      setSuccess('✅ Image uploaded successfully!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const updateData = {
        eventName: eventForm.eventName,
        eventDescription: eventForm.eventDescription,
        eventCategory: eventForm.eventCategory,
        eventLocation: eventForm.eventLocation,
        eventPosterUrl: eventForm.eventPosterUrl,
        ticketSaleStartDate: formatToISO(eventForm.ticketSaleStartDate),
        ticketSaleEndDate: formatToISO(eventForm.ticketSaleEndDate),
        eventStartDate: formatToISO(eventForm.eventStartDate),
        eventEndDate: formatToISO(eventForm.eventEndDate),
      };

      const response = await eventsApi.updateEvent(eventId, updateData);

      if (response.status === true) {
        setSuccess('✅ Event updated successfully!');
        await fetchEvent();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(response.message || 'Failed to update event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTicketSubmit = async (ticketId: number) => {
    setSavingTicketId(ticketId);
    setError('');
    setSuccess('');

    try {
      const ticketData = ticketForms[ticketId];
      if (!ticketData) {
        setError('Ticket data not found');
        setSavingTicketId(null);
        return;
      }

      const updateData = {
        ticketName: ticketData.ticketName,
        ticketPrice: ticketData.ticketPrice,
        quantityAvailable: ticketData.quantityAvailable,
        isActive: ticketData.isActive,
        ticketsToIssue: ticketData.ticketsToIssue,
        ticketLimitPerPerson: ticketData.ticketLimitPerPerson,
        numberOfComplementary: ticketData.numberOfComplementary,
        ticketSaleStartDate: ticketData.ticketSaleStartDate ? formatToISO(ticketData.ticketSaleStartDate) : undefined,
        ticketSaleEndDate: ticketData.ticketSaleEndDate ? formatToISO(ticketData.ticketSaleEndDate) : undefined,
        isFree: ticketData.isFree,
      };

      const response = await eventsApi.updateTicket(ticketId, updateData);

      if (response.status === true) {
        setSuccess(`✅ Ticket "${ticketData.ticketName}" updated successfully!`);
        setEditingTicketId(null);
        await fetchEvent();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(response.message || 'Failed to update ticket');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket');
    } finally {
      setSavingTicketId(null);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const createData = {
        event: {
          id: parseInt(eventId)
        },
        ticketName: newTicketForm.ticketName,
        ticketPrice: newTicketForm.ticketPrice,
        quantityAvailable: newTicketForm.quantityAvailable,
        ticketsToIssue: newTicketForm.ticketsToIssue,
        ticketLimitPerPerson: newTicketForm.ticketLimitPerPerson,
        numberOfComplementary: newTicketForm.numberOfComplementary,
        ticketSaleStartDate: formatToISO(newTicketForm.ticketSaleStartDate),
        ticketSaleEndDate: formatToISO(newTicketForm.ticketSaleEndDate),
        isFree: newTicketForm.isFree,
      };

      const response = await eventsApi.createTicket(createData);

      if (response.status === true) {
        setSuccess(`✅ Ticket "${newTicketForm.ticketName}" created successfully!`);
        setShowNewTicketForm(false);
        setNewTicketForm({
          ticketName: '',
          ticketPrice: 0,
          quantityAvailable: 0,
          ticketsToIssue: 1,
          ticketLimitPerPerson: 0,
          numberOfComplementary: 0,
          ticketSaleStartDate: '',
          ticketSaleEndDate: '',
          isFree: false,
        });
        await fetchEvent();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(response.message || 'Failed to create ticket');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setIsSaving(false);
    }
  };

  const updateTicketForm = (ticketId: number, field: string, value: string | number | boolean) => {
    setTicketForms(prev => ({
      ...prev,
      [ticketId]: {
        ...prev[ticketId],
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-sm">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Event Not Found</h2>
          <p className="text-slate-600 mb-6">The event you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.push('/dashboard/events')}>Back to Events</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button onClick={() => router.push('/dashboard/events')} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="h-6 w-px bg-slate-300" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Edit Event</h1>
            <p className="text-slate-600 text-sm">ID: {eventId} • {event.eventName}</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="animate-in slide-in-from-top-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="border-green-200 bg-green-50 animate-in slide-in-from-top-2">
            <AlertDescription className="text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {success}
            </AlertDescription>
          </Alert>
        )}

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6">📋 Event Details</h2>
          <form onSubmit={handleEventSubmit} className="space-y-6">
            <div className="bg-indigo-50 p-6 rounded-lg border-2 border-indigo-200">
              <Label className="text-lg font-semibold mb-3 block">Event Poster</Label>
              <div className="flex flex-col md:flex-row gap-6">
                {eventForm.eventPosterUrl && (
                  <div className="relative w-full md:w-64 h-80 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                    <Image src={eventForm.eventPosterUrl} alt="Event Poster" fill className="object-cover" />
                  </div>
                )}
                <div className="flex-1 space-y-4">
                  <div>
                    <Label htmlFor="posterUpload" className="mb-2 block">Upload New Poster</Label>
                    <Input id="posterUpload" type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }} disabled={isUploading} />
                    {isUploading && <p className="text-sm text-blue-600 mt-2 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Uploading image to Cloudinary...</p>}
                  </div>
                  <div>
                    <Label htmlFor="eventPosterUrl">Or Enter Image URL</Label>
                    <Input id="eventPosterUrl" value={eventForm.eventPosterUrl} onChange={(e) => setEventForm({ ...eventForm, eventPosterUrl: e.target.value })} placeholder="https://example.com/image.jpg" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><Label>Event Name *</Label><Input value={eventForm.eventName} onChange={(e) => setEventForm({ ...eventForm, eventName: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Category *</Label><Input value={eventForm.eventCategory} onChange={(e) => setEventForm({ ...eventForm, eventCategory: e.target.value })} required /></div>
              <div className="space-y-2 md:col-span-2"><Label>Location *</Label><Input value={eventForm.eventLocation} onChange={(e) => setEventForm({ ...eventForm, eventLocation: e.target.value })} required /></div>
              <div className="space-y-2 md:col-span-2"><Label>Description *</Label><textarea value={eventForm.eventDescription} onChange={(e) => setEventForm({ ...eventForm, eventDescription: e.target.value })} className="w-full min-h-[120px] px-3 py-2 border rounded-md" required /></div>
              <div className="space-y-2"><Label>Ticket Sale Start *</Label><Input type="datetime-local" value={eventForm.ticketSaleStartDate} onChange={(e) => setEventForm({ ...eventForm, ticketSaleStartDate: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Ticket Sale End *</Label><Input type="datetime-local" value={eventForm.ticketSaleEndDate} onChange={(e) => setEventForm({ ...eventForm, ticketSaleEndDate: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Event Start *</Label><Input type="datetime-local" value={eventForm.eventStartDate} onChange={(e) => setEventForm({ ...eventForm, eventStartDate: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Event End *</Label><Input type="datetime-local" value={eventForm.eventEndDate} onChange={(e) => setEventForm({ ...eventForm, eventEndDate: e.target.value })} required /></div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={isSaving || isUploading}>
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  'Update Event'
                )}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">🎟️ Tickets ({event.tickets.length})</h2>
            <Button onClick={() => setShowNewTicketForm(!showNewTicketForm)} variant={showNewTicketForm ? "outline" : "default"}>
              {showNewTicketForm ? <><X className="h-4 w-4 mr-2" />Cancel</> : <><Plus className="h-4 w-4 mr-2" />Add Ticket</>}
            </Button>
          </div>

          {showNewTicketForm && (
            <Card className="p-6 mb-6 bg-green-50 border-2 border-green-200">
              <h3 className="text-lg font-semibold mb-4">Create New Ticket</h3>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Ticket Name *</Label><Input value={newTicketForm.ticketName} onChange={(e) => setNewTicketForm({ ...newTicketForm, ticketName: e.target.value })} required /></div>
                  <div><Label>Price (KES) *</Label><Input type="number" step="0.01" value={newTicketForm.ticketPrice} onChange={(e) => setNewTicketForm({ ...newTicketForm, ticketPrice: parseFloat(e.target.value) || 0 })} required /></div>
                  <div><Label>Quantity *</Label><Input type="number" value={newTicketForm.quantityAvailable} onChange={(e) => setNewTicketForm({ ...newTicketForm, quantityAvailable: parseInt(e.target.value) || 0 })} required /></div>
                  <div><Label>Tickets to Issue *</Label><Input type="number" value={newTicketForm.ticketsToIssue} onChange={(e) => setNewTicketForm({ ...newTicketForm, ticketsToIssue: parseInt(e.target.value) || 1 })} required /></div>
                  <div><Label>Limit Per Person</Label><Input type="number" value={newTicketForm.ticketLimitPerPerson} onChange={(e) => setNewTicketForm({ ...newTicketForm, ticketLimitPerPerson: parseInt(e.target.value) || 0 })} /></div>
                  <div><Label>Complementary</Label><Input type="number" value={newTicketForm.numberOfComplementary} onChange={(e) => setNewTicketForm({ ...newTicketForm, numberOfComplementary: parseInt(e.target.value) || 0 })} /></div>
                  <div><Label>Sale Start *</Label><Input type="datetime-local" value={newTicketForm.ticketSaleStartDate} onChange={(e) => setNewTicketForm({ ...newTicketForm, ticketSaleStartDate: e.target.value })} required /></div>
                  <div><Label>Sale End *</Label><Input type="datetime-local" value={newTicketForm.ticketSaleEndDate} onChange={(e) => setNewTicketForm({ ...newTicketForm, ticketSaleEndDate: e.target.value })} required /></div>
                  <div><Label>Free Ticket</Label><select value={newTicketForm.isFree ? 'true' : 'false'} onChange={(e) => setNewTicketForm({ ...newTicketForm, isFree: e.target.value === 'true' })} className="w-full px-3 py-2 border rounded-md"><option value="false">Paid</option><option value="true">Free</option></select></div>
                </div>
                <div className="flex justify-end pt-4 border-t">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                    ) : (
                      'Create Ticket'
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="space-y-4">
            {event.tickets.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed">
                <p className="text-slate-600">No tickets yet. Create your first ticket!</p>
              </div>
            ) : (
              event.tickets.map((ticket) => {
                const ticketForm = ticketForms[ticket.ticketId] || ticket;
                const isEditing = editingTicketId === ticket.ticketId;
                return (
                  <Card key={ticket.ticketId} className="p-5 border-2">
                    <div className="flex justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{ticket.ticketName}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ticket.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{ticket.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div className="flex gap-2">
                        {!isEditing ? (
                          <Button onClick={() => setEditingTicketId(ticket.ticketId)} variant="outline" size="sm">Edit</Button>
                        ) : (
                          <>
                            <Button onClick={() => handleTicketSubmit(ticket.ticketId)} size="sm" disabled={savingTicketId === ticket.ticketId}>
                              {savingTicketId === ticket.ticketId ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                              ) : (
                                'Save'
                              )}
                            </Button>
                            <Button onClick={() => setEditingTicketId(null)} variant="outline" size="sm" disabled={savingTicketId === ticket.ticketId}>Cancel</Button>
                          </>
                        )}
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div><Label>Name</Label><Input value={ticketForm.ticketName || ''} onChange={(e) => updateTicketForm(ticket.ticketId, 'ticketName', e.target.value)} /></div>
                        <div><Label>Price</Label><Input type="number" step="0.01" value={ticketForm.ticketPrice ?? 0} onChange={(e) => updateTicketForm(ticket.ticketId, 'ticketPrice', parseFloat(e.target.value) || 0)} /></div>
                        <div><Label>Quantity</Label><Input type="number" value={ticketForm.quantityAvailable ?? 0} onChange={(e) => updateTicketForm(ticket.ticketId, 'quantityAvailable', parseInt(e.target.value) || 0)} /></div>
                        <div><Label>To Issue</Label><Input type="number" value={ticketForm.ticketsToIssue ?? 1} onChange={(e) => updateTicketForm(ticket.ticketId, 'ticketsToIssue', parseInt(e.target.value) || 1)} /></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div><span className="text-slate-600 block">Price</span><p className="font-semibold text-lg">KES {ticket.ticketPrice.toLocaleString()}</p></div>
                        <div><span className="text-slate-600 block">Available</span><p className="font-semibold text-lg">{ticket.quantityAvailable}</p></div>
                        <div><span className="text-slate-600 block">Sold</span><p className="font-semibold text-lg text-blue-600">{ticket.soldQuantity}</p></div>
                        <div><span className="text-slate-600 block">Remaining</span><p className="font-semibold text-lg text-green-600">{ticket.quantityAvailable - ticket.soldQuantity}</p></div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
