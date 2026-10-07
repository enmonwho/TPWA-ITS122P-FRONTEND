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
      const routeInput =
        parsed.countryRoute !== undefined ? parsed.countryRoute : parsed.countries || [];
      const countryRoute = normalizeCountryRoute(routeInput);
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
  const routeInput =
    extras.countryRoute !== undefined
      ? extras.countryRoute
      : extras.countries !== undefined
        ? extras.countries
        : current.countryRoute;
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
    const serverRoute = normalizeCountryRoute(trip.countryRoute || []);
    const countryRoute =
      trip.countryRoutePersisted || serverRoute.length
        ? serverRoute
        : extras.countryRoute;
    return {
      ...trip,
      countries: countryRoute.map((country) => country.name),
      countryRoute,
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
