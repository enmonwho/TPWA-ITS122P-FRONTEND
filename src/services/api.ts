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
    vendor_id?: number | string;
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
  updateStatus: async (id: number | string, status: BookingStatus): Promise<Booking> => {
    const response = await api.put<{ message: string; booking: Booking }>(
      `/bookings/${id}`,
      { status },
    );
    return response.data.booking;
  },
};

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
  getReports: async () => {
    try {
      const res = await api.get('/admin/reports');
      return res.data.metrics;
    } catch {
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
    vendor_id?: number;
  }) => {
    const res = await api.post<{ message: string; activity: AdminActivity }>(
      '/activities',
      payload,
    );
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
