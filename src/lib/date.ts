export type UserDateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

export const DEFAULT_USER_DATE_FORMAT: UserDateFormat = 'MM/DD/YYYY';

interface DateParts {
  year: string;
  month: string;
  day: string;
}

function getIsoDateParts(value?: string | null): DateParts | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s]|$)/);
  if (!match) return null;

  const [, year, month, day] = match;
  const utcDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    utcDate.getUTCFullYear() !== Number(year) ||
    utcDate.getUTCMonth() + 1 !== Number(month) ||
    utcDate.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return { year, month, day };
}

export function toApiDate(value?: string | null): string {
  const parts = getIsoDateParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
}

export function formatDate(
  value?: string | null,
  dateFormat: string = DEFAULT_USER_DATE_FORMAT,
): string {
  const parts = getIsoDateParts(value);
  if (!parts) return '';

  switch (dateFormat.trim().toUpperCase()) {
    case 'DD/MM/YYYY':
      return `${parts.day}/${parts.month}/${parts.year}`;
    case 'YYYY-MM-DD':
      return `${parts.year}-${parts.month}-${parts.day}`;
    case 'MM/DD/YYYY':
    default:
      return `${parts.month}/${parts.day}/${parts.year}`;
  }
}

export function formatDateRange(
  startDate?: string | null,
  endDate?: string | null,
  dateFormat: string = DEFAULT_USER_DATE_FORMAT,
): string {
  const start = formatDate(startDate, dateFormat);
  const end = formatDate(endDate, dateFormat);

  if (start && end) return `${start} - ${end}`;
  return start || end || 'Flexible';
}
