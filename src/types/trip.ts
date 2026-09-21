export type TripStatus = 'planning' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';

export interface Trip {
  id: number;
  name: string; 
  startDate: string; 
  endDate: string; 
  totalBudget: number; 
  status: TripStatus;
  cover_photo?: string | null; 
  visibility?: string; 
  createdAt?: string; 
  updatedAt?: string; 

  /** @local — not persisted to backend yet */
  countries: string[];
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
  created_at: string;
  updated_at: string;
  destinations?: unknown[];
}