import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import type {
  RegisterPayload,
  LoginPayload,
  AuthResponse,
  MeResponse,
  UserPreferences,
} from '../types';
import type { Destination, Category, CountryProfile } from '../types/destination';
import type { Trip, TripApiPayload, TripApiResponse, TripStatus } from '../types/trip';
import type {
  Booking,
  BookingStatus,
  Activity,
  BookingCreatePayload,
} from '../types/booking';
import { STORAGE_KEYS } from '../lib/constants';
import { mockAuthApi } from './mockAuthApi';
import { COUNTRIES } from '../constants/countries';
import { getTripExtras } from '../lib/tripExtras';
import { getExploreDestinationImage } from './exploreService';
import { computeSessionMetrics } from '../lib/sessionTracker';

/**
 * Resolves the base URL for API requests.
 * Normalizes any onrender.com URL to relative '/api' so that all client requests
 * route through the Vercel (or Vite dev) reverse proxy.
 * This guarantees that ISP DNS/IP blocks (e.g. PLDT, Smart in the Philippines)
 * on onrender.com will never cause net::ERR_CONNECTION_TIMED_OUT in users' browsers.
 */
const resolveBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (!envUrl || envUrl.includes('onrender.com')) {
    return '/api';
  }
  return envUrl;
};

/**
 * Centralized Axios instance for all API calls.
 * Reads VITE_API_URL from environment variables with fallback to hosted backend proxy.
 */
const api = axios.create({
  baseURL: resolveBaseUrl(),
  withCredentials: true,
  timeout: 60_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token && config.headers && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => Promise.reject(error),
);

const realAuthApi = {
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', payload);
    return response.data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', payload);
    return response.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/logout');
    return response.data;
  },

  getMe: async (): Promise<MeResponse> => {
    const response = await api.get<MeResponse>('/auth/me');
    return response.data;
  },

  forgotPassword: async (
    email: string,
  ): Promise<{
    message: string;
    devResetUrl?: string;
    accountFound?: boolean;
    emailSent?: boolean;
  }> => {
    const response = await api.post<{
      message: string;
      devResetUrl?: string;
      accountFound?: boolean;
      emailSent?: boolean;
    }>('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (payload: {
    token: string;
    password: string;
  }): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/reset-password', payload);
    return response.data;
  },

  verifyEmail: async (payload: {
    email: string;
    otp: string;
  }): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/verify-email', payload);
    return response.data;
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/resend-verification', {
      email,
    });
    return response.data;
  },

  cancelRegistration: async (email: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/cancel-registration', {
      email,
    });
    return response.data;
  },
};
const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

if (useMockAuth) {
  console.warn(
    '⚠️ MOCK AUTH MODE ENABLED. Real backend auth endpoints are being bypassed.',
  );
}

export const authApi = useMockAuth ? mockAuthApi : realAuthApi;

function mapTripFromApi(raw: TripApiResponse): Trip {
  return {
    id: raw.id,
    name: raw.title,
    startDate: raw.start_date ? raw.start_date.split(/[T ]/)[0] : '',
    endDate: raw.end_date ? raw.end_date.split(/[T ]/)[0] : '',
    totalBudget: raw.total_budget ?? 0,
    status: raw.status ? (raw.status.toLowerCase() as TripStatus) : 'planning',
    cover_photo: raw.cover_photo,
    visibility: raw.visibility || 'private',
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    countries: [],
    travelType: '',
    nights: 0,
  };
}

export const tripsApi = {
  getTrips: async (): Promise<Trip[]> => {
    const response = await api.get<{ trips: TripApiResponse[] }>('/trips');
    return response.data.trips.map(mapTripFromApi);
  },
  getTrip: async (id: string | number): Promise<Trip> => {
    const response = await api.get<{ trip: TripApiResponse }>(`/trips/${id}`);
    return mapTripFromApi(response.data.trip);
  },
  createTrip: async (payload: TripApiPayload): Promise<Trip> => {
    const response = await api.post<{ message: string; trip: TripApiResponse }>(
      '/trips',
      payload,
    );
    return mapTripFromApi(response.data.trip);
  },
  updateTrip: async (id: string | number, payload: TripApiPayload): Promise<Trip> => {
    const response = await api.put<{ message: string; trip: TripApiResponse }>(
      `/trips/${id}`,
      payload,
    );
    return mapTripFromApi(response.data.trip);
  },
  deleteTrip: async (id: string | number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/trips/${id}`);
    return response.data;
  },
};

export const destinationsApi = {
  getAll: async (): Promise<Destination[]> => {
    try {
      const response = await api.get<{ destinations?: Destination[] } | Destination[]>(
        '/destinations',
      );
      return Array.isArray(response.data)
        ? response.data
        : response.data.destinations || [];
    } catch {
      return [];
    }
  },
  getById: async (id: string | number): Promise<Destination | null> => {
    try {
      const response = await api.get<{ destination: Destination }>(`/destinations/${id}`);
      return response.data.destination;
    } catch {
      return null;
    }
  },
  getByTripId: async (tripId: string | number): Promise<Destination[]> => {
    try {
      const response = await api.get<{ destinations?: Destination[] } | Destination[]>(
        '/destinations',
        { params: { trip_id: tripId } },
      );
      return Array.isArray(response.data)
        ? response.data
        : response.data.destinations || [];
    } catch {
      return [];
    }
  },
  getCategories: async (): Promise<Category[]> => {
    try {
      const response = await api.get<{ categories?: Category[] } | Category[]>(
        '/categories',
      );
      return Array.isArray(response.data)
        ? response.data
        : response.data.categories || [];
    } catch {
      return [];
    }
  },
  create: async (payload: {
    trip_id: string | number;
    location_name: string;
    latitude?: number;
    longitude?: number;
    order_sequence?: number;
    country?: string;
    parent_destination_id?: number | string | null;
    days?: number;
    accommodation?: string;
    activities?: string;
    transportation?: string;
  }): Promise<Destination> => {
    const response = await api.post<{ message: string; destination: Destination }>(
      '/destinations',
      payload,
    );
    return response.data.destination;
  },
  update: async (
    id: string | number,
    payload: Partial<Destination>,
  ): Promise<Destination> => {
    const response = await api.put<{ message: string; destination: Destination }>(
      `/destinations/${id}`,
      payload,
    );
    return response.data.destination;
  },
  delete: async (id: string | number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/destinations/${id}`);
    return response.data;
  },
};

