import { describe, expect, it } from 'vitest';
import { isBookingDateWithinTripRange } from './bookingDateRange';

describe('booking date trip range', () => {
  const start = '2026-10-10';
  const end = '2026-10-17';

  it('allows the inclusive trip start, middle, and end dates', () => {
    expect(isBookingDateWithinTripRange(start, start, end)).toBe(true);
    expect(isBookingDateWithinTripRange('2026-10-13', start, end)).toBe(true);
    expect(isBookingDateWithinTripRange(end, start, end)).toBe(true);
  });

  it('rejects dates before and after the trip and invalid calendar dates', () => {
    expect(isBookingDateWithinTripRange('2026-10-09', start, end)).toBe(false);
    expect(isBookingDateWithinTripRange('2026-10-18', start, end)).toBe(false);
    expect(isBookingDateWithinTripRange('2026-02-30', start, end)).toBe(false);
  });

  it('uses the new trip range when the selected trip changes', () => {
    expect(isBookingDateWithinTripRange('2026-10-13', '2026-10-14', '2026-10-20')).toBe(
      false,
    );
    expect(isBookingDateWithinTripRange('2026-10-15', '2026-10-14', '2026-10-20')).toBe(
      true,
    );
  });
});
