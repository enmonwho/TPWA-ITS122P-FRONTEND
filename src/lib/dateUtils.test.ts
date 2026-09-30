import { describe, it, expect } from 'vitest';
import {
  parseDateOnly,
  formatDateOnly,
  compareDates,
  isRangeValid,
  isDateInRange,
  calculateDaysBetween,
  addDays,
  validateTripDateImpact,
} from './dateUtils';

describe('dateUtils', () => {
  describe('parseDateOnly', () => {
    it('parses valid YYYY-MM-DD string into components', () => {
      const parts = parseDateOnly('2026-10-12');
      expect(parts).toEqual({ year: 2026, month: 10, day: 12 });
    });

    it('returns null for invalid date strings', () => {
      expect(parseDateOnly('')).toBeNull();
      expect(parseDateOnly('invalid-date')).toBeNull();
      expect(parseDateOnly('2026-13-45')).toBeNull();
    });
  });

  describe('formatDateOnly', () => {
    it('formats DateParts into YYYY-MM-DD', () => {
      expect(formatDateOnly({ year: 2026, month: 4, day: 5 })).toBe('2026-04-05');
    });

    it('formats a Date object into YYYY-MM-DD without timezone shifting', () => {
      const d = new Date(2026, 9, 15); // Oct 15 2026
      expect(formatDateOnly(d)).toBe('2026-10-15');
    });
  });

  describe('compareDates', () => {
    it('correctly compares calendar dates', () => {
      expect(compareDates('2026-10-12', '2026-10-18')).toBeLessThan(0);
      expect(compareDates('2026-10-18', '2026-10-12')).toBeGreaterThan(0);
      expect(compareDates('2026-10-12', '2026-10-12')).toBe(0);
    });
  });

  describe('isRangeValid', () => {
    it('allows valid ranges', () => {
      expect(isRangeValid('2026-10-12', '2026-10-18')).toBe(true);
    });

    it('allows same-day ranges when allowSameDay is true', () => {
      expect(isRangeValid('2026-10-12', '2026-10-12', true)).toBe(true);
    });

    it('rejects end dates before start dates', () => {
      expect(isRangeValid('2026-10-18', '2026-10-12')).toBe(false);
    });
  });

  describe('isDateInRange', () => {
    it('returns true when date is between start and end inclusive', () => {
      expect(isDateInRange('2026-10-12', '2026-10-12', '2026-10-18')).toBe(true);
      expect(isDateInRange('2026-10-15', '2026-10-12', '2026-10-18')).toBe(true);
      expect(isDateInRange('2026-10-18', '2026-10-12', '2026-10-18')).toBe(true);
    });

    it('returns false when date is outside range', () => {
      expect(isDateInRange('2026-10-11', '2026-10-12', '2026-10-18')).toBe(false);
      expect(isDateInRange('2026-10-19', '2026-10-12', '2026-10-18')).toBe(false);
    });
  });

  describe('calculateDaysBetween', () => {
    it('calculates duration in days inclusive', () => {
      expect(calculateDaysBetween('2026-10-12', '2026-10-12')).toBe(1);
      expect(calculateDaysBetween('2026-10-12', '2026-10-18')).toBe(7);
    });
  });

  describe('addDays', () => {
    it('adds days across month boundaries', () => {
      expect(addDays('2026-10-30', 2)).toBe('2026-11-01');
    });
  });

  describe('validateTripDateImpact', () => {
    it('detects bookings that fall outside updated trip dates', () => {
      const result = validateTripDateImpact('2026-10-12', '2026-10-15', {
        bookings: [
          { id: 1, title: 'Island Hopping', booking_date: '2026-10-14' },
          { id: 2, title: 'Snorkeling', booking_date: '2026-10-18' },
        ],
      });

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toContain('Snorkeling');
    });

    it('passes when all dependents are within range', () => {
      const result = validateTripDateImpact('2026-10-12', '2026-10-20', {
        bookings: [{ id: 1, title: 'Island Hopping', booking_date: '2026-10-14' }],
      });

      expect(result.hasConflict).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });
  });
});
