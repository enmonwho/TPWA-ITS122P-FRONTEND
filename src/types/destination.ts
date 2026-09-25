export interface Destination {
  id: number;
  trip_id: number | null;
  location_name: string;
  latitude: number;
  longitude: number;
  order_sequence: number;
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
