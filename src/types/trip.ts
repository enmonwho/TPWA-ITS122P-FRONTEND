import type { CountryRouteEntry } from '../lib/countries';

export type TripStatus = 'planning' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';

export interface Trip {
  id: number;
  /** API-provided owner ID, retained for Admin read-only records. */
  userId?: number;
  name: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  status: TripStatus;
  cover_photo?: string | null;
  visibility?: string;
  destination?: string;
  createdAt?: string;
  updatedAt?: string;

  /** Derived display names for the persisted country route. */
  countries: string[];
  /** Canonical, explicitly ordered route; server-persisted when supported. */
  countryRoute: CountryRouteEntry[];
  /** True when countryRoute came from the Trips API rather than local extras. */
  countryRoutePersisted?: boolean;
  /** @local — not persisted to backend yet */
  travelType: string;

  /** Derived client-side from startDate/endDate — never sent to API */
  nights: number;
  /** Derived client-side from startDate — never sent to API */
  daysUntil?: number;
}

export interface TripApiPayload {
  title?: string;
  start_date?: string;
  end_date?: string;
  total_budget?: number;
  status?: TripStatus;
  cover_photo?: string | null;
  visibility?: string;
  country_route?: CountryRouteEntry[];
}

export interface TripApiResponse {
  id: number;
  user_id: number;
  title: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  status: TripStatus;
  cover_photo?: string | null;
  visibility?: string;
  country_route?: CountryRouteEntry[] | null;
  created_at: string;
  updated_at: string;
  destinations?: unknown[];
}
