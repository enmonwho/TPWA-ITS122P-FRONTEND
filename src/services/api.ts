import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import type { RegisterPayload, LoginPayload, AuthResponse, MeResponse } from '../types';
import type { Destination, Category } from '../types/destination';
import type { Trip, TripApiPayload, TripApiResponse, TripStatus } from '../types/trip';
import type {
  Booking,
  BookingStatus,
  Activity,
  BookingCreatePayload,
} from '../types/booking';
import { mockAuthApi } from './mockAuthApi';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string) || '/api',
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

  forgotPassword: async (email: string): Promise<{ message: string; devResetUrl?: string }> => {
    const response = await api.post<{ message: string; devResetUrl?: string }>('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (payload: { token: string; password: string }): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/reset-password', payload);
    return response.data;
  },
};
const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH === 'true';

if (useMockAuth) {
  console.warn('⚠️ MOCK AUTH MODE ENABLED. Real backend auth endpoints are being bypassed.');
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
    const response = await api.post<{ message: string; trip: TripApiResponse }>('/trips', payload);
    return mapTripFromApi(response.data.trip);
  },
  updateTrip: async (id: string | number, payload: TripApiPayload): Promise<Trip> => {
    const response = await api.put<{ message: string; trip: TripApiResponse }>(`/trips/${id}`, payload);
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
      const response = await api.get<{ destinations?: Destination[] } | Destination[]>('/destinations');
      return Array.isArray(response.data) ? response.data : response.data.destinations || [];
    } catch { return []; }
  },
  getById: async (id: string | number): Promise<Destination | null> => {
    try {
      const response = await api.get<{ destination: Destination }>(`/destinations/${id}`);
      return response.data.destination;
    } catch { return null; }
  },
  getByTripId: async (tripId: string | number): Promise<Destination[]> => {
    try {
      const response = await api.get<{ destinations?: Destination[] } | Destination[]>('/destinations', { params: { trip_id: tripId } });
      return Array.isArray(response.data) ? response.data : response.data.destinations || [];
    } catch { return []; }
  },
  getCategories: async (): Promise<Category[]> => {
    try {
      const response = await api.get<{ categories?: Category[] } | Category[]>('/categories');
      return Array.isArray(response.data) ? response.data : response.data.categories || [];
    } catch { return []; }
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
  addBalance: async (tripId: string | number, amount: number): Promise<{ message: string; balance: number }> => {
    const response = await api.post<{ message: string; balance: number }>(`/trips/${tripId}/budget/balance`, { amount });
    return response.data;
  },
  addExpense: async (tripId: string | number, payload: { name: string; items: number; category: string; cost: number; date?: string; }): Promise<{ message: string; expense: ExpenseApiResponse; balance: number }> => {
    const response = await api.post<{ message: string; expense: ExpenseApiResponse; balance: number }>(`/trips/${tripId}/budget/expenses`, payload);
    return response.data;
  },
  deleteExpense: async (tripId: string | number, expenseId: string | number): Promise<{ message: string; balance: number }> => {
    const response = await api.delete<{ message: string; balance: number }>(`/trips/${tripId}/budget/expenses/${expenseId}`);
    return response.data;
  },
};

export const activitiesApi = {
  getAll: async (params?: { destination_id?: number | string; category_id?: number | string; vendor_id?: number | string; }): Promise<Activity[]> => {
    try {
      const response = await api.get<{ activities?: Activity[] } | Activity[]>('/activities', { params });
      return Array.isArray(response.data) ? response.data : response.data.activities || [];
    } catch { return []; }
  },
  getById: async (id: number | string): Promise<Activity | null> => {
    try {
      const response = await api.get<{ activity: Activity }>(`/activities/${id}`);
      return response.data.activity;
    } catch { return null; }
  },
};

export const bookingsApi = {
  getAll: async (status?: BookingStatus): Promise<Booking[]> => {
    const response = await api.get<{ bookings?: Booking[] } | Booking[]>('/bookings', { params: status ? { status } : undefined });
    return Array.isArray(response.data) ? response.data : response.data.bookings || [];
  },
  create: async (payload: BookingCreatePayload): Promise<Booking> => {
    const response = await api.post<{ message: string; booking: Booking }>('/bookings', payload);
    return response.data.booking;
  },
  updateStatus: async (id: number | string, status: BookingStatus): Promise<Booking> => {
    const response = await api.put<{ message: string; booking: Booking }>(`/bookings/${id}`, { status });
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
    } catch { return []; }
  },
  toggleUserStatus: async (userId: number, isActive: boolean) => {
    const res = await api.put<{ message: string; user: AdminUser }>(`/users/${userId}`, { is_active: isActive });
    return res.data;
  },
  getCategories: async (): Promise<AdminCategory[]> => {
    try {
      const res = await api.get<{ categories: AdminCategory[] } | AdminCategory[]>('/categories');
      const raw = Array.isArray(res.data) ? res.data : res.data.categories || [];
      return raw.map((c) => ({ id: c.id ?? c.categoryid ?? 0, name: c.name, type: c.type, activity_count: c.activity_count }));
    } catch { return []; }
  },
  createCategory: async (payload: { name: string; type: string }) => {
    const res = await api.post<{ message: string; category: AdminCategory }>('/categories', payload);
    return res.data;
  },
  getActivities: async (): Promise<AdminActivity[]> => {
    try {
      const res = await api.get<{ activities: AdminActivity[] } | AdminActivity[]>('/activities');
      return Array.isArray(res.data) ? res.data : res.data.activities || [];
    } catch { return []; }
  },
  createActivity: async (payload: { title: string; destination_id?: number; category_id?: number; cost: number; start_time?: string; end_time?: string; vendor_id?: number; }) => {
    const res = await api.post<{ message: string; activity: AdminActivity }>('/activities', payload);
    return res.data;
  },
  getAuditLogs: async (): Promise<SystemAuditLog[]> => {
    try {
      const res = await api.get<{ logs: SystemAuditLog[] } | SystemAuditLog[]>('/logs');
      return Array.isArray(res.data) ? res.data : res.data.logs || [];
    } catch { return []; }
  },
  overrideDeleteTrip: async (tripId: number, reason?: string) => {
    const res = await api.delete<{ message: string }>(`/trips/${tripId}`, { data: { reason } });
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
  updateProfile: async (userId: number | string, payload: UpdateUserProfilePayload): Promise<{ message: string; user?: AdminUser }> => {
    const res = await api.put<{ message: string; user?: AdminUser }>(`/users/${userId}`, payload);
    return res.data;
  },
  searchUsers: async (query: string): Promise<{ id: number; full_name: string; username: string }[]> => {
    try {
      const res = await api.get('/users/search', { params: { q: query } });
      return Array.isArray(res.data) ? res.data : res.data.users || [];
    } catch { return []; }
  },
  getUserByUsername: async (username: string): Promise<PublicProfileResponse | null> => {
    try {
      const res = await api.get<PublicProfileResponse>(`/users/profile/${username}`);
      return res.data;
    } catch { return null; }
  }
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
    } catch { return []; }
  },
  savePackingList: async (tripId: string | number, list: PackingItem[]): Promise<void> => {
    localStorage.setItem(`lakbye_packing_${tripId}`, JSON.stringify(list));
  }
};