/**
 * Trip status values as defined by the backend.
 */
export type TripStatus = 'planning' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';

/**
 * Trip interface aligned with the backend schema.
 *
 * Fields `countries` and `travelType` are **not persisted to the backend**.
 * They live in a localStorage side-table (`lakbye_trip_extras_<tripId>`) and
 * are merged client-side. This is a documented stopgap until the backend
 * adds these columns.
 */
export interface Trip {
  id: number;
  name: string; // mapped from backend `title`
  startDate: string; // mapped from backend `start_date`
  endDate: string; // mapped from backend `end_date`
  totalBudget: number; // mapped from backend `total_budget`
  status: TripStatus;
  createdAt?: string; // mapped from backend `created_at`
  updatedAt?: string; // mapped from backend `updated_at`

  /** @local — not persisted to backend yet */
  countries: string[];
  /** @local — not persisted to backend yet */
  travelType: string;

  /** Derived client-side from startDate/endDate — never sent to API */
  nights: number;
  /** Derived client-side from startDate — never sent to API */
  daysUntil?: number;
}

/**
 * Payload for creating/updating a trip via the API.
 * Uses snake_case matching the backend contract.
 */
export interface TripApiPayload {
  title?: string;
  start_date?: string;
  end_date?: string;
  total_budget?: number;
  status?: TripStatus;
}

/**
 * Raw trip object as returned by the backend API.
 */
export interface TripApiResponse {
  id: number;
  user_id: number;
  title: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  status: TripStatus;
  created_at: string;
  updated_at: string;
  destinations?: unknown[];
}
