import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import type { RegisterPayload, LoginPayload, AuthResponse, MeResponse } from '../types';

/**
 * Centralized Axios instance for all API calls.
 *
 * Reads `VITE_API_URL` from environment variables with fallback to hosted backend.
 * Includes withCredentials: true for cross-origin cookie authentication.
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
/*  Request Interceptor                                                */
/* ------------------------------------------------------------------ */

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

/* ------------------------------------------------------------------ */
/*  Response Interceptor                                               */
/* ------------------------------------------------------------------ */

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

/* ------------------------------------------------------------------ */
/*  Auth API Module                                                    */
/* ------------------------------------------------------------------ */

import { mockAuthApi } from './mockAuthApi';

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
/*  Trips API Module                                                   */
/* ------------------------------------------------------------------ */

import type { Trip, TripApiPayload, TripApiResponse } from '../types/trip';

/** Map a raw backend trip to the frontend Trip shape. */
function mapTripFromApi(raw: TripApiResponse): Trip {
  return {
    id: raw.id,
    name: raw.title,
    startDate: raw.start_date,
    endDate: raw.end_date,
    totalBudget: raw.total_budget ?? 0,
    status: raw.status,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    // Local-only fields — merged separately from side-table
    countries: [],
    travelType: '',
    // Derived — computed separately
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

  /** PUT /trips/:id — update an existing trip (partial). */
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

export default api;
