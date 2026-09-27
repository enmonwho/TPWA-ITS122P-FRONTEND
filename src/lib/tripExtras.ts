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

/**
 * Retrieve user's configured date layout preference ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD').
 * Falls back to 'MM/DD/YYYY' default.
 */
export function getStoredDateFormat(): string {
  try {
    const rawUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.preferences?.dateFormat) {
        return parsed.preferences.dateFormat;
      }
      if (parsed?.id) {
        const rawPrefs = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES(parsed.id));
        if (rawPrefs) {
          const prefs = JSON.parse(rawPrefs);
          if (prefs.dateFormat) return prefs.dateFormat;
        }
      }
    }
  } catch {
    // ignore parse error
  }
  return 'MM/DD/YYYY';
}

/**
 * Format a date string according to the user's date format preference.
 * Handles ISO strings ('2026-10-12T00:00:00Z'), date strings ('2026-10-12'), etc.
 * Avoids UTC timezone conversion shifts by operating directly on date components.
 */
export function formatDateByPreference(
  dateStr?: string | null,
  dateFormat?: string,
): string {
  if (!dateStr) return '';
  const clean = dateStr.trim().split(/[T ]/)[0];
  if (!clean) return '';

  let year = '';
  let month = '';
  let day = '';

  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        [year, month, day] = parts;
      } else if (parts[2].length === 4) {
        // MM-DD-YYYY or DD-MM-YYYY
        month = parts[0];
        day = parts[1];
        year = parts[2];
      }
    }
  } else if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        [year, month, day] = parts;
      } else if (parts[2].length === 4) {
        // MM/DD/YYYY or DD/MM/YYYY
        month = parts[0];
        day = parts[1];
        year = parts[2];
      }
    }
  }

  if (!year || !month || !day) {
    return clean;
  }

  const normalizedYear = year;
  const normalizedMonth = month.padStart(2, '0');
  const normalizedDay = day.padStart(2, '0');

  const fmt = (dateFormat || getStoredDateFormat()).trim().toUpperCase();
  switch (fmt) {
    case 'DD/MM/YYYY':
      return `${normalizedDay}/${normalizedMonth}/${normalizedYear}`;
    case 'YYYY-MM-DD':
      return `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
    case 'MM/DD/YYYY':
    default:
      return `${normalizedMonth}/${normalizedDay}/${normalizedYear}`;
  }
}

/**
 * Formats a trip start and end date range according to the user's date format preference.
 */
export function formatTripDateRange(
  startDate?: string | null,
  endDate?: string | null,
  dateFormat?: string,
): string {
  const formattedStart = formatDateByPreference(startDate, dateFormat);
  const formattedEnd = formatDateByPreference(endDate, dateFormat);

  if (formattedStart && formattedEnd) {
    return `${formattedStart} - ${formattedEnd}`;
  }
  if (formattedStart) {
    return formattedStart;
  }
  if (formattedEnd) {
    return formattedEnd;
  }
  return 'Flexible';
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
