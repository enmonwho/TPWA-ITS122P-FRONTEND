import type { Trip } from '../types/trip';

const tripMemoryCache = new Map<string, Trip>();

export function getCachedTrip(tripId: string | number | undefined): Trip | null {
  if (!tripId) return null;
  const key = String(tripId);
  const inMemory = tripMemoryCache.get(key);
  if (inMemory) return inMemory;

  try {
    const local = localStorage.getItem(`lakbye_cached_trip_${key}`);
    if (local) {
      const parsed = JSON.parse(local) as Trip;
      tripMemoryCache.set(key, parsed);
      return parsed;
    }
  } catch {
    /* ignore parsing errors */
  }
  return null;
}

export function setCachedTrip(tripId: string | number | undefined, trip: Trip): void {
  if (!tripId || !trip) return;
  const key = String(tripId);
  tripMemoryCache.set(key, trip);
  try {
    localStorage.setItem(`lakbye_cached_trip_${key}`, JSON.stringify(trip));
  } catch {
    /* ignore storage quota errors */
  }
}
