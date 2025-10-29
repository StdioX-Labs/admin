"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import { 
  MapPin,
  Clock, 
  Users, 
  DollarSign, 
  Tag, 
  Edit, 
  BarChart3,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Image as ImageIcon,
  Globe,
  Building2,
  Star,
  Ticket,
  Info,
  Share2,
  X,
  Maximize2
} from "lucide-react"
import Image from "next/image"
import { eventsApi } from "@/lib/api"

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

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        // First, try to get from localStorage cache
        const cachedEvents = localStorage.getItem('eventsCache');
        if (cachedEvents) {
          const events: Event[] = JSON.parse(cachedEvents);
          const foundEvent = events.find(e => e.id.toString() === params.id);
          if (foundEvent) {
            setEvent(foundEvent);
            setLoading(false);
            return;
          }
        }

        // If not in cache, fetch from API
        const response = await eventsApi.getAllEvents();
        if (response.events && Array.isArray(response.events)) {
          const foundEvent = response.events.find((e: Event) => e.id.toString() === params.id);
          if (foundEvent) {
            setEvent(foundEvent);
            // Update cache
            localStorage.setItem('eventsCache', JSON.stringify(response.events));
          }
        }
      } catch (error) {
        console.error("Error fetching event:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Event not found</h2>
        <Button onClick={() => router.push("/dashboard/events")}>
          Back to Events
        </Button>
      </div>
    )
  }

  // Calculate stats from tickets
  const totalTicketsSold = event.tickets.reduce((sum, t) => sum + t.soldQuantity, 0);
  const totalCapacity = event.tickets.reduce((sum, t) => sum + t.quantityAvailable, 0);
  const totalRevenue = event.tickets.reduce((sum, t) => sum + (t.soldQuantity * t.ticketPrice), 0);
  const availableTickets = totalCapacity - totalTicketsSold;
  const attendanceRate = totalCapacity > 0 ? ((totalTicketsSold / totalCapacity) * 100).toFixed(1) : '0';

  // Determine event status based on dates
  const now = new Date();
  const startDate = new Date(event.eventStartDate);
  const endDate = new Date(event.eventEndDate);

  let eventStatus: "upcoming" | "ongoing" | "completed" | "cancelled";
  if (!event.isActive) {
    eventStatus = "cancelled";
  } else if (now < startDate) {
    eventStatus = "upcoming";
  } else if (now >= startDate && now <= endDate) {
    eventStatus = "ongoing";
  } else {
    eventStatus = "completed";
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "upcoming":
        return { icon: Clock, color: "text-blue-600 bg-blue-50 border-blue-200", label: "Upcoming" }
      case "ongoing":
        return { icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-200", label: "Ongoing" }
      case "completed":
        return { icon: CheckCircle2, color: "text-gray-600 bg-gray-50 border-gray-200", label: "Completed" }
      case "cancelled":
        return { icon: XCircle, color: "text-red-600 bg-red-50 border-red-200", label: "Cancelled" }
      default:
        return { icon: Clock, color: "text-gray-600 bg-gray-50 border-gray-200", label: status }
    }
  }

  const statusConfig = getStatusConfig(eventStatus)
  const StatusIcon = statusConfig.icon

  // Get active tickets for display
  const activeTickets = event.tickets.filter(t => t.isActive);
  const lowestPrice = activeTickets.length > 0
    ? Math.min(...activeTickets.map(t => t.ticketPrice))
    : event.price || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard/events")}
                className="hover:bg-slate-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="h-8 w-px bg-slate-300" />
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{event.eventName}</h1>
                <p className="text-sm text-slate-500 mt-1">Event ID: {event.id}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => {/* Share functionality */}}
                className="border-slate-300 hover:bg-slate-50"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/events/${event.id}/analytics`)}
                className="border-slate-300 hover:bg-slate-50"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
              <Button
                onClick={() => router.push(`/dashboard/events/${event.id}/edit`)}
                className="bg-slate-900 hover:bg-slate-800"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Event
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Hero Card with Poster */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event Poster */}
          <Card className="border-slate-200 shadow-lg overflow-hidden">
            <div className="relative aspect-[3/4] bg-slate-100">
              {event.eventPosterUrl ? (
                <Image
                  src={event.eventPosterUrl}
                  alt={`${event.eventName} poster`}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                  <div className="text-center space-y-3">
                    <ImageIcon className="w-16 h-16 text-slate-400 mx-auto" />
                    <p className="text-sm text-slate-500 font-medium">No poster available</p>
                  </div>
                </div>
              )}
              {/* Status Badge Overlay */}
              <div className="absolute top-4 right-4">
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full border ${statusConfig.color} backdrop-blur-md shadow-lg`}>
                  <StatusIcon className="w-4 h-4" />
                  <span className="font-semibold text-sm">{statusConfig.label}</span>
                </div>
              </div>
              {/* Price Badge */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-white/95 backdrop-blur-md rounded-lg p-4 shadow-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Starting From</p>
                      <p className="text-2xl font-bold text-slate-900">{event.currency} {lowestPrice.toLocaleString()}</p>
                    </div>
                    <Ticket className="w-8 h-8 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Event Description */}
          <Card className="lg:col-span-2 border-slate-200 shadow-lg overflow-hidden">
            <div className="relative h-56 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 overflow-hidden">
              <div className="absolute inset-0 bg-black/20" />
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -ml-24 -mb-24"></div>

              <div className="absolute inset-0 flex flex-col items-center justify-center px-8 py-6">
                <div className="text-center text-white space-y-4 max-w-2xl">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight drop-shadow-lg leading-tight">
                    {event.eventName}
                  </h2>

                  <div className="flex items-center justify-center space-x-2 text-white/95">
                    <Building2 className="w-4 h-4" />
                    <p className="text-sm font-semibold">
                      Organized by <span className="font-bold">{event.companyName}</span>
                    </p>
                  </div>

                  {event.category && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold text-white border border-white/40 shadow-lg">
                        {event.category}
                      </span>
                      {event.isFeatured && (
                        <span className="px-4 py-1.5 bg-yellow-400/30 backdrop-blur-md rounded-full text-xs font-semibold text-white border border-yellow-300/40 shadow-lg flex items-center">
                          <Star className="w-3.5 h-3.5 mr-1.5 fill-yellow-300 text-yellow-300" />
                          Featured Event
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <CardContent className="p-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-200">
                  <Info className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900">About This Event</h3>
                </div>

                {event.eventDescription && event.eventDescription.trim() !== '' ? (
                  <p className="text-slate-700 leading-relaxed text-base">{event.eventDescription}</p>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 px-4 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <Info className="w-12 h-12 text-slate-400 mb-3" />
                    <p className="text-slate-500 font-medium text-sm">No description available</p>
                    <p className="text-slate-400 text-xs mt-1">Event details have not been provided yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tickets Sold Card */}
          <Card className="border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Tickets Sold</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-4xl font-bold text-slate-900 mb-1">{totalTicketsSold.toLocaleString()}</p>
                  <p className="text-sm text-slate-500">of <span className="font-semibold text-slate-700">{totalCapacity.toLocaleString()}</span> capacity</p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-600">Attendance Rate</span>
                    <span className="text-sm font-bold text-blue-600">{attendanceRate}%</span>
                  </div>
                  <div className="relative w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 shadow-lg"
                      style={{ width: `${attendanceRate}%` }}
                    >
                      <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Card */}
          <Card className="border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Total Revenue</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-4xl font-bold text-slate-900 mb-1">
                    {event.currency} {totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-500">
                    Commission: <span className="font-semibold text-green-600">{event.comission}%</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Platform Fee</span>
                    <span className="text-sm font-bold text-slate-900">
                      {event.currency} {((totalRevenue * event.comission) / 100).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Tickets Card */}
          <Card className="border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Available</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-4xl font-bold text-slate-900 mb-1">{availableTickets.toLocaleString()}</p>
                  <p className="text-sm text-slate-500">tickets remaining</p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Total Capacity</span>
                    <span className="text-sm font-bold text-slate-900">{totalCapacity.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Types Card */}
          <Card className="border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-amber-600/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Tag className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Ticket Types</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-4xl font-bold text-slate-900 mb-1">{activeTickets.length}</p>
                  <p className="text-sm text-slate-500">active type{activeTickets.length !== 1 ? 's' : ''}</p>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Category</span>
                    <span className="text-sm font-bold text-slate-900 truncate max-w-[120px]" title={event.category}>
                      {event.category}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metadata Section */}
        <Card className="border-slate-200 shadow-md">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-slate-900">Event Metadata</CardTitle>
            <CardDescription>Comprehensive event details and scheduling</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Date & Time Section */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-purple-600" />
                  Date & Time
                </h4>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Event Period</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {new Date(event.eventStartDate).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                      {' - '}
                      {new Date(event.eventEndDate).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                  <div className="w-px h-10 bg-slate-200 mx-4 hidden sm:block" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sales Period</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {new Date(event.ticketSaleStartDate).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                      {' - '}
                      {new Date(event.ticketSaleEndDate).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location & Organizer */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-red-600" />
                  Location & Organization
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <MapPin className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Venue</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{event.eventLocation}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <Building2 className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Organizer</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{event.companyName}</p>
                      <p className="text-xs text-slate-500 mt-1">Company ID: {event.companyId}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Metadata */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                  <Info className="w-4 h-4 mr-2 text-amber-600" />
                  Event Metadata
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <Globe className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Event Slug</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1 break-all">{event.slug}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <Tag className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Category</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{event.category}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <DollarSign className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Commission</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{event.comission}%</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <Users className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Created By</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">User ID: {event.createdById}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-slate-200 shadow-md">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-slate-900">Quick Actions</CardTitle>
            <CardDescription>Manage this event</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Button
                className="w-full justify-start bg-slate-900 hover:bg-slate-800"
                onClick={() => router.push(`/dashboard/events/${event.id}/edit`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Event Details
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-slate-300 hover:bg-slate-50"
                onClick={() => router.push(`/dashboard/events/${event.id}/analytics`)}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-slate-300 hover:bg-slate-50"
                onClick={() => router.push(`/dashboard/b2b/companies/${event.companyId}`)}
              >
                <Building2 className="w-4 h-4 mr-2" />
                View Company
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-slate-300 hover:bg-slate-50"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                View Transactions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Types - Enhanced Section */}
        {activeTickets.length > 0 && (
          <div className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                  <Ticket className="w-7 h-7 mr-3 text-indigo-600" />
                  Ticket Types & Pricing
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Detailed breakdown of all available ticket categories
                </p>
              </div>
              <div className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 rounded-lg border border-indigo-200">
                <Ticket className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-semibold text-indigo-900">
                  {activeTickets.length} Active Type{activeTickets.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Tickets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {activeTickets.map((ticket) => {
                const soldPercentage = (ticket.soldQuantity / ticket.quantityAvailable) * 100;
                const remaining = ticket.quantityAvailable - ticket.soldQuantity;
                const isSelling = soldPercentage > 0 && soldPercentage < 100;
                const isLowStock = remaining > 0 && remaining <= 10;

                return (
                  <Card key={ticket.id} className="border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
                    {/* Ticket Header */}
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-4 relative overflow-hidden">
                      <div className="absolute inset-0 bg-black/10"></div>
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-bold text-white">{ticket.ticketName}</h3>
                          {ticket.isSoldOut && (
                            <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                              SOLD OUT
                            </span>
                          )}
                          {!ticket.isSoldOut && isLowStock && (
                            <span className="px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full shadow-lg animate-pulse">
                              LOW STOCK
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline space-x-2">
                          <span className="text-3xl font-bold text-white">
                            {event.currency} {ticket.ticketPrice.toLocaleString()}
                          </span>
                          {ticket.isFree && (
                            <span className="px-2 py-1 bg-green-400 text-green-900 text-xs font-bold rounded">
                              FREE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ticket Details */}
                    <CardContent className="p-5 space-y-4">
                      {/* Sales Progress */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Sales Progress
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {soldPercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${
                              ticket.isSoldOut 
                                ? 'bg-gradient-to-r from-red-500 to-red-600'
                                : isSelling 
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600' 
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${Math.min(soldPercentage, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          <span className="font-semibold text-slate-900">{ticket.soldQuantity}</span> sold of{' '}
                          <span className="font-semibold text-slate-900">{ticket.quantityAvailable}</span> available
                        </p>
                      </div>

                      {/* Ticket Info Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-xs font-medium text-slate-500 mb-1">Remaining</p>
                          <p className="text-xl font-bold text-slate-900">{remaining}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-xs font-medium text-slate-500 mb-1">Per Person</p>
                          <p className="text-xl font-bold text-slate-900">{ticket.ticketLimitPerPerson}</p>
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="space-y-2 pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Total to Issue:</span>
                          <span className="font-semibold text-slate-900">{ticket.ticketsToIssue}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Complementary:</span>
                          <span className="font-semibold text-slate-900">{ticket.numberOfComplementary}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            ticket.ticketStatus === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.ticketStatus.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Sale Dates - Enhanced */}
                      <div className="pt-3 border-t border-slate-200">
                        <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200">
                          <div className="flex items-center space-x-2 mb-3">
                            <Clock className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                            <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">Sale Period</h4>
                          </div>

                          <div className="space-y-3">
                            {/* Start Date */}
                            <div className="bg-white rounded-md p-3 border border-indigo-100">
                              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Starts</p>
                              <p className="text-sm font-bold text-slate-900">
                                {new Date(ticket.ticketSaleStartDate).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                              <p className="text-lg font-bold text-indigo-600 mt-1">
                                {new Date(ticket.ticketSaleStartDate).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                            </div>

                            {/* End Date */}
                            <div className="bg-white rounded-md p-3 border border-purple-100">
                              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">Ends</p>
                              <p className="text-sm font-bold text-slate-900">
                                {new Date(ticket.ticketSaleEndDate).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                              <p className="text-lg font-bold text-purple-600 mt-1">
                                {new Date(ticket.ticketSaleEndDate).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Revenue from this ticket type */}
                      <div className="pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-semibold text-green-900">Revenue</span>
                          </div>
                          <span className="text-lg font-bold text-green-900">
                            {event.currency} {(ticket.soldQuantity * ticket.ticketPrice).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Metadata Footer */}
        <div className="pt-3 border-t border-slate-200">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center space-x-2">
                <Globe className="w-3 h-3" />
                <span>Event Slug: <span className="font-mono font-semibold text-slate-700">{event.slug}</span></span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-3 h-3" />
                <span>Created by User ID: <span className="font-semibold text-slate-700">{event.createdById}</span></span>
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </div>
  )
}
