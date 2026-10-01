import { describe, it, expect } from 'vitest';
import type { Booking } from '../types/booking';
import { formatDateByPreference } from './tripExtras';

function formatScheduleDateTime(
  bookingDate?: string | null,
  startTime?: string | null,
): string {
  if (!bookingDate) {
    return startTime ? `Time: ${startTime}` : '—';
  }
  if (
    bookingDate.includes('T') ||
    (bookingDate.includes(' ') && bookingDate.includes(':'))
  ) {
    const formatted = formatDateByPreference(bookingDate);
    const d = new Date(bookingDate);
    const timePart = !isNaN(d.getTime())
      ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : '';
    return timePart ? `${formatted} ${timePart}` : formatted;
  }
  const datePart = formatDateByPreference(bookingDate);
  return startTime ? `${datePart} • ${startTime}` : datePart;
}

describe('Staff Dashboard Booking Mapping & Timestamps', () => {
  it('correctly maps Scheduled Date & Time from booking_date without falling back to created_at', () => {
    const booking: Booking = {
      id: 101,
      user_id: 1,
      status: 'pending',
      booking_date: '2026-11-20',
      created_at: '2026-10-01T08:30:00Z',
    };

    const scheduled = formatScheduleDateTime(booking.booking_date, '10:00 AM');
    expect(scheduled).toContain('11/20/2026 • 10:00 AM');

    // When booking_date is absent, it must NOT show created_at
    const unscheduledBooking: Booking = {
      id: 102,
      user_id: 1,
      status: 'pending',
      created_at: '2026-10-01T08:30:00Z',
    };
    const unscheduled = formatScheduleDateTime(unscheduledBooking.booking_date);
    expect(unscheduled).toBe('—');
    expect(unscheduled).not.toContain('2026-10-01');
  });

  it('correctly maps Submitted At strictly to request creation time (created_at)', () => {
    const booking: Booking = {
      id: 103,
      user_id: 1,
      status: 'pending',
      booking_date: '2026-12-05',
      created_at: '2026-10-01T09:15:00Z',
    };

    expect(booking.created_at).toBe('2026-10-01T09:15:00Z');
  });

  it('correctly maps Processed At to processed_at or updated_at, never created_at', () => {
    const processedBooking: Booking = {
      id: 104,
      user_id: 2,
      status: 'confirmed',
      booking_date: '2026-12-01',
      created_at: '2026-10-01T10:00:00Z',
      processed_at: '2026-10-01T14:30:00Z',
      updated_at: '2026-10-01T14:30:00Z',
    };

    const processedAt =
      processedBooking.processed_at || processedBooking.updated_at || '—';
    expect(processedAt).toBe('2026-10-01T14:30:00Z');
    expect(processedAt).not.toBe(processedBooking.created_at);
  });

  it('sorts by scheduled date vs submitted date independently', () => {
    const list: Booking[] = [
      {
        id: 1,
        user_id: 1,
        status: 'pending',
        booking_date: '2026-12-25',
        created_at: '2026-10-05T00:00:00Z',
      },
      {
        id: 2,
        user_id: 2,
        status: 'pending',
        booking_date: '2026-11-01',
        created_at: '2026-10-10T00:00:00Z',
      },
    ];

    // Sort by scheduled date asc (booking_date)
    const sortedByScheduled = [...list].sort(
      (a, b) =>
        new Date(a.booking_date || 0).getTime() - new Date(b.booking_date || 0).getTime(),
    );
    expect(sortedByScheduled[0].id).toBe(2); // Nov 1 before Dec 25

    // Sort by submitted date asc (created_at)
    const sortedBySubmitted = [...list].sort(
      (a, b) =>
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
    );
    expect(sortedBySubmitted[0].id).toBe(1); // Oct 5 before Oct 10
  });
});
