import { STORAGE_KEYS } from './constants';
import {
  formatCurrency as formatRawCurrency,
  convert,
  getCurrencySymbol,
  SUPPORTED_CURRENCIES,
} from './currency';
import { formatDateByPreference, formatTripDateRange } from './tripExtras';

/**
 * Reads user preferences from active cache or user session in localStorage.
 */
export function getActiveUserPreferences(): {
  currency: string;
  dateFormat: string;
  timeFormat: string;
  distanceUnit: string;
} {
  const defaults = {
    currency: 'PHP',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    distanceUnit: 'km',
  };

  try {
    const rawUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (rawUser) {
      const parsedUser = JSON.parse(rawUser);
      const userPrefs = parsedUser?.preferences || {};
      const userId = parsedUser?.id;

      let storedPrefs: Record<string, string> = {};
      if (userId) {
        const rawPrefs = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES(userId));
        if (rawPrefs) {
          storedPrefs = JSON.parse(rawPrefs);
        }
      }

      return {
        currency: (
          userPrefs.currency ||
          storedPrefs.currency ||
          defaults.currency
        ).toUpperCase(),
        dateFormat: userPrefs.dateFormat || storedPrefs.dateFormat || defaults.dateFormat,
        timeFormat: userPrefs.timeFormat || storedPrefs.timeFormat || defaults.timeFormat,
        distanceUnit:
          userPrefs.distanceUnit || storedPrefs.distanceUnit || defaults.distanceUnit,
      };
    }
  } catch {
    // ignore parse error and use defaults
  }

  return defaults;
}

/**
 * Formats a monetary amount adhering to user's preferred currency.
 * Automatically converts base PHP values to target currency if needed.
 */
export function formatUserCurrency(
  amountInBase: number,
  preferredCurrency?: string,
  baseCurrency: string = 'PHP',
  rates?: Record<string, number>,
): string {
  const targetCode = (
    preferredCurrency ||
    getActiveUserPreferences().currency ||
    'PHP'
  ).toUpperCase();
  const converted = convert(amountInBase || 0, baseCurrency, targetCode, rates);
  return formatRawCurrency(converted, targetCode);
}

/**
 * Formats a date string ('YYYY-MM-DD', ISO, etc.) adhering to user's date format preference.
 */
export function formatUserDate(dateStr?: string | null, customFormat?: string): string {
  if (!dateStr) return '';
  const fmt = customFormat || getActiveUserPreferences().dateFormat;
  return formatDateByPreference(dateStr, fmt);
}

/**
 * Formats a start & end date range adhering to user's date format preference.
 */
export function formatUserDateRange(
  startDate?: string | null,
  endDate?: string | null,
  customFormat?: string,
): string {
  const fmt = customFormat || getActiveUserPreferences().dateFormat;
  return formatTripDateRange(startDate, endDate, fmt);
}

/**
 * Formats a time string or Date object according to user's time preference ('12h' or '24h').
 */
export function formatUserTime(
  timeInput?: string | Date | null,
  customFormat?: '12h' | '24h' | string,
): string {
  if (!timeInput) return '';
  const mode = (
    customFormat ||
    getActiveUserPreferences().timeFormat ||
    '12h'
  ).toLowerCase();

  let hours = 0;
  let minutes = 0;

  if (timeInput instanceof Date) {
    hours = timeInput.getHours();
    minutes = timeInput.getMinutes();
  } else {
    const trimmed = timeInput.trim();
    if (trimmed.includes('T') || trimmed.includes('-')) {
      const parsedDate = new Date(trimmed);
      if (!isNaN(parsedDate.getTime())) {
        hours = parsedDate.getHours();
        minutes = parsedDate.getMinutes();
      }
    } else if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
    }
  }

  const minsFormatted = String(minutes).padStart(2, '0');

  if (mode === '24h') {
    return `${String(hours).padStart(2, '0')}:${minsFormatted}`;
  }

  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minsFormatted} ${ampm}`;
}

/**
 * Formats distance according to user preference ('km' or 'mi').
 * Takes distance in kilometers and converts to miles if configured.
 */
export function formatUserDistance(
  distanceInKm: number,
  customUnit?: 'km' | 'mi' | string,
): string {
  const unit = (
    customUnit ||
    getActiveUserPreferences().distanceUnit ||
    'km'
  ).toLowerCase();
  if (unit === 'mi') {
    const miles = (distanceInKm || 0) * 0.621371;
    return `${miles.toLocaleString('en-US', { maximumFractionDigits: 1 })} mi`;
  }
  return `${(distanceInKm || 0).toLocaleString('en-US', { maximumFractionDigits: 1 })} km`;
}

/**
 * Formats population or large metric with clean abbreviation (e.g. 115M, 1.2M, 50K).
 */
export function formatUserPopulation(num?: number | null): string {
  const val = Number(num) || 0;
  if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(1) + 'B';
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
  if (val >= 1_000) return (val / 1_000).toFixed(1) + 'K';
  return val.toLocaleString();
}

export { getCurrencySymbol, SUPPORTED_CURRENCIES };
