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
import type { Destination, Category } from '../types/destination';
import type { Trip, TripApiPayload, TripApiResponse, TripStatus } from '../types/trip';
import type {
  Booking,
  BookingStatus,
  Activity,
  BookingCreatePayload,
} from '../types/booking';
import { STORAGE_KEYS } from '../lib/constants';
import { mockAuthApi } from './mockAuthApi';

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

/* ------------------------------------------------------------------ */
/*  Request & Response Interceptors                                   */
/* ------------------------------------------------------------------ */

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
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

/* ------------------------------------------------------------------ */
/*  Auth API Module                                                   */
/* ------------------------------------------------------------------ */

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
};

const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

if (useMockAuth) {
  console.warn(
    '⚠️ MOCK AUTH MODE ENABLED. Real backend auth endpoints are being bypassed.',
  );
}

export const authApi = useMockAuth ? mockAuthApi : realAuthApi;

/* ------------------------------------------------------------------ */
/*  Trips API Module                                                  */
/* ------------------------------------------------------------------ */
/** Map a raw backend trip to the frontend Trip shape. */
function mapTripFromApi(raw: TripApiResponse): Trip {
  return {
    id: raw.id,
    name: raw.title,
    startDate: raw.start_date ? raw.start_date.split(/[T ]/)[0] : '',
    endDate: raw.end_date ? raw.end_date.split(/[T ]/)[0] : '',
    totalBudget: raw.total_budget ?? 0,
    status: raw.status ? (raw.status.toLowerCase() as TripStatus) : 'planning',
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    countries: [],
    travelType: '',
    nights: 0,
  };
}

