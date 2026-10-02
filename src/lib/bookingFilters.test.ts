import { describe, expect, it } from 'vitest';
import {
  countBookingStatuses,
  filterBookings,
  normalizeBookingStatus,
} from './bookingFilters';

const bookings = [
  { id: 1, type: 'activity' as const, status: 'pending' as const },
  { id: 2, type: 'hotel' as const, status: 'confirmed' as const },
  { id: 3, type: 'activity' as const, status: 'completed' as const },
];

describe('booking filters and counts', () => {
  it('normalizes processed and used reservation states', () => {
    expect(normalizeBookingStatus('processed')).toBe('confirmed');
    expect(normalizeBookingStatus('used')).toBe('completed');
    expect(normalizeBookingStatus('unknown')).toBe('pending');
  });

  it('filters immediately by type and status', () => {
    expect(
      filterBookings(bookings, 'activity', 'completed').map((item) => item.id),
    ).toEqual([3]);
    expect(filterBookings(bookings, 'hotel', 'pending')).toEqual([]);
  });

  it('derives tab counts from the supplied displayed data', () => {
    expect(countBookingStatuses(bookings)).toEqual({
      all: 3,
      pending: 1,
      confirmed: 1,
      completed: 1,
      cancelled: 0,
    });
  });
});
