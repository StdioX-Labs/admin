// Dashboard Stats Types
export interface DashboardStats {
  totalCompanies: number;
  activeEvents: number;
  totalRevenue: number;
  totalUsers: number;
  pendingApprovals: number;
  activeB2BSubscriptions: number;
}

export interface DashboardStatsResponse {
  data: DashboardStats;
  message: string;
  status: boolean;
}

// Events Types
export interface EventCreator {
  id: number;
  fullName: string;
  idNumber: string | null;
  mobileNumber: string;
  emailAddress: string;
  roles: string | null;
  companyName: string | null;
  kycStatus: string | null;
  currency: string | null;
  role: string;
  active: boolean;
}

export interface EventAnalytics {
  dailySalesGraph: string;
  currentWeekSales: number;
  totalAttendees: number;
  totalTicketTypes: number;
}

export interface TicketSummary {
  ticketId: number;
  ticketName: string;
  ticketPrice: number;
  ticketsSold: number;
  revenue: number;
}

export interface Event {
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
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: EventCreator;
  companyId: number;
  companyName: string;
  totalTicketsSold: number;
  totalRevenue: number;
  totalPlatformFee: number;
  analytics: EventAnalytics;
  ticketSummaries: TicketSummary[];
}

export interface EventsData {
  data: Event[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface EventsResponse {
  data: EventsData;
  message: string;
  status: boolean;
}

// Event Detail Types (for edit page)
export interface Ticket {
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

export interface EventDetail {
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
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: EventCreator;
  companyId: number;
  companyName: string;
  tickets: Ticket[];
}

export interface EventDetailResponse {
  data: EventDetail;
  message: string;
  status: boolean;
}

// Update Event Types
export interface UpdateEventRequest {
  eventName?: string;
  eventDescription?: string;
  eventPosterUrl?: string;
  eventCategory?: string;
  eventLocation?: string;
  ticketSaleStartDate?: string;
  ticketSaleEndDate?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  active?: boolean;
}

export interface UpdateTicketRequest {
  ticketName?: string;
  ticketPrice?: number;
  quantityAvailable?: number;
  isActive?: boolean;
  ticketsToIssue?: number;
  ticketLimitPerPerson?: number;
  numberOfComplementary?: number;
  ticketSaleStartDate?: string;
  ticketSaleEndDate?: string;
  isFree?: boolean;
}