export const countryProfilesApi = {
  getAll: async (): Promise<CountryProfile[]> => {
    try {
      const response = await api.get<{ profiles?: CountryProfile[] }>(
        '/country-profiles',
      );
      return response.data.profiles || [];
    } catch {
      return [];
    }
  },
  getByName: async (countryName: string): Promise<CountryProfile | null> => {
    try {
      const response = await api.get<{ profile?: CountryProfile }>(
        `/country-profiles/${encodeURIComponent(countryName)}`,
      );
      return response.data.profile || null;
    } catch {
      return null;
    }
  },
};

export interface ExpenseApiResponse {
  id: number | string;
  trip_id?: number | string;
  name: string;
  items: number;
  category: string;
  cost: number;
  date: string;
  destination_id?: number | string | null;
  country_name?: string | null;
  created_at?: string;
}

export interface BudgetApiResponse {
  balance: number;
  expenses: ExpenseApiResponse[];
}

export const budgetApi = {
  getBudget: async (tripId: string | number): Promise<BudgetApiResponse> => {
    const response = await api.get<BudgetApiResponse>(`/trips/${tripId}/budget`);
    return response.data;
  },
  addBalance: async (
    tripId: string | number,
    amount: number,
  ): Promise<{ message: string; balance: number }> => {
    const response = await api.post<{ message: string; balance: number }>(
      `/trips/${tripId}/budget/balance`,
      { amount },
    );
    return response.data;
  },
  addExpense: async (
    tripId: string | number,
    payload: {
      name: string;
      items: number;
      category: string;
      cost: number;
      date?: string;
      destination_id?: number | string | null;
      country_name?: string | null;
    },
  ): Promise<{ message: string; expense: ExpenseApiResponse; balance: number }> => {
    const response = await api.post<{
      message: string;
      expense: ExpenseApiResponse;
      balance: number;
    }>(`/trips/${tripId}/budget/expenses`, payload);
    return response.data;
  },
  deleteExpense: async (
    tripId: string | number,
    expenseId: string | number,
  ): Promise<{ message: string; balance: number }> => {
    const response = await api.delete<{ message: string; balance: number }>(
      `/trips/${tripId}/budget/expenses/${expenseId}`,
    );
    return response.data;
  },
};

export const activitiesApi = {
  getAll: async (params?: {
    destination_id?: number | string;
    category_id?: number | string;
  }): Promise<Activity[]> => {
    try {
      const response = await api.get<{ activities?: Activity[] } | Activity[]>(
        '/activities',
        { params },
      );
      return Array.isArray(response.data)
        ? response.data
        : response.data.activities || [];
    } catch {
      return [];
    }
  },
  getById: async (id: number | string): Promise<Activity | null> => {
    try {
      const response = await api.get<{ activity: Activity }>(`/activities/${id}`);
      return response.data.activity;
    } catch {
      return null;
    }
  },
};

export const bookingsApi = {
  getAll: async (
    status?: BookingStatus,
    tripId?: string | number,
  ): Promise<Booking[]> => {
    const params: Record<string, string | number> = {};
    if (status) params.status = status;
    if (tripId !== undefined && tripId !== null) params.trip_id = tripId;
    const response = await api.get<{ bookings?: Booking[] } | Booking[]>('/bookings', {
      params: Object.keys(params).length > 0 ? params : undefined,
    });
    return Array.isArray(response.data) ? response.data : response.data.bookings || [];
  },
  create: async (payload: BookingCreatePayload): Promise<Booking> => {
    const response = await api.post<{ message: string; booking: Booking }>(
      '/bookings',
      payload,
    );
    return response.data.booking;
  },
  updateStatus: async (
    id: number | string,
    status: BookingStatus,
    cost?: number,
  ): Promise<Booking> => {
    const response = await api.put<{ message: string; booking: Booking }>(
      `/bookings/${id}`,
      { status, cost },
    );
    return response.data.booking;
  },
};