export const tripsApi = {
  /** GET /trips — returns all trips for the authenticated user. */
  getTrips: async (): Promise<Trip[]> => {
    const response = await api.get<{ trips: TripApiResponse[] }>('/trips');
    return response.data.trips.map(mapTripFromApi);
  },

  /** GET /trips/:id — returns a single trip. */
  getTrip: async (id: string | number): Promise<Trip> => {
    const response = await api.get<{ trip: TripApiResponse }>(`/trips/${id}`);
    return mapTripFromApi(response.data.trip);
  },

  /** POST /trips — create a new trip. */
  createTrip: async (payload: TripApiPayload): Promise<Trip> => {
    const response = await api.post<{ message: string; trip: TripApiResponse }>(
      '/trips',
      payload,
    );
    return mapTripFromApi(response.data.trip);
  },

  /** PUT /trips/:id — update an existing trip. */
  updateTrip: async (id: string | number, payload: TripApiPayload): Promise<Trip> => {
    const response = await api.put<{ message: string; trip: TripApiResponse }>(
      `/trips/${id}`,
      payload,
    );
    return mapTripFromApi(response.data.trip);
  },

  /** DELETE /trips/:id — delete a trip. */
  deleteTrip: async (id: string | number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/trips/${id}`);
    return response.data;
  },
};

/* ------------------------------------------------------------------ */
/*  Destinations & Categories API Modules                             */
/* ------------------------------------------------------------------ */

export const destinationsApi = {
  /** GET /destinations — returns master destinations with coordinates. */
  getAll: async (): Promise<Destination[]> => {
    try {
      const response = await api.get<{ destinations?: Destination[] } | Destination[]>(
        '/destinations',
      );
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return response.data.destinations || [];
    } catch {
      return [];
    }
  },

  /** GET /destinations/:id — returns single destination details. */
  getById: async (id: string | number): Promise<Destination | null> => {
    try {
      const response = await api.get<{ destination: Destination }>(`/destinations/${id}`);
      return response.data.destination;
    } catch {
      return null;
    }
  },

  /** GET /destinations?trip_id=:tripId — returns destinations for a specific trip. */
  getByTripId: async (tripId: string | number): Promise<Destination[]> => {
    try {
      const response = await api.get<{ destinations?: Destination[] } | Destination[]>(
        '/destinations',
        { params: { trip_id: tripId } },
      );
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return response.data.destinations || [];
    } catch {
      return [];
    }
  },

  /** GET /categories — returns master travel categories/tags. */
  getCategories: async (): Promise<Category[]> => {
    try {
      const response = await api.get<{ categories?: Category[] } | Category[]>(
        '/categories',
      );
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return response.data.categories || [];
    } catch {
      return [];
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
  created_at?: string;
}

export interface BudgetApiResponse {
  balance: number;
  expenses: ExpenseApiResponse[];
}

export const budgetApi = {
  /** GET /trips/:tripId/budget — get trip balance and expense items */
  getBudget: async (tripId: string | number): Promise<BudgetApiResponse> => {
    const response = await api.get<BudgetApiResponse>(`/trips/${tripId}/budget`);
    return response.data;
  },

  /** POST /trips/:tripId/budget/balance — add balance to trip total_budget */
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

  /** POST /trips/:tripId/budget/expenses — add expense item and deduct from budget */
  addExpense: async (
    tripId: string | number,
    payload: {
      name: string;
      items: number;
      category: string;
      cost: number;
      date?: string;
    },
  ): Promise<{ message: string; expense: ExpenseApiResponse; balance: number }> => {
    const response = await api.post<{
      message: string;
      expense: ExpenseApiResponse;
      balance: number;
    }>(`/trips/${tripId}/budget/expenses`, payload);
    return response.data;
  },

  /** DELETE /trips/:tripId/budget/expenses/:expenseId — delete expense item and refund to budget */
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

/* ------------------------------------------------------------------ */
/*  Activities API Module                                             */
/* ------------------------------------------------------------------ */

export const activitiesApi = {
  /** GET /activities — returns bookable activities catalog */
  getAll: async (params?: {
    destination_id?: number | string;
    category_id?: number | string;
    vendor_id?: number | string;
  }): Promise<Activity[]> => {
    try {
      const response = await api.get<{ activities?: Activity[] } | Activity[]>(
        '/activities',
        { params },
      );
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return response.data.activities || [];
    } catch {
      return [];
    }
  },

  /** GET /activities/:id — returns a single activity */
  getById: async (id: number | string): Promise<Activity | null> => {
    try {
      const response = await api.get<{ activity: Activity }>(`/activities/${id}`);
      return response.data.activity;
    } catch {
      return null;
    }
  },
};

/* ------------------------------------------------------------------ */
/*  Bookings API Module                                               */
/* ------------------------------------------------------------------ */

export const bookingsApi = {
  /** GET /bookings?status= — returns user's bookings */
  getAll: async (status?: BookingStatus): Promise<Booking[]> => {
    const response = await api.get<{ bookings?: Booking[] } | Booking[]>('/bookings', {
      params: status ? { status } : undefined,
    });
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data.bookings || [];
  },

  /** POST /bookings — submit a new booking */
  create: async (payload: BookingCreatePayload): Promise<Booking> => {
    const response = await api.post<{ message: string; booking: Booking }>(
      '/bookings',
      payload,
    );
    return response.data.booking;
  },

  /** PUT /bookings/:id — update booking status */
  updateStatus: async (id: number | string, status: BookingStatus): Promise<Booking> => {
    const response = await api.put<{ message: string; booking: Booking }>(
      `/bookings/${id}`,
      { status },
    );
    return response.data.booking;
  },
};

/* ------------------------------------------------------------------ */
/*  Admin Dashboard API                                               */
/* ------------------------------------------------------------------ */

export interface AdminUser {
  id: number;
  full_name?: string;
  name?: string;
  email: string;
  role: 'admin' | 'staff' | 'customer' | 'vendor' | string;
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

export const adminApi = {
  // Systems Report Analytics (FR-ADM-03) — Blocked: no dedicated backend reports route
  getReports: async () => {
    return null;
  },

  // User Management (FR-ADM-01) — Real routes: GET /users, PUT /users/:id
  getUsers: async (): Promise<AdminUser[]> => {
    try {
      const res = await api.get<{ users: AdminUser[] } | AdminUser[]>('/users');
      if (Array.isArray(res.data)) {
        return res.data;
      }
      return res.data.users || [];
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

  // Categories & Activities (FR-ADM-02) — Real routes: GET/POST /categories, GET/POST /activities
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
  getActivities: async (): Promise<AdminActivity[]> => {
    try {
      const res = await api.get<{ activities: AdminActivity[] } | AdminActivity[]>(
        '/activities',
      );
      if (Array.isArray(res.data)) {
        return res.data;
      }
      return res.data.activities || [];
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
    vendor_id?: number;
  }) => {
    const res = await api.post<{ message: string; activity: AdminActivity }>(
      '/activities',
      payload,
    );
    return res.data;
  },

  // Master Override & Audit Logs (FR-ADM-05) — Real routes: GET /logs, DELETE /trips/:id
  getAuditLogs: async (): Promise<SystemAuditLog[]> => {
    try {
      const res = await api.get<{ logs: SystemAuditLog[] } | SystemAuditLog[]>('/logs');
      if (Array.isArray(res.data)) {
        return res.data;
      }
      return res.data.logs || [];
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

/* ------------------------------------------------------------------ */
/*  User Profile API Module                                           */
/* ------------------------------------------------------------------ */

export interface UpdateUserProfilePayload {
  name?: string;
  full_name?: string;
  username?: string;
  bio?: string;
  password?: string;
  is_active?: boolean;
  role?: string;
  preferences?: UserPreferences;
}

export const userApi = {
  /** PUT /users/:id — update user profile / status / credentials */
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
        const remotePrefs = meRes.user.preferences || {};
        const remoteUsername = meRes.user.username;
        const merged: UserPreferences = {
          ...cachedPrefs,
          ...remotePrefs,
          ...(remoteUsername ? { username: remoteUsername } : {}),
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

export default api;
