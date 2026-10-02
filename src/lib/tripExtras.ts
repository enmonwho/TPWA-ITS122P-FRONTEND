import { STORAGE_KEYS } from './constants';
import type { Trip } from '../types/trip';
import { normalizeCountryRoute, type CountryRouteEntry } from './countries';

export interface TripExtras {
  countries: string[];
  countryRoute: CountryRouteEntry[];
  travelType: string;
  coverPhoto?: string;
}

const DEFAULT_EXTRAS: TripExtras = {
  countries: [],
  countryRoute: [],
  travelType: '',
  coverPhoto: '',
};

/**
 * Compresses an image file to a web-optimized JPEG data URL using HTML5 canvas.
 * Scales down large images to maxWidth x maxHeight (default 1280x720) and compresses to ~80-150KB.
 * Ensures the image payload is small enough for localStorage quotas, network uploads, and fast rendering.
 */
export function compressImage(
  file: File,
  maxWidth = 1280,
  maxHeight = 720,
  quality = 0.78,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function getTripExtras(tripId: string | number): TripExtras {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRIP_EXTRAS(tripId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TripExtras>;
      const countryRoute = normalizeCountryRoute(
        parsed.countryRoute?.length ? parsed.countryRoute : parsed.countries || [],
      );
      return {
        ...DEFAULT_EXTRAS,
        ...parsed,
        countries: countryRoute.map((country) => country.name),
        countryRoute,
      };
    }
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
  const routeInput = extras.countryRoute ?? extras.countries ?? current.countryRoute;
  const countryRoute = normalizeCountryRoute(routeInput);
  const merged = {
    ...current,
    ...extras,
    countries: countryRoute.map((country) => country.name),
    countryRoute,
  };
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
      countryRoute: extras.countryRoute,
      travelType: extras.travelType,
      cover_photo: trip.cover_photo || extras.coverPhoto || null,
      nights: derived.nights,
      daysUntil: derived.daysUntil,
    };
  });
}

export function mergeTripWithExtras(trip: Trip): Trip {
  return mergeTripsWithExtras([trip])[0];
}