export interface FeedbackItem {
  id: number | string;
  user_id?: number | string;
  user_name?: string;
  username?: string;
  avatar_url?: string;
  country_name: string;
  title: string;
  comment: string;
  rating: number;
  status: 'pending' | 'approved' | 'rejected' | string;
  created_at?: string;
}

export const feedbackApi = {
  getApproved: async (): Promise<FeedbackItem[]> => {
    try {
      const res = await api.get<{ feedback: FeedbackItem[] }>('/feedback');
      return res.data?.feedback || [];
    } catch {
      return [];
    }
  },
  getAll: async (status?: string): Promise<FeedbackItem[]> => {
    try {
      const res = await api.get<{ feedback: FeedbackItem[] }>('/feedback', {
        params: { all: true, status },
      });
      return res.data?.feedback || [];
    } catch {
      return [];
    }
  },
  submit: async (payload: {
    country_name: string;
    title: string;
    comment: string;
    rating: number;
  }): Promise<{ message: string; feedback: FeedbackItem }> => {
    const res = await api.post<{ message: string; feedback: FeedbackItem }>(
      '/feedback',
      payload,
    );
    return res.data;
  },
  updateStatus: async (
    id: number | string,
    status: 'pending' | 'approved' | 'rejected',
  ): Promise<{ message: string; feedback: FeedbackItem }> => {
    const res = await api.put<{ message: string; feedback: FeedbackItem }>(
      `/feedback/${id}/status`,
      { status },
    );
    return res.data;
  },
  delete: async (id: number | string): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/feedback/${id}`);
    return res.data;
  },
};

export interface AdminUser {
  id: number;
  full_name?: string;
  name?: string;
  email: string;
  role: 'admin' | 'staff' | 'customer' | string;
  is_active: boolean;
  created_at?: string;
}

export interface AdminCategory {
  id: number;
  categoryid?: number;
  name: string;
  type: string;
  activity_count?: number;
}

export interface AdminActivity {
  id: number;
  title: string;
  destination?: string;
  category?: string;
  cost: number;
  status?: string;
}

export interface SystemAuditLog {
  id: number;
  user_id?: number;
  user_name?: string;
  action_type: string;
  table_affected?: string;
  record_id?: string | number;
  description: string;
  created_at: string;
}

export interface ReportKpis {
  monthlyBookings: {
    value: number;
    formatted: string;
    changePct: number;
    isPositive: boolean;
  };
  mostRequestedDestination: {
    name: string;
    requestsCount: number;
    imageUrl?: string;
  };
  plannedBudgets: {
    value: number;
    formatted: string;
    activeTripsCount?: number;
  };
  activeUsers: {
    value: number;
    formatted: string;
    changePct: number;
    isPositive: boolean;
  };
}

export interface UserStatusBreakdown {
  months: string[];
  active: number[];
  newUsers: number[];
  inactive: number[];
}

export interface MonthlyTrend {
  months: string[];
  values: number[];
}

export interface TopDestinationReportItem {
  rank: number;
  name: string;
  count: number;
  percentage: number;
}

export interface SessionMetricsReport {
  avgDurationFormatted: string;
  avgDurationSeconds: number;
  changePct: number;
  isPositive: boolean;
  fillPercentage: number;
}

export interface AdminSystemReportData {
  period: '30d' | '90d' | '1y';
  metrics?: {
    totalUsers: number;
    totalTrips: number;
    totalBookings: number;
    activeTrips: number;
  };
  kpis: ReportKpis;
  userStatusBreakdown: UserStatusBreakdown;
  monthlyBudgetTrend: MonthlyTrend;
  monthlyBookingsTrend: MonthlyTrend;
  topDestinations: TopDestinationReportItem[];
  sessionMetrics: SessionMetricsReport;
}

export const adminApi = {
  getReports: async (
    period: '30d' | '90d' | '1y' = '30d',
  ): Promise<AdminSystemReportData | null> => {
    try {
      // 1. Attempt to fetch dedicated backend reports endpoint
      const reportsRes = await api
        .get(`/admin/reports?period=${period}`)
        .catch(() => null);
      const data = reportsRes?.data;

      // Check if backend already returns complete dynamic breakdown
      const hasFullBackendData =
        data &&
        Array.isArray(data.topDestinations) &&
        data.monthlyBudgetTrend &&
        Array.isArray(data.monthlyBudgetTrend.values) &&
        data.userStatusBreakdown &&
        Array.isArray(data.userStatusBreakdown.active);

      if (hasFullBackendData) {
        return data as AdminSystemReportData;
      }

      // 2. Fetch live database records in parallel to calculate 100% genuine data reflection
      const [usersList, tripsList, bookingsRes, activitiesList, destinationsList] =
        await Promise.all([
          adminApi.getUsers().catch(() => [] as AdminUser[]),
          tripsApi.getTrips().catch(() => [] as Trip[]),
          api
            .get<
              | {
                  bookings?: Array<{
                    id: number;
                    activity_title?: string;
                    status?: string;
                    submitted_at?: string;
                    created_at?: string;
                  }>;
                }
              | Array<{
                  id: number;
                  activity_title?: string;
                  status?: string;
                  submitted_at?: string;
                  created_at?: string;
                }>
            >('/bookings')
            .catch(() => null),
          adminApi.getActivities().catch(() => [] as AdminActivity[]),
          destinationsApi.getAll().catch(() => [] as Destination[]),
        ]);

      const rawUsers: AdminUser[] = Array.isArray(usersList) ? usersList : [];
      const rawTrips: Trip[] = Array.isArray(tripsList) ? tripsList : [];
      const rawDestinations: Destination[] = Array.isArray(destinationsList)
        ? destinationsList
        : [];

      let rawBookings: Array<{
        id: number;
        activity_title?: string;
        status?: string;
        submitted_at?: string;
        created_at?: string;
      }> = [];
      if (bookingsRes?.data) {
        if (Array.isArray(bookingsRes.data)) {
          rawBookings = bookingsRes.data;
        } else if (Array.isArray(bookingsRes.data.bookings)) {
          rawBookings = bookingsRes.data.bookings;
        }
      }

      const rawActivities: AdminActivity[] = Array.isArray(activitiesList)
        ? activitiesList
        : [];

      // Format currency / number helper
      const formatK = (n: number, isCurrency = false) => {
        const p = isCurrency ? '₱' : '';
        if (n >= 1_000_000)
          return `${p}${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
        if (n >= 1_000) return `${p}${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
        return `${p}${n.toLocaleString()}`;
      };

      const now = new Date();
      const intervalDays = period === '90d' ? 90 : period === '1y' ? 365 : 30;
      const periodStartTime = now.getTime() - intervalDays * 24 * 60 * 60 * 1000;
      const prevPeriodStartTime = now.getTime() - intervalDays * 2 * 24 * 60 * 60 * 1000;

      // A. Real Core User Metrics from Database
      const totalUsers = rawUsers.length;
      const activeUsersCount = rawUsers.filter((u) => u.is_active !== false).length;
      const currUsersInPeriod = rawUsers.filter((u) => {
        const t = u.created_at ? new Date(u.created_at).getTime() : 0;
        return t >= periodStartTime;
      }).length;
      const prevUsersInPeriod = rawUsers.filter((u) => {
        const t = u.created_at ? new Date(u.created_at).getTime() : 0;
        return t >= prevPeriodStartTime && t < periodStartTime;
      }).length;
      const usersDeltaPct =
        prevUsersInPeriod === 0
          ? currUsersInPeriod > 0
            ? 100
            : 0
          : Number(
              (
                ((currUsersInPeriod - prevUsersInPeriod) / prevUsersInPeriod) *
                100
              ).toFixed(1),
            );

      // B. Real Core Trip & Budget Metrics from Database
      const totalTrips = rawTrips.length;
      const activeTripsList = rawTrips.filter((t) => t.status !== 'cancelled');
      const activeTripsCount = activeTripsList.length;
      const totalPlannedBudget = activeTripsList.reduce(
        (sum, t) => sum + (Number(t.totalBudget) || 0),
        0,
      );

      // C. Real Core Booking Metrics from Database
      const totalBookings = rawBookings.length;
      const currBookingsInPeriod = rawBookings.filter((b) => {
        const dateStr = b.submitted_at || b.created_at;
        const t = dateStr ? new Date(dateStr).getTime() : 0;
        return t >= periodStartTime;
      }).length;
      const prevBookingsInPeriod = rawBookings.filter((b) => {
        const dateStr = b.submitted_at || b.created_at;
        const t = dateStr ? new Date(dateStr).getTime() : 0;
        return t >= prevPeriodStartTime && t < periodStartTime;
      }).length;
      const bookingsDeltaPct =
        prevBookingsInPeriod === 0
          ? currBookingsInPeriod > 0
            ? 100
            : 0
          : Number(
              (
                ((currBookingsInPeriod - prevBookingsInPeriod) / prevBookingsInPeriod) *
                100
              ).toFixed(1),
            );

      // D. Real Top Destinations Ranking from Real Trips, Destinations & Activities in Database
      const destinationCountMap: Record<string, number> = {};

      const addDestinationCount = (destName: string) => {
        const trimmed = destName.trim();
        if (!trimmed) return;
        destinationCountMap[trimmed] = (destinationCountMap[trimmed] || 0) + 1;
      };

      // 1. Group database destinations by trip_id
      const destsByTripId = new Map<string | number, Destination[]>();
      rawDestinations.forEach((d) => {
        if (d.trip_id != null) {
          const existing = destsByTripId.get(d.trip_id) || [];
          existing.push(d);
          destsByTripId.set(d.trip_id, existing);
        }
      });

      // 2. Count real places & countries from the database destinations table
      rawDestinations.forEach((d) => {
        const place = (d.location_name || '').trim();
        const country = (d.country || '').trim();
        if (place && country && place.toLowerCase() !== country.toLowerCase()) {
          addDestinationCount(`${place}, ${country}`);
        } else if (place) {
          addDestinationCount(place);
        } else if (country) {
          addDestinationCount(country);
        }
      });

      // 3. For trips without explicit destinations in the database table, extract destination/country
      rawTrips.forEach((t) => {
        const tripDests = destsByTripId.get(t.id) || [];
        if (tripDests.length > 0) {
          // Already accounted for via database destinations table
          return;
        }

        // Check user-selected trip countries from trip extras
        const extras = getTripExtras(t.id);
        if (extras.countries && extras.countries.length > 0) {
          extras.countries.forEach((c) => addDestinationCount(c));
          return;
        }

        // Fallback: Extract country or place from trip name instead of using raw trip name (e.g. "Vietnam 2027" -> "Vietnam")
        const rawName = (t.name || '').trim();
        if (!rawName) return;

        // Check if trip name matches a known country in COUNTRIES
        const matchedCountry = COUNTRIES.find((c) =>
          new RegExp(`\\b${c}\\b`, 'i').test(rawName),
        );
        if (matchedCountry) {
          addDestinationCount(matchedCountry);
          return;
        }

        // Strip dates, years (e.g. 2027), seasons, and trip descriptors
        const cleaned = rawName
          .replace(/^(trip to|travel to|visit to|vacation in|tour of)\s+/i, '')
          .replace(/\b(19|20)\d\d\b/g, '')
          .replace(
            /\b(trip|tour|vacation|getaway|holiday|adventure|journey|expedition|travel)\b/gi,
            '',
          )
          .replace(/\b(summer|winter|spring|autumn|fall)\b/gi, '')
          .trim();

        if (cleaned.length >= 2) {
          addDestinationCount(cleaned);
        }
      });

      // 4. Count activity destinations
      rawActivities.forEach((a) => {
        const dest = (a.destination || '').trim();
        if (dest) {
          addDestinationCount(dest);
        }
      });

      const sortedDestEntries = Object.entries(destinationCountMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const maxDestCount = sortedDestEntries[0]?.[1] || 1;
      const topDestinations: TopDestinationReportItem[] = sortedDestEntries.map(
        ([name, count], idx) => ({
          rank: idx + 1,
          name,
          count,
          percentage: Math.round((count / maxDestCount) * 100),
        }),
      );

      const topDestName =
        topDestinations[0]?.name ||
        (rawTrips[0]?.name
          ? rawTrips[0].name.replace(/\b(19|20)\d\d\b/g, '').trim()
          : 'No destinations yet');
      const topDestRequests = topDestinations[0]?.count || (rawTrips.length > 0 ? 1 : 0);

      // Resolve destination image directly from the Explore page imagery based on the most requested destination/country
      const topDestImage = getExploreDestinationImage(topDestName);

      // E. Real Monthly Calendars (Last 5 Months for Users, Last 7 Months for Budgets/Bookings)
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Last 5 months for Users
      const last5MonthsData = [];
      for (let i = 4; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        last5MonthsData.push({
          monthName: monthNames[d.getMonth()],
          year: d.getFullYear(),
          monthIdx: d.getMonth(),
        });
      }

      const userStatusBreakdown: UserStatusBreakdown = {
        months: last5MonthsData.map((m) => m.monthName),
        newUsers: last5MonthsData.map(({ year, monthIdx }) => {
          return rawUsers.filter((u) => {
            if (!u.created_at) return false;
            const ud = new Date(u.created_at);
            return ud.getFullYear() === year && ud.getMonth() === monthIdx;
          }).length;
        }),
        active: last5MonthsData.map(({ year, monthIdx }) => {
          const endOfMonth = new Date(year, monthIdx + 1, 0, 23, 59, 59).getTime();
          return rawUsers.filter((u) => {
            const ut = u.created_at ? new Date(u.created_at).getTime() : 0;
            return ut <= endOfMonth && u.is_active !== false;
          }).length;
        }),
        inactive: last5MonthsData.map(({ year, monthIdx }) => {
          const endOfMonth = new Date(year, monthIdx + 1, 0, 23, 59, 59).getTime();
          return rawUsers.filter((u) => {
            const ut = u.created_at ? new Date(u.created_at).getTime() : 0;
            return ut <= endOfMonth && u.is_active === false;
          }).length;
        }),
      };

      // Last 7 months for Budget and Bookings
      const last7MonthsData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        last7MonthsData.push({
          monthName: monthNames[d.getMonth()],
          year: d.getFullYear(),
          monthIdx: d.getMonth(),
        });
      }

      const monthlyBudgetTrend: MonthlyTrend = {
        months: last7MonthsData.map((m) => m.monthName),
        values: last7MonthsData.map(({ year, monthIdx }) => {
          const matchingTrips = rawTrips.filter((t) => {
            const tripDate = t.startDate || t.createdAt;
            if (!tripDate) return false;
            const td = new Date(tripDate);
            return td.getFullYear() === year && td.getMonth() === monthIdx;
          });
          return matchingTrips.reduce((sum, t) => sum + (Number(t.totalBudget) || 0), 0);
        }),
      };

      const monthlyBookingsTrend: MonthlyTrend = {
        months: last7MonthsData.map((m) => m.monthName),
        values: last7MonthsData.map(({ year, monthIdx }) => {
          return rawBookings.filter((b) => {
            const bDate = b.submitted_at || b.created_at;
            if (!bDate) return false;
            const bd = new Date(bDate);
            return bd.getFullYear() === year && bd.getMonth() === monthIdx;
          }).length;
        }),
      };

      // F. Real Dynamic Session Metrics (Strictly Customer-only)
      const customerUsers = rawUsers.filter(
        (u) =>
          u.role?.toLowerCase() === 'customer' ||
          !['admin', 'staff'].includes(u.role?.toLowerCase() || ''),
      );
      const customerUserIds = new Set(customerUsers.map((u) => u.id));

      const customerTrips = rawTrips.filter((t) => {
        const uId = (t as unknown as { user_id?: number }).user_id;
        return uId == null || customerUserIds.has(uId);
      });

      const customerBookings = rawBookings.filter((b) => {
        const uId = (b as unknown as { user_id?: number }).user_id;
        return uId == null || customerUserIds.has(uId);
      });

      const sessionMetrics: SessionMetricsReport = computeSessionMetrics(period, {
        customerTrips: customerTrips.map((t) => ({
          created_at: t.createdAt,
          user_id: (t as unknown as { user_id?: number }).user_id,
        })),
        customerBookings: customerBookings.map((b) => ({
          submitted_at: b.submitted_at || b.created_at,
          user_id: (b as unknown as { user_id?: number }).user_id,
        })),
        customerUserIds,
        totalCustomersCount: customerUsers.length,
      });

      return {
        period,
        metrics: {
          totalUsers,
          totalTrips,
          totalBookings,
          activeTrips: activeTripsCount,
        },
        kpis: {
          monthlyBookings: {
            value: currBookingsInPeriod || totalBookings,
            formatted: formatK(currBookingsInPeriod || totalBookings),
            changePct: Math.abs(bookingsDeltaPct),
            isPositive: bookingsDeltaPct >= 0,
          },
          mostRequestedDestination: {
            name: topDestName,
            requestsCount: topDestRequests,
            imageUrl: topDestImage || undefined,
          },
          plannedBudgets: {
            value: totalPlannedBudget,
            formatted: formatK(totalPlannedBudget, true),
            activeTripsCount,
          },
          activeUsers: {
            value: activeUsersCount,
            formatted: formatK(activeUsersCount),
            changePct: Math.abs(usersDeltaPct),
            isPositive: usersDeltaPct >= 0,
          },
        },
        userStatusBreakdown,
        monthlyBudgetTrend,
        monthlyBookingsTrend,
        topDestinations,
        sessionMetrics,
      };
    } catch (err) {
      console.error('Error compiling system reports from database records:', err);
      return null;
    }
  },
  getUsers: async (): Promise<AdminUser[]> => {
    try {
      const res = await api.get<{ users: AdminUser[] } | AdminUser[]>('/users');
      return Array.isArray(res.data) ? res.data : res.data.users || [];
    } catch {
      return [];
    }
  },
  toggleUserStatus: async (userId: number, isActive: boolean) => {
    const res = await api.put<{ message: string; user: AdminUser }>(`/users/${userId}`, {
      is_active: isActive,
    });
    return res.data;
  },
  deleteUser: async (userId: number): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/users/${userId}`);
    return res.data;
  },
  getCategories: async (): Promise<AdminCategory[]> => {
    try {
      const res = await api.get<{ categories: AdminCategory[] } | AdminCategory[]>(
        '/categories',
      );
      const raw = Array.isArray(res.data) ? res.data : res.data.categories || [];
      return raw.map((c) => ({
        id: c.id ?? c.categoryid ?? 0,
        name: c.name,
        type: c.type,
        activity_count: c.activity_count,
      }));
    } catch {
      return [];
    }
  },
  createCategory: async (payload: { name: string; type: string }) => {
    const res = await api.post<{ message: string; category: AdminCategory }>(
      '/categories',
      payload,
    );
    return res.data;
  },
  updateCategory: async (
    id: number | string,
    payload: { name: string; type: string },
  ) => {
    const res = await api.put<{ message: string; category: AdminCategory }>(
      `/categories/${id}`,
      payload,
    );
    return res.data;
  },
  deleteCategory: async (id: number | string): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/categories/${id}`);
    return res.data;
  },
  getActivities: async (): Promise<AdminActivity[]> => {
    try {
      const res = await api.get<{ activities: AdminActivity[] } | AdminActivity[]>(
        '/activities',
      );
      return Array.isArray(res.data) ? res.data : res.data.activities || [];
    } catch {
      return [];
    }
  },
  createActivity: async (payload: {
    title: string;
    destination_id?: number;
    category_id?: number;
    cost: number;
    start_time?: string;
    end_time?: string;
  }) => {
    const res = await api.post<{ message: string; activity: AdminActivity }>(
      '/activities',
      payload,
    );
    return res.data;
  },
  updateActivity: async (
    id: number | string,
    payload: Partial<{
      title: string;
      destination_id?: number;
      category_id?: number;
      cost: number;
    }>,
  ) => {
    const res = await api.put<{ message: string; activity: AdminActivity }>(
      `/activities/${id}`,
      payload,
    );
    return res.data;
  },
  deleteActivity: async (id: number | string): Promise<{ message: string }> => {
    const res = await api.delete<{ message: string }>(`/activities/${id}`);
    return res.data;
  },
  getAuditLogs: async (): Promise<SystemAuditLog[]> => {
    try {
      const res = await api.get<{ logs: SystemAuditLog[] } | SystemAuditLog[]>('/logs');
      return Array.isArray(res.data) ? res.data : res.data.logs || [];
    } catch {
      return [];
    }
  },
  overrideDeleteTrip: async (tripId: number, reason?: string) => {
    const res = await api.delete<{ message: string }>(`/trips/${tripId}`, {
      data: { reason },
    });
    return res.data;
  },
};

export interface UpdateUserProfilePayload {
  name?: string;
  full_name?: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  password?: string;
  is_active?: boolean;
  role?: string;
  preferences?: UserPreferences;
}
export interface PublicProfileResponse {
  id: number;
  full_name: string;
  username: string;
  bio?: string;
  avatar_url?: string;
  home_country?: string;
  trips?: Trip[];
}

export const userApi = {
  updateProfile: async (
    userId: number | string,
    payload: UpdateUserProfilePayload,
  ): Promise<{ message: string; user?: AdminUser }> => {
    const res = await api.put<{ message: string; user?: AdminUser }>(
      `/users/${userId}`,
      payload,
    );
    return res.data;
  },
  searchUsers: async (
    query: string,
  ): Promise<{ id: number; full_name: string; username: string }[]> => {
    try {
      const res = await api.get('/users/search', { params: { q: query } });
      return Array.isArray(res.data) ? res.data : res.data.users || [];
    } catch {
      return [];
    }
  },
  getUserByUsername: async (username: string): Promise<PublicProfileResponse | null> => {
    try {
      const res = await api.get<PublicProfileResponse>(`/users/profile/${username}`);
      return res.data;
    } catch {
      return null;
    }
  },
};

/* ------------------------------------------------------------------ */
/*  User Preferences API Module                                       */
/* ------------------------------------------------------------------ */

export const preferencesApi = {
  /**
   * Fetch customer preferences.
   * Priority:
   * 1. If mock auth is enabled, loads from mockAuthApi.
   * 2. Reads local storage for instantaneous responsiveness.
   * 3. Proactively queries backend profile/preferences if available to sync updates.
   */
  getPreferences: async (userId?: number | string): Promise<UserPreferences> => {
    if (!userId) return {};

    // 1. Check local storage cache first
    let cachedPrefs: UserPreferences = {};
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES(userId));
      if (stored) {
        cachedPrefs = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse local preferences:', e);
    }

    // 2. If mock mode is active, fetch from mock store
    if (useMockAuth) {
      try {
        const mockPrefs = await mockAuthApi.getPreferences(userId);
        if (mockPrefs) {
          const merged = { ...cachedPrefs, ...mockPrefs };
          localStorage.setItem(
            STORAGE_KEYS.USER_PREFERENCES(userId),
            JSON.stringify(merged),
          );
          return merged;
        }
      } catch {
        // fallback to local cached
      }
      return cachedPrefs;
    }

    // 3. In real backend mode, attempt to retrieve user details from /auth/me or remote preferences
    try {
      const meRes = await realAuthApi.getMe();
      if (meRes.user) {
        const userRec = meRes.user as unknown as Record<string, unknown>;
        const remotePrefs = (userRec.preferences as UserPreferences) || {};
        const remoteUsername = meRes.user.username;
        const remoteDateFormat = (remotePrefs.dateFormat ||
          userRec.date_format ||
          userRec.dateFormat) as string | undefined;
        const remoteTimeFormat = (remotePrefs.timeFormat ||
          userRec.time_format ||
          userRec.timeFormat) as string | undefined;
        const remoteCurrency = (remotePrefs.currency || userRec.currency) as
          string | undefined;
        const remoteDistanceUnit = (remotePrefs.distanceUnit ||
          userRec.distance_unit ||
          userRec.distanceUnit) as string | undefined;

        const merged: UserPreferences = {
          ...cachedPrefs,
          ...remotePrefs,
          ...(remoteUsername ? { username: remoteUsername } : {}),
          ...(remoteDateFormat ? { dateFormat: remoteDateFormat } : {}),
          ...(remoteTimeFormat ? { timeFormat: remoteTimeFormat } : {}),
          ...(remoteCurrency ? { currency: remoteCurrency } : {}),
          ...(remoteDistanceUnit ? { distanceUnit: remoteDistanceUnit } : {}),
        };
        localStorage.setItem(
          STORAGE_KEYS.USER_PREFERENCES(userId),
          JSON.stringify(merged),
        );
        return merged;
      }
    } catch {
      // Silent catch: network outage or backend schema limitation — use cachedPrefs
    }

    return cachedPrefs;
  },

  /**
   * Save customer preferences to backend and local storage cache.
   */
  savePreferences: async (
    userId: number | string,
    preferences: UserPreferences,
  ): Promise<UserPreferences> => {
    const fullPrefs: UserPreferences = {
      ...preferences,
      onboardingCompleted: true,
    };

    // 1. Immediately write to local storage stopgap for zero UI lag
    try {
      localStorage.setItem(
        STORAGE_KEYS.USER_PREFERENCES(userId),
        JSON.stringify(fullPrefs),
      );
    } catch (e) {
      console.warn('Failed to write preferences to localStorage:', e);
    }

    // 2. If mock auth is active, sync with mockAuthApi
    if (useMockAuth) {
      return mockAuthApi.savePreferences(userId, fullPrefs);
    }

    // 3. Connect to backend API:
    // Attempt sending user preferences payload to the backend endpoints.
    const payload = {
      username: preferences.username,
      bio: preferences.bio,
      time_format: preferences.timeFormat,
      date_format: preferences.dateFormat,
      currency: preferences.currency,
      distance_unit: preferences.distanceUnit,
      preferences: fullPrefs,
    };

    try {
      await api.put(`/users/${userId}`, payload);
    } catch {
      // Catch backend errors (such as 403 admin-role requirement on existing backend build, or missing columns)
      // Preferences are safely cached in localStorage, so customer experience continues without disruption.
      try {
        await api.put(`/users/${userId}/preferences`, payload);
      } catch {
        // Alternative endpoint fallback
      }
    }

    return fullPrefs;
  },
};

/* ------------------------------------------------------------------ */
/*  Journals API Module                                               */
/* ------------------------------------------------------------------ */

export interface JournalEntry {
  id: string | number;
  user_id?: string | number;
  title: string;
  content: string;
  createdAt: string;
  trip_id?: string | number;
}

export const journalsApi = {
  /**
   * Fetch user journals from backend database with fallback to resilient local cache.
   */
  getJournals: async (userId: string | number): Promise<JournalEntry[]> => {
    if (!userId) return [];

    let localJournals: JournalEntry[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.JOURNALS(userId));
      if (raw) {
        localJournals = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse local journals:', e);
    }

    // 1. Proactively query backend database endpoint if available
    try {
      const res = await api.get<{ journals: JournalEntry[] } | JournalEntry[]>(
        `/users/${userId}/journals`,
      );
      const remote = Array.isArray(res.data) ? res.data : res.data.journals;
      if (Array.isArray(remote)) {
        localStorage.setItem(STORAGE_KEYS.JOURNALS(userId), JSON.stringify(remote));
        return remote;
      }
    } catch {
      // 2. Fallback query on alternative endpoint: GET /journals?user_id=
      try {
        const res = await api.get<{ journals: JournalEntry[] } | JournalEntry[]>(
          '/journals',
          { params: { user_id: userId } },
        );
        const remote = Array.isArray(res.data) ? res.data : res.data.journals;
        if (Array.isArray(remote)) {
          localStorage.setItem(STORAGE_KEYS.JOURNALS(userId), JSON.stringify(remote));
          return remote;
        }
      } catch {
        // Backend dedicated table/endpoint offline or not yet migrated: use resilient local storage cache
      }
    }

    return localJournals;
  },

  /**
   * Save / Create a new journal entry to the database and local cache.
   */
  createJournal: async (
    userId: string | number,
    payload: { title: string; content: string; trip_id?: string | number },
  ): Promise<JournalEntry> => {
    const entry: JournalEntry = {
      id: `journal-${Date.now()}`,
      user_id: userId,
      title: payload.title.trim(),
      content: payload.content.trim(),
      trip_id: payload.trip_id,
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };

    // 1. Immediate local cache write for zero-lag UI response
    let updatedList: JournalEntry[] = [entry];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.JOURNALS(userId));
      const existing: JournalEntry[] = raw ? JSON.parse(raw) : [];
      updatedList = [entry, ...existing.filter((j) => j.id !== entry.id)];
      localStorage.setItem(STORAGE_KEYS.JOURNALS(userId), JSON.stringify(updatedList));
    } catch (e) {
      console.warn('Failed to write journal to localStorage:', e);
    }

    // 2. Sync to backend database
    try {
      const res = await api.post<{ journal: JournalEntry }>('/journals', {
        ...payload,
        user_id: userId,
      });
      if (res.data?.journal?.id) {
        entry.id = res.data.journal.id;
      }
    } catch {
      try {
        await api.post(`/users/${userId}/journals`, payload);
      } catch {
        // Sync with user profile on backend so data is permanently attached to user record
        try {
          await api.put(`/users/${userId}`, { journals: updatedList });
        } catch {
          // Graceful fallback to cached storage
        }
      }
    }

    return entry;
  },

  /**
   * Delete a journal entry from database and local cache.
   */
  deleteJournal: async (
    userId: string | number,
    journalId: string | number,
  ): Promise<void> => {
    let remainingList: JournalEntry[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.JOURNALS(userId));
      if (raw) {
        const existing: JournalEntry[] = JSON.parse(raw);
        remainingList = existing.filter((j) => j.id.toString() !== journalId.toString());
        localStorage.setItem(
          STORAGE_KEYS.JOURNALS(userId),
          JSON.stringify(remainingList),
        );
      }
    } catch (e) {
      console.warn('Failed to update journals in localStorage:', e);
    }

    try {
      await api.delete(`/journals/${journalId}`);
    } catch {
      try {
        await api.delete(`/users/${userId}/journals/${journalId}`);
      } catch {
        try {
          await api.put(`/users/${userId}`, { journals: remainingList });
        } catch {
          // ignore
        }
      }
    }
  },
};

/**
 * Stopgap Frontend Packing API since backend routes for packing lists don't exist yet.
 */
export interface PackingItem {
  id: string;
  name: string;
  category: string;
  isPacked: boolean;
  quantity: number;
}

export const packingApi = {
  getPackingList: async (tripId: string | number): Promise<PackingItem[]> => {
    try {
      const data = localStorage.getItem(`lakbye_packing_${tripId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  savePackingList: async (
    tripId: string | number,
    list: PackingItem[],
  ): Promise<void> => {
    localStorage.setItem(`lakbye_packing_${tripId}`, JSON.stringify(list));
  },
};

export default api;
