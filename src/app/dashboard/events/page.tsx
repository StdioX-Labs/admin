'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { eventsApi } from "@/lib/api";

interface Ticket {
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

interface Event {
  id: number;
  eventName: string;
  eventDescription: string;
  eventPosterUrl: string;
  eventCategoryId: number;
  ticketSaleStartDate: string;
  ticketSaleEndDate: string;
  eventLocation: string;
  eventStartDate: string;
  eventEndDate: string;
  isActive: boolean;
  tickets: Ticket[];
  createdById: number;
  companyId: number;
  companyName: string;
  comission: number;
  category: string;
  date: string;
  time: string;
  isFeatured: boolean;
  price: number;
  slug: string;
  currency: string;
}

interface EventStats {
  totalEvents: number;
  liveEvents: number;
  totalRevenue: number;
  totalTicketsSold: number;
  upcomingEvents: number;
  completedEvents: number;
}

export default function EventsDashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await eventsApi.getAllEvents();

        if (response.events && Array.isArray(response.events)) {
          setEvents(response.events);

          // Cache events in localStorage for detail page
          localStorage.setItem('eventsCache', JSON.stringify(response.events));

          // Calculate stats from the events
          const totalEvents = response.events.length;
          const liveEvents = response.events.filter((e: Event) => e.isActive).length;
          const totalTicketsSold = response.events.reduce((sum: number, e: Event) => {
            return sum + e.tickets.reduce((ticketSum, t) => ticketSum + t.soldQuantity, 0);
          }, 0);
          const totalRevenue = response.events.reduce((sum: number, e: Event) => {
            return sum + e.tickets.reduce((ticketSum, t) => ticketSum + (t.soldQuantity * t.ticketPrice), 0);
          }, 0);

          // Count upcoming events (events with future start dates)
          const now = new Date();
          const upcomingEvents = response.events.filter((e: Event) => {
            const startDate = new Date(e.eventStartDate);
            return startDate > now;
          }).length;

          // Count completed events (events with past end dates)
          const completedEvents = response.events.filter((e: Event) => {
            const endDate = new Date(e.eventEndDate);
            return endDate < now;
          }).length;

          setStats({
            totalEvents,
            liveEvents,
            totalRevenue,
            totalTicketsSold,
            upcomingEvents,
            completedEvents
          });
        }
      } catch (err: any) {
        console.error('Error fetching events:', err);
        setError(err?.message || 'Failed to load events data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.eventLocation.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && event.isActive) ||
                         (filterStatus === 'inactive' && !event.isActive);
    const matchesCategory = filterCategory === 'all' || event.category === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Get unique categories from events
  const categories = Array.from(new Set(events.map(e => e.category))).filter(Boolean);

  const getStatusBadge = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, string> = {
      'Music Events': 'bg-purple-100 text-purple-800 border-purple-200',
      'Conference': 'bg-blue-100 text-blue-800 border-blue-200',
      'Workshop': 'bg-orange-100 text-orange-800 border-orange-200',
      'Sports': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
    return styles[category] || 'bg-indigo-100 text-indigo-800 border-indigo-200';
  };

  const formatCurrency = (amount: number, currency: string = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTicketProgress = (event: Event) => {
    const totalAvailable = event.tickets.reduce((sum, t) => sum + t.quantityAvailable, 0);
    const totalSold = event.tickets.reduce((sum, t) => sum + t.soldQuantity, 0);
    return totalAvailable > 0 ? Math.round((totalSold / totalAvailable) * 100) : 0;
  };

  const getTotalTickets = (event: Event) => {
    const totalAvailable = event.tickets.reduce((sum, t) => sum + t.quantityAvailable, 0);
    const totalSold = event.tickets.reduce((sum, t) => sum + t.soldQuantity, 0);
    return { sold: totalSold, total: totalAvailable };
  };

  const getEventRevenue = (event: Event) => {
    return event.tickets.reduce((sum, t) => sum + (t.soldQuantity * t.ticketPrice), 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-3"></div>
          <p className="text-slate-600 text-sm">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Events Dashboard</h1>
            <p className="text-slate-600 text-sm mt-1">Manage and monitor all events</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/dashboard/events/analytics')}
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
            >
              Analytics
            </Button>
            <Button
              onClick={() => router.push('/dashboard/events/create')}
              size="sm"
              className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              Create Event
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="space-y-3">
            {/* First Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total Events</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalEvents}</p>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Active Events</p>
                    <p className="text-2xl font-bold text-green-600">{stats.liveEvents}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Total Revenue</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Tickets Sold</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalTicketsSold}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a1 1 0 001 1h1a1 1 0 001-1V7a2 2 0 00-2-2H5zM5 14a2 2 0 00-2 2v3a1 1 0 001 1h1a1 1 0 001-1v-3a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Upcoming Events</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.upcomingEvents}</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Completed Events</p>
                    <p className="text-2xl font-bold text-slate-600">{stats.completedEvents}</p>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <Card className="p-4 bg-white border border-slate-200">
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Search events, organizers, or locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 border-slate-200 focus:border-slate-500 focus:ring-slate-500 text-sm"
            />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-4">
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-600">Status:</span>
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as typeof filterStatus)}>
                  <SelectTrigger className="h-9 border-slate-200 focus:border-slate-500 focus:ring-slate-500 text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-600">Category:</span>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-9 border-slate-200 focus:border-slate-500 focus:ring-slate-500 text-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* Events Table */}
        <Card className="bg-white border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Events</h3>
            <p className="text-xs text-slate-600 mt-1">
              {filteredEvents.length} of {events.length} events
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Event</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Date & Time</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Tickets</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Revenue</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredEvents.map((event) => {
                  const ticketStats = getTotalTickets(event);
                  const progress = getTicketProgress(event);
                  const revenue = getEventRevenue(event);

                  return (
                    <tr key={event.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="px-4 py-3">
                        <div className="max-w-48">
                          <p className="font-medium text-slate-900 truncate" title={event.eventName}>{event.eventName}</p>
                          <p className="text-xs text-slate-500 truncate" title={event.eventLocation}>{event.eventLocation}</p>
                          <p className="text-xs text-slate-400 truncate" title={event.companyName}>by {event.companyName}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="text-slate-900">{event.date}</p>
                          <p className="text-xs text-slate-500">{event.time}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStatusBadge(event.isActive)}`}>
                          {event.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getCategoryBadge(event.category)}`}>
                          {event.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="text-slate-900">{ticketStats.sold}/{ticketStats.total}</p>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-slate-500">{progress}%</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">{formatCurrency(revenue, event.currency)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            onClick={() => router.push(`/dashboard/events/${event.id}`)}
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            View
                          </Button>
                          <Button
                            onClick={() => router.push(`/dashboard/events/${event.id}/edit`)}
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-8">
              <svg className="mx-auto h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-slate-900">No events found</h3>
              <p className="mt-1 text-xs text-slate-500">Try adjusting your search or filter criteria.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}