import { STORAGE_KEYS } from './constants';
import type { Trip } from '../types/trip';

/**
 * Local-only trip metadata that the backend doesn't store yet.
 *
 * ⚠️ STOPGAP: This data lives exclusively in localStorage and is NOT
 * synced to the backend. It will be lost if the user clears browser
 * data or accesses the app from another device/browser.
 */
export interface TripExtras {
  countries: string[];
  travelType: string;
}

const DEFAULT_EXTRAS: TripExtras = { countries: [], travelType: '' };

/** Read extras for a single trip from localStorage. */
export function getTripExtras(tripId: string | number): TripExtras {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRIP_EXTRAS(tripId));
    if (raw) return JSON.parse(raw) as TripExtras;
  } catch {
    // Corrupted data — return defaults
  }
  return { ...DEFAULT_EXTRAS };
}

/** Write extras for a single trip to localStorage. */
export function saveTripExtras(
  tripId: string | number,
  extras: Partial<TripExtras>,
): void {
  const current = getTripExtras(tripId);
  const merged = { ...current, ...extras };
  localStorage.setItem(STORAGE_KEYS.TRIP_EXTRAS(tripId), JSON.stringify(merged));
}

/** Remove extras for a single trip from localStorage. */
export function deleteTripExtras(tripId: string | number): void {
  localStorage.removeItem(STORAGE_KEYS.TRIP_EXTRAS(tripId));
}

/**
 * Strips time component from a date string, returning only 'YYYY-MM-DD'.
 * Handles ISO strings like "2026-09-22T00:00:00.000Z" -> "2026-09-22".
 */
export function formatDateOnly(dateStr?: string | null): string {
  if (!dateStr) return '';
  return dateStr.split(/[T ]/)[0];
}

/**
 * Compute derived fields (nights, daysUntil) from a trip's dates.
 */
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

/**
 * Merge an array of API trips with their localStorage extras and derived fields.
 */
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

/**
 * Merge a single API trip with its localStorage extras and derived fields.
 */
export function mergeTripWithExtras(trip: Trip): Trip {
  return mergeTripsWithExtras([trip])[0];
}
