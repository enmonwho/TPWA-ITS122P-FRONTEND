import { STORAGE_KEYS } from './constants';
import type { Booking } from '../types/booking';

export interface BookingExtra {
  trip_id: number;
  booking_date?: string;
  booking_time?: string;
  custom_title?: string;
  custom_type?: 'activity' | 'hotel' | string;
  custom_location?: string;
  cost?: number | string;
  total_price?: number | string;
  notes?: string;
  activity_id?: number | null;
  activity_title?: string;
}

/**
 * Retrieves the side-table metadata for a specific backend-persisted booking ID.
 */
export function getBookingExtra(bookingId: string | number): BookingExtra | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKING_EXTRAS(bookingId));
    if (raw) {
      return JSON.parse(raw) as BookingExtra;
    }
  } catch {
    /* ignore parse errors */
  }
  return null;
}

/**
 * Saves the side-table metadata for a backend-persisted booking ID.
 */
export function saveBookingExtra(bookingId: string | number, extra: BookingExtra): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKING_EXTRAS(bookingId), JSON.stringify(extra));
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Retrieves all custom trip reservations (e.g. Hotel / Stay) saved for a trip.
 */
export function getTripCustomBookings(tripId: string | number): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRIP_BOOKINGS(tripId));
    if (raw) {
      const items = JSON.parse(raw);
      if (Array.isArray(items)) {
        return items as Booking[];
      }
    }
  } catch {
    /* ignore parse errors */
  }
  return [];
}

/**
 * Appends or updates a custom trip reservation (e.g. Hotel / Stay) for a trip.
 */
export function saveTripCustomBooking(tripId: string | number, booking: Booking): void {
  try {
    const current = getTripCustomBookings(tripId);
    const updated = [
      booking,
      ...current.filter((b) => String(b.id) !== String(booking.id)),
    ];
    localStorage.setItem(STORAGE_KEYS.TRIP_BOOKINGS(tripId), JSON.stringify(updated));
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Reconciles live backend bookings with persisted trip associations and merges
 * custom trip reservations (hotels/stays).
 */
export function reconcileTripBookings(
  backendBookings: Booking[],
  tripId: string | number,
): Booking[] {
  // 1. Enrich backend-persisted bookings with their saved trip extras
  const enrichedBackendBookings = backendBookings.map((b) => {
    const extra = getBookingExtra(b.id);
    if (!extra) return b;
    return {
      ...b,
      trip_id: b.trip_id && Number(b.trip_id) > 0 ? b.trip_id : extra.trip_id,
      booking_date: b.booking_date || extra.booking_date,
      cost: b.cost ?? extra.cost,
      total_price: b.total_price ?? extra.total_price,
      notes: b.notes || extra.notes,
      activity_title: b.activity_title || extra.activity_title,
      custom_title: b.custom_title || extra.custom_title,
      custom_type: b.custom_type || extra.custom_type,
      custom_location: b.custom_location || extra.custom_location,
    };
  });

  // 2. Fetch custom trip reservations for this trip
  const customBookings = getTripCustomBookings(tripId);

  // 3. Deduplicate by ID
  const seenIds = new Set<string>();
  const merged: Booking[] = [];

  for (const b of customBookings) {
    const key = String(b.id);
    if (!seenIds.has(key)) {
      seenIds.add(key);
      merged.push(b);
    }
  }

  for (const b of enrichedBackendBookings) {
    const key = String(b.id);
    if (!seenIds.has(key)) {
      seenIds.add(key);
      merged.push(b);
    }
  }

  return merged;
}
