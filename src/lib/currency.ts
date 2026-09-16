/**
 * Currency conversion utilities powered by the Frankfurter API (https://api.frankfurter.dev/).
 *
 * Frankfurter provides free, European Central Bank (ECB) backed reference exchange rates,
 * updated once per business day around 16:00 CET.
 *
 * ARCHITECTURAL RULE:
 * This is a DISPLAY-LAYER ONLY conversion system.
 * The backend ledger and primary stored financial numbers always stay in canonical PHP.
 */

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
  name: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'PHP', symbol: '₱', label: 'PHP (₱)', name: 'Philippine Peso' },
  { code: 'USD', symbol: '$', label: 'USD ($)', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)', name: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥)', name: 'Japanese Yen' },
];

export interface ExchangeRatesResult {
  rates: Record<string, number>;
  date: string;
  isStale: boolean;
}

/** Fallback offline rates relative to base PHP if API and cache are both unavailable. */
const EMERGENCY_PHP_RATES: Record<string, number> = {
  PHP: 1,
  USD: 0.0175,
  EUR: 0.0161,
  GBP: 0.0135,
  JPY: 2.65,
};

/** Get today's local date string in YYYY-MM-DD format. */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Fetch exchange rates for the given base currency.
 *
 * Frankfurter rates update once per business day. This function:
 * 1. Checks localStorage for today's cached rates (`lakbye_fx_rates_${base}_${YYYY-MM-DD}`).
 * 2. If present, returns immediately without network request.
 * 3. If missing, calls https://api.frankfurter.dev/v1/latest?base=${base}.
 * 4. Caches successful responses under today's key and a persistent latest key.
 * 5. On failure, falls back to the most recently cached rates (with isStale: true).
 */
export async function fetchExchangeRates(
  base: string = 'PHP',
): Promise<ExchangeRatesResult> {
  const today = getTodayDateString();
  const todayCacheKey = `lakbye_fx_rates_${base}_${today}`;
  const latestCacheKey = `lakbye_fx_rates_${base}_latest`;
  const latestDateKey = `lakbye_fx_rates_${base}_latest_date`;

  // 1. Check today's cache first
  try {
    const cached = localStorage.getItem(todayCacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as Record<string, number>;
      return {
        rates: { ...parsed, [base]: 1 },
        date: today,
        isStale: false,
      };
    }
  } catch {
    // Continue to network fetch if cache read errors
  }

  // 2. Fetch from Frankfurter API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Frankfurter API HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data && data.rates && typeof data.rates === 'object') {
      const ratesWithSelf = { ...data.rates, [base]: 1 };

      // Cache today's rates
      try {
        localStorage.setItem(todayCacheKey, JSON.stringify(ratesWithSelf));
        localStorage.setItem(latestCacheKey, JSON.stringify(ratesWithSelf));
        localStorage.setItem(latestDateKey, data.date || today);
      } catch (storageErr) {
        console.warn('Unable to persist exchange rates to localStorage:', storageErr);
      }

      return {
        rates: ratesWithSelf,
        date: data.date || today,
        isStale: false,
      };
    }
    throw new Error('Malformed Frankfurter rates response');
  } catch (err) {
    console.warn(
      `Frankfurter exchange rate fetch failed for base ${base}, falling back to cache:`,
      err,
    );

    // 3. Fallback to previous day's cached rates
    try {
      const latestCached = localStorage.getItem(latestCacheKey);
      const latestDate = localStorage.getItem(latestDateKey) || 'previous session';
      if (latestCached) {
        return {
          rates: { ...JSON.parse(latestCached), [base]: 1 },
          date: latestDate,
          isStale: true,
        };
      }
    } catch {
      // Ignore cache parse error and proceed to emergency fallback
    }

    // 4. Emergency offline baseline
    return {
      rates: EMERGENCY_PHP_RATES,
      date: 'offline fallback',
      isStale: true,
    };
  }
}

/**
 * Pure conversion function using the base PHP rates object.
 *
 * @param amount - Numeric value to convert
 * @param from - Source currency code (e.g. 'PHP', 'USD')
 * @param to - Target currency code (e.g. 'EUR', 'PHP')
 * @param rates - Exchange rates map where rates[code] is the multiplier relative to base PHP
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number> = EMERGENCY_PHP_RATES,
): number {
  if (from === to || !amount || isNaN(amount)) {
    return amount;
  }

  // If base is PHP:
  const fromRate = rates[from] ?? (from === 'PHP' ? 1 : null);
  const toRate = rates[to] ?? (to === 'PHP' ? 1 : null);

  if (!fromRate || !toRate) {
    return amount;
  }

  let converted: number;
  if (from === 'PHP') {
    converted = amount * toRate;
  } else if (to === 'PHP') {
    converted = amount / fromRate;
  } else {
    // Cross-currency conversion through PHP base
    const inPhp = amount / fromRate;
    converted = inPhp * toRate;
  }

  // JPY typically has no fractional currency subunits
  if (to === 'JPY') {
    return Math.round(converted);
  }

  return Math.round(converted * 100) / 100;
}

/**
 * Get currency symbol for a given ISO code.
 */
export function getCurrencySymbol(code: string): string {
  const match = SUPPORTED_CURRENCIES.find(
    (c) => c.code.toUpperCase() === code.toUpperCase(),
  );
  return match ? match.symbol : code;
}

/**
 * Format a number with currency symbol and localized thousand separators.
 */
export function formatCurrency(amount: number, currencyCode: string = 'PHP'): string {
  const symbol = getCurrencySymbol(currencyCode);
  const fractionDigits = currencyCode === 'JPY' ? 0 : 2;

  const formattedNum = (amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  return `${symbol}${formattedNum}`;
}
