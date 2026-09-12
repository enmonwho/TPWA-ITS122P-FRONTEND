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

/**
 * Centralized Axios instance for all API calls.
 * Reads VITE_API_URL from environment variables with fallback to hosted backend.
 */
const api = axios.create({
  baseURL:
    (import.meta.env.VITE_API_URL as string) ||
    'https://tpwa-its122p-backend.onrender.com/api',
  withCredentials: true,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/* ------------------------------------------------------------------ */
/*  Request & Response Interceptors                                   */
/* ------------------------------------------------------------------ */

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => config,
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
  /** GET /bookings?status= — returns user's bookings with server error resilience */
  getAll: async (status?: BookingStatus): Promise<Booking[]> => {
    try {
      const response = await api.get<{ bookings?: Booking[] } | Booking[]>('/bookings', {
        params: status ? { status } : undefined,
      });
      if (Array.isArray(response.data)) {
        return response.data;
      }
      return response.data.bookings || [];
    } catch (err) {
      console.warn('Backend /bookings endpoint notice, returning empty list:', err);
      return [];
    }
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

export default api;
