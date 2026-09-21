import { STORAGE_KEYS } from './constants';
import type { Trip } from '../types/trip';

export interface TripExtras {
  countries: string[];
  travelType: string;
}

const DEFAULT_EXTRAS: TripExtras = { countries: [], travelType: '' };

export function getTripExtras(tripId: string | number): TripExtras {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRIP_EXTRAS(tripId));
    if (raw) return JSON.parse(raw) as TripExtras;
  } catch {
    // Corrupted data — return defaults
  }
  return { ...DEFAULT_EXTRAS };
}

export function saveTripExtras(
  tripId: string | number,
  extras: Partial<TripExtras>,
): void {
  const current = getTripExtras(tripId);
  const merged = { ...current, ...extras };
  localStorage.setItem(STORAGE_KEYS.TRIP_EXTRAS(tripId), JSON.stringify(merged));
}

export function deleteTripExtras(tripId: string | number): void {
  localStorage.removeItem(STORAGE_KEYS.TRIP_EXTRAS(tripId));
}

export function formatDateOnly(dateStr?: string | null): string {
  if (!dateStr) return '';
  return dateStr.split(/[T ]/)[0];
}

function computeDerived(trip: { startDate: string; endDate: string }): {
  nights: number;
  daysUntil?: number;
} {
  let nights = 0;
  let daysUntil: number | undefined;

  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffMs = end.getTime() - start.getTime();
    nights = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  if (trip.startDate) {
    const start = new Date(trip.startDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diffMs = start.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days >= 0) daysUntil = days;
  }

  return { nights, daysUntil };
}

export function mergeTripsWithExtras(trips: Trip[]): Trip[] {
  return trips.map((trip) => {
    const extras = getTripExtras(trip.id);
    const derived = computeDerived(trip);
    return {
      ...trip,
      countries: extras.countries,
      travelType: extras.travelType,
      nights: derived.nights,
      daysUntil: derived.daysUntil,
    };
  });
}

export function mergeTripWithExtras(trip: Trip): Trip {
  return mergeTripsWithExtras([trip])[0];
}