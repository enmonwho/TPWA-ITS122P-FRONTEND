import { describe, expect, it } from 'vitest';
import { formatDate, formatDateRange, toApiDate } from './date';

describe('date preferences', () => {
  it.each([
    ['MM/DD/YYYY', '10/12/2026'],
    ['DD/MM/YYYY', '12/10/2026'],
    ['YYYY-MM-DD', '2026-10-12'],
  ])('formats an API date using %s', (preference, expected) => {
    expect(formatDate('2026-10-12T23:30:00Z', preference)).toBe(expected);
  });

  it('formats both dates in a range with the same preference', () => {
    expect(formatDateRange('2026-10-12', '2026-10-18', 'DD/MM/YYYY')).toBe(
      '12/10/2026 - 18/10/2026',
    );
  });

  it('keeps API and form dates in YYYY-MM-DD format', () => {
    expect(toApiDate('2026-10-12T23:30:00Z')).toBe('2026-10-12');
    expect(toApiDate('12/10/2026')).toBe('');
  });

  it('does not render invalid calendar dates', () => {
    expect(formatDate('2026-02-30', 'MM/DD/YYYY')).toBe('');
  });
});
