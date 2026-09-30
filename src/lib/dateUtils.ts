/**
 * Centralized Date Utilities for Calendar Date Handling.
 * Operates strictly on calendar date representations (YYYY-MM-DD)
 * to prevent timezone drift across positive and negative UTC offsets.
 */

export interface DateParts {
  year: number;
  month: number; // 1-indexed (1 = January, 12 = December)
  day: number;
}

/**
 * Parses a YYYY-MM-DD string into year, month, day components without UTC drift.
 */
export function parseDateOnly(dateStr?: string | null): DateParts | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { year, month, day };
}

/**
 * Formats a DateParts object or Date into a standardized YYYY-MM-DD string.
 */
export function formatDateOnly(date: DateParts | Date): string {
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const year = date.year;
  const month = String(date.month).padStart(2, '0');
  const day = String(date.day).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's calendar date as YYYY-MM-DD in the local browser timezone.
 */
export function getTodayDateString(): string {
  return formatDateOnly(new Date());
}

/**
 * Safely compares two YYYY-MM-DD strings.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareDates(a: string, b: string): number {
  const pA = parseDateOnly(a);
  const pB = parseDateOnly(b);
  if (!pA || !pB) return a.localeCompare(b);

  if (pA.year !== pB.year) return pA.year - pB.year;
  if (pA.month !== pB.month) return pA.month - pB.month;
  return pA.day - pB.day;
}

/**
 * Validates whether a trip date range is logically valid.
 * By default allows same-day travel (start == end).
 */
export function isRangeValid(
  startDateStr?: string | null,
  endDateStr?: string | null,
  allowSameDay = true,
): boolean {
  if (!startDateStr || !endDateStr) return false;
  const cmp = compareDates(startDateStr, endDateStr);
  return allowSameDay ? cmp <= 0 : cmp < 0;
}

/**
 * Checks whether a given target date falls within the start and end dates (inclusive).
 */
export function isDateInRange(
  targetDate: string,
  startDate: string,
  endDate: string,
): boolean {
  if (!targetDate || !startDate || !endDate) return false;
  return (
    compareDates(targetDate, startDate) >= 0 && compareDates(targetDate, endDate) <= 0
  );
}

/**
 * Calculates inclusive calendar duration in days between two YYYY-MM-DD strings.
 * Example: 2026-10-12 to 2026-10-12 is 1 day.
 */
export function calculateDaysBetween(startDateStr: string, endDateStr: string): number {
  const pA = parseDateOnly(startDateStr);
  const pB = parseDateOnly(endDateStr);
  if (!pA || !pB) return 1;

  // Use UTC midnight for exact 86400s daylight-saving independent diff
  const utcA = Date.UTC(pA.year, pA.month - 1, pA.day);
  const utcB = Date.UTC(pB.year, pB.month - 1, pB.day);
  const diffMs = utcB - utcA;
  if (diffMs < 0) return 0;

  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Safely adds days to a YYYY-MM-DD string and returns a new YYYY-MM-DD string.
 */
export function addDays(dateStr: string, days: number): string {
  const parts = parseDateOnly(dateStr);
  if (!parts) return dateStr;

  const d = new Date(parts.year, parts.month - 1, parts.day);
  d.setDate(d.getDate() + days);
  return formatDateOnly(d);
}

export interface DependentConflictCheck {
  destinations?: { id?: string | number; name?: string; date?: string; days?: number }[];
  bookings?: { id?: string | number; title?: string; booking_date?: string }[];
}

/**
 * Evaluates whether changing trip dates invalidates existing dependent records (bookings, destinations).
 */
export function validateTripDateImpact(
  newStartDate: string,
  newEndDate: string,
  dependents: DependentConflictCheck,
): { hasConflict: boolean; conflicts: string[] } {
  const conflicts: string[] = [];

  if (!isRangeValid(newStartDate, newEndDate, true)) {
    conflicts.push('Trip end date cannot be earlier than start date.');
    return { hasConflict: true, conflicts };
  }

  // Check bookings
  if (dependents.bookings) {
    for (const b of dependents.bookings) {
      if (b.booking_date) {
        if (!isDateInRange(b.booking_date, newStartDate, newEndDate)) {
          conflicts.push(
            `Booking "${b.title || 'Reservation'}" on ${b.booking_date} falls outside the new trip dates (${newStartDate} to ${newEndDate}).`,
          );
        }
      }
    }
  }

  // Check destinations with explicit dates
  if (dependents.destinations) {
    for (const dest of dependents.destinations) {
      if (dest.date) {
        if (!isDateInRange(dest.date, newStartDate, newEndDate)) {
          conflicts.push(
            `Destination "${dest.name || 'Stop'}" on ${dest.date} falls outside the new trip dates.`,
          );
        }
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}
