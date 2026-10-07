export interface Destination {
  id: number | string;
  trip_id: number | string | null;
  location_name: string;
  latitude?: number;
  longitude?: number;
  order_sequence?: number;
  country?: string;
  country_code?: string | null;
  region?: string | null;
  region_hint?: string | null;
  parent_destination_id?: number | string | null;
  days?: number;
  accommodation_id?: number | null;
  accommodation?: string | null;
  activities?: string;
  transportation?: string;
}

export interface Category {
  id: number;
  name: string;
  type: string;
}

export interface CountryProfile {
  id: number | string;
  country_name: string;
  continent: string;
  capital: string;
  language: string;
  currency: string;
  population: number;
  description: string;
  best_destinations: string[];
  budget_daily_cost: number;
  midrange_daily_cost: number;
  luxury_daily_cost: number;
  image_url: string;
}
