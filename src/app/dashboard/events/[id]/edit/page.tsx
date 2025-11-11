'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { eventsApi } from "@/lib/api";

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

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const eventId = unwrappedParams.id;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingTicketId, setEditingTicketId] = useState<number | null>(null);

  // Event form state
  const [eventForm, setEventForm] = useState({
    eventName: '',
    eventDescription: '',
    eventCategory: '',
    eventLocation: '',
    ticketSaleStartDate: '',
    ticketSaleEndDate: '',
    eventStartDate: '',
    eventEndDate: '',
    active: true,
  });

  // Ticket form state
  const [ticketForms, setTicketForms] = useState<Record<number, Partial<Ticket>>>({});

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    setIsLoading(true);
    setError('');
    try {
      console.log('[Edit Event] Fetching event:', eventId);
      const response = await eventsApi.getEventById(eventId);

      console.log('[Edit Event] API response:', response);

      if (response.status && response.event) {
        const eventData = response.event;

        // Map the API response to our EventDetail interface
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
          tickets: eventData.tickets.map((ticket: any) => ({
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

        // Initialize event form with current data
        setEventForm({
          eventName: mappedEvent.eventName || '',
          eventDescription: mappedEvent.eventDescription || '',
          eventCategory: mappedEvent.eventCategory || '',
          eventLocation: mappedEvent.eventLocation || '',
          ticketSaleStartDate: formatDateTimeLocal(mappedEvent.ticketSaleStartDate),
          ticketSaleEndDate: formatDateTimeLocal(mappedEvent.ticketSaleEndDate),
          eventStartDate: formatDateTimeLocal(mappedEvent.eventStartDate),
          eventEndDate: formatDateTimeLocal(mappedEvent.eventEndDate),
          active: mappedEvent.active,
        });

        // Initialize ticket forms with proper defaults to prevent NaN errors
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
    } catch (err: any) {
      console.error('[Edit Event] Error fetching event:', err);
      setError(err?.message || 'Failed to load event data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTimeLocal = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
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
        ticketSaleStartDate: formatToISO(eventForm.ticketSaleStartDate),
        ticketSaleEndDate: formatToISO(eventForm.ticketSaleEndDate),
        eventStartDate: formatToISO(eventForm.eventStartDate),
        eventEndDate: formatToISO(eventForm.eventEndDate),
        active: eventForm.active,
      };

      console.log('[Edit Event] Updating event with:', updateData);
      const response = await eventsApi.updateEvent(eventId, updateData);

      console.log('[Edit Event] Update response:', response);

      if (response.status === true) {
        setSuccess('Event updated successfully!');
        // Refresh event data
        await fetchEvent();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.message || 'Failed to update event');
      }
    } catch (err: any) {
      console.error('[Edit Event] Error updating event:', err);
      setError(err?.message || 'Failed to update event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTicketSubmit = async (ticketId: number) => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const ticketData = ticketForms[ticketId];
      if (!ticketData) {
        setError('Ticket data not found');
        setIsSaving(false);
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

      console.log('[Edit Event] Updating ticket ID:', ticketId);
      console.log('[Edit Event] Updating ticket with:', updateData);
      const response = await eventsApi.updateTicket(ticketId, updateData);

      console.log('[Edit Event] Ticket update response:', response);

      if (response.status === true) {
        setSuccess(`Ticket "${ticketData.ticketName}" updated successfully!`);
        setEditingTicketId(null);
        // Refresh event data
        await fetchEvent();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.message || 'Failed to update ticket');
      }
    } catch (err: any) {
      console.error('[Edit Event] Error updating ticket:', err);
      setError(err?.message || 'Failed to update ticket');
    } finally {
      setIsSaving(false);
    }
  };

  const updateTicketForm = (ticketId: number, field: string, value: any) => {
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
          <div className="relative inline-flex items-center justify-center">
            {/* Outer spinning ring */}
            <div className="absolute w-20 h-20 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute w-20 h-20 border-4 border-transparent border-t-slate-600 rounded-full animate-spin"></div>

            {/* Inner pulsing circle */}
            <div className="w-12 h-12 bg-slate-600 rounded-full animate-pulse flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <h3 className="text-lg font-semibold text-slate-900">Loading Event</h3>
            <p className="text-sm text-slate-600">Please wait while we fetch the event details...</p>

            {/* Animated dots */}
            <div className="flex items-center justify-center gap-1 mt-4">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">Event Not Found</h2>
            <p className="text-slate-600 mb-6">
              The event you're looking for doesn't exist or may have been deleted.
            </p>

            <Button
              onClick={() => router.push('/dashboard/events')}
              className="w-full"
            >
              Back to Events
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Edit Event</h1>
            <p className="text-slate-600 mt-1">Event ID: {eventId}</p>
          </div>
          <Button
            onClick={() => router.push('/dashboard/events')}
            variant="outline"
          >
            Back to Events
          </Button>
        </div>

        {/* Success/Error Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        {/* Event Details Form */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Event Details</h2>
          <form onSubmit={handleEventSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventName">Event Name</Label>
                <Input
                  id="eventName"
                  value={eventForm.eventName}
                  onChange={(e) => setEventForm({ ...eventForm, eventName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventCategory">Category</Label>
                <Input
                  id="eventCategory"
                  value={eventForm.eventCategory}
                  onChange={(e) => setEventForm({ ...eventForm, eventCategory: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="eventLocation">Location</Label>
                <Input
                  id="eventLocation"
                  value={eventForm.eventLocation}
                  onChange={(e) => setEventForm({ ...eventForm, eventLocation: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="eventDescription">Description</Label>
                <textarea
                  id="eventDescription"
                  value={eventForm.eventDescription}
                  onChange={(e) => setEventForm({ ...eventForm, eventDescription: e.target.value })}
                  className="w-full min-h-[100px] px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticketSaleStartDate">Ticket Sale Start</Label>
                <Input
                  id="ticketSaleStartDate"
                  type="datetime-local"
                  value={eventForm.ticketSaleStartDate}
                  onChange={(e) => setEventForm({ ...eventForm, ticketSaleStartDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticketSaleEndDate">Ticket Sale End</Label>
                <Input
                  id="ticketSaleEndDate"
                  type="datetime-local"
                  value={eventForm.ticketSaleEndDate}
                  onChange={(e) => setEventForm({ ...eventForm, ticketSaleEndDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventStartDate">Event Start</Label>
                <Input
                  id="eventStartDate"
                  type="datetime-local"
                  value={eventForm.eventStartDate}
                  onChange={(e) => setEventForm({ ...eventForm, eventStartDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventEndDate">Event End</Label>
                <Input
                  id="eventEndDate"
                  type="datetime-local"
                  value={eventForm.eventEndDate}
                  onChange={(e) => setEventForm({ ...eventForm, eventEndDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="active">Status</Label>
                <select
                  id="active"
                  value={eventForm.active ? 'true' : 'false'}
                  onChange={(e) => setEventForm({ ...eventForm, active: e.target.value === 'true' })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Update Event'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Tickets Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Tickets ({event.tickets.length})</h2>
          <div className="space-y-4">
            {event.tickets.map((ticket) => {
              const ticketForm = ticketForms[ticket.ticketId] || ticket;
              const isEditing = editingTicketId === ticket.ticketId;

              return (
                <Card key={ticket.ticketId} className="p-4 border-2 border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {ticket.ticketName}
                    </h3>
                    <div className="flex gap-2">
                      {!isEditing ? (
                        <Button
                          onClick={() => setEditingTicketId(ticket.ticketId)}
                          variant="outline"
                          size="sm"
                        >
                          Edit
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleTicketSubmit(ticket.ticketId)}
                            size="sm"
                            disabled={isSaving}
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingTicketId(null);
                              // Reset form with proper defaults
                              setTicketForms(prev => ({
                                ...prev,
                                [ticket.ticketId]: {
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
                                },
                              }));
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ticket Name</Label>
                        <Input
                          value={ticketForm.ticketName || ''}
                          onChange={(e) => updateTicketForm(ticket.ticketId, 'ticketName', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Price (KES)</Label>
                        <Input
                          type="number"
                          value={ticketForm.ticketPrice ?? 0}
                          onChange={(e) => updateTicketForm(ticket.ticketId, 'ticketPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Quantity Available</Label>
                        <Input
                          type="number"
                          value={ticketForm.quantityAvailable ?? 0}
                          onChange={(e) => updateTicketForm(ticket.ticketId, 'quantityAvailable', parseInt(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Tickets to Issue</Label>
                        <Input
                          type="number"
                          value={ticketForm.ticketsToIssue ?? 1}
                          onChange={(e) => updateTicketForm(ticket.ticketId, 'ticketsToIssue', parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Limit Per Person</Label>
                        <Input
                          type="number"
                          value={ticketForm.ticketLimitPerPerson ?? 0}
                          onChange={(e) => updateTicketForm(ticket.ticketId, 'ticketLimitPerPerson', parseInt(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Complementary Tickets</Label>
                        <Input
                          type="number"
                          value={ticketForm.numberOfComplementary ?? 0}
                          onChange={(e) => updateTicketForm(ticket.ticketId, 'numberOfComplementary', parseInt(e.target.value) || 0)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Sale Start Date</Label>
                        <Input
                          type="datetime-local"
                          value={ticketForm.ticketSaleStartDate}
                          onChange={(e) => updateTicketForm(ticket.ticketId, 'ticketSaleStartDate', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Sale End Date</Label>
                        <Input
                          type="datetime-local"
                          value={ticketForm.ticketSaleEndDate}
                          onChange={(e) => updateTicketForm(ticket.ticketId, 'ticketSaleEndDate', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Status</Label>
                        <select
                          value={ticketForm.isActive ? 'true' : 'false'}
                          onChange={(e) => updateTicketForm(ticket.ticketId, 'isActive', e.target.value === 'true')}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md"
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>Free Ticket</Label>
                        <select
                          value={ticketForm.isFree ? 'true' : 'false'}
                          onChange={(e) => updateTicketForm(ticket.ticketId, 'isFree', e.target.value === 'true')}
                          className="w-full px-3 py-2 border border-slate-200 rounded-md"
                        >
                          <option value="false">Paid</option>
                          <option value="true">Free</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-slate-600">Price:</span>
                        <p className="font-medium">KES {ticket.ticketPrice.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-slate-600">Available:</span>
                        <p className="font-medium">{ticket.quantityAvailable}</p>
                      </div>
                      <div>
                        <span className="text-slate-600">Sold:</span>
                        <p className="font-medium">{ticket.soldQuantity}</p>
                      </div>
                      <div>
                        <span className="text-slate-600">Status:</span>
                        <p className={`font-medium ${ticket.isActive ? 'text-green-600' : 'text-gray-600'}`}>
                          {ticket.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

