import type { BookingStatus } from '../types/booking';

export type BookingTypeFilter = 'all' | 'activity' | 'hotel';
export type BookingStatusFilter = 'all' | BookingStatus;

export interface FilterableBooking {
  type: 'activity' | 'hotel';
  status: BookingStatus;
}

export function normalizeBookingStatus(status?: string | null): BookingStatus {
  switch ((status || '').trim().toLowerCase()) {
    case 'confirmed':
    case 'processed':
      return 'confirmed';
    case 'completed':
    case 'used':
      return 'completed';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

export function filterBookings<T extends FilterableBooking>(
  bookings: readonly T[],
  typeFilter: BookingTypeFilter,
  statusFilter: BookingStatusFilter,
): T[] {
  return bookings.filter((booking) => {
    if (typeFilter !== 'all' && booking.type !== typeFilter) return false;
    if (statusFilter !== 'all' && booking.status !== statusFilter) return false;
    return true;
  });
}

export function countBookingStatuses(bookings: readonly FilterableBooking[]) {
  return bookings.reduce(
    (counts, booking) => {
      counts.all += 1;
      counts[booking.status] += 1;
      return counts;
    },
    { all: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 },
  );
}

export function countBookingTypes(bookings: readonly FilterableBooking[]) {
  return bookings.reduce(
    (counts, booking) => {
      counts.all += 1;
      counts[booking.type] += 1;
      return counts;
    },
    { all: 0, activity: 0, hotel: 0 },
  );
}
