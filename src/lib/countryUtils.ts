/**
 * Canonical Country Normalization and Mapping Utilities.
 * Ensures consistent country naming, stable ISO country codes, and city-to-country resolution.
 */

// Stable ISO 3166-1 alpha-2 country codes for canonical countries
export const COUNTRY_CODES: Record<string, string> = {
  'South Korea': 'KR',
  'North Korea': 'KP',
  Japan: 'JP',
  Philippines: 'PH',
  'United States': 'US',
  'United Kingdom': 'GB',
  France: 'FR',
  Italy: 'IT',
  Germany: 'DE',
  Spain: 'ES',
  Australia: 'AU',
  Canada: 'CA',
  China: 'CN',
  Taiwan: 'TW',
  'Hong Kong': 'HK',
  Macau: 'MO',
  Singapore: 'SG',
  Thailand: 'TH',
  Indonesia: 'ID',
  Malaysia: 'MY',
  Vietnam: 'VN',
  Cambodia: 'KH',
  Switzerland: 'CH',
  Netherlands: 'NL',
  'United Arab Emirates': 'AE',
  Egypt: 'EG',
  Iceland: 'IS',
  'New Zealand': 'NZ',
  Turkey: 'TR',
  Greece: 'GR',
  Portugal: 'PT',
  Ireland: 'IE',
  Norway: 'NO',
  Sweden: 'SE',
  Denmark: 'DK',
  Austria: 'AT',
  Belgium: 'BE',
  Czechia: 'CZ',
  Hungary: 'HU',
  Croatia: 'HR',
  Poland: 'PL',
  Brazil: 'BR',
  Argentina: 'AR',
  Peru: 'PE',
  Mexico: 'MX',
  'South Africa': 'ZA',
  Morocco: 'MA',
  Qatar: 'QA',
};

// Aliases mapping varied representations to canonical country name
const COUNTRY_ALIASES: Record<string, string> = {
  // South Korea aliases
  'korea, south': 'South Korea',
  'south korea': 'South Korea',
  'republic of korea': 'South Korea',
  'korea, republic of': 'South Korea',
  'korea (south)': 'South Korea',
  rok: 'South Korea',
  korea: 'South Korea',

  // North Korea aliases
  'korea, north': 'North Korea',
  'north korea': 'North Korea',
  "democratic people's republic of korea": 'North Korea',
  dprk: 'North Korea',
  'korea (north)': 'North Korea',

  // United States aliases
  'united states': 'United States',
  'united states of america': 'United States',
  usa: 'United States',
  'u.s.a.': 'United States',
  'u.s.': 'United States',
  us: 'United States',

  // United Kingdom aliases
  'united kingdom': 'United Kingdom',
  uk: 'United Kingdom',
  'u.k.': 'United Kingdom',
  'great britain': 'United Kingdom',
  britain: 'United Kingdom',
  england: 'United Kingdom',
  scotland: 'United Kingdom',
  wales: 'United Kingdom',

  // UAE aliases
  'united arab emirates': 'United Arab Emirates',
  uae: 'United Arab Emirates',
  'u.a.e.': 'United Arab Emirates',

  // Philippines aliases
  philippines: 'Philippines',
  ph: 'Philippines',
  pilipinas: 'Philippines',

  // Others
  'czech republic': 'Czechia',
  czechia: 'Czechia',
  'viet nam': 'Vietnam',
  vietnam: 'Vietnam',
  'russian federation': 'Russia',
  russia: 'Russia',
};

// Curated city-to-canonical-country mapping to prevent cities from creating new country entries
const CITY_TO_COUNTRY: Record<string, string> = {
  // South Korea
  seoul: 'South Korea',
  busan: 'South Korea',
  incheon: 'South Korea',
  jeju: 'South Korea',
  'jeju island': 'South Korea',
  daegu: 'South Korea',
  daejeon: 'South Korea',
  gwangju: 'South Korea',
  suwon: 'South Korea',
  gangneung: 'South Korea',

  // Japan
  tokyo: 'Japan',
  kyoto: 'Japan',
  osaka: 'Japan',
  sapporo: 'Japan',
  nara: 'Japan',
  fukuoka: 'Japan',
  hiroshima: 'Japan',
  okinawa: 'Japan',
  nagoya: 'Japan',
  yokohama: 'Japan',

  // Philippines
  manila: 'Philippines',
  cebu: 'Philippines',
  'cebu city': 'Philippines',
  boracay: 'Philippines',
  'el nido': 'Philippines',
  coron: 'Philippines',
  palawan: 'Philippines',
  siargao: 'Philippines',
  baguio: 'Philippines',
  bohol: 'Philippines',
  davao: 'Philippines',
  'davao city': 'Philippines',
  tagaytay: 'Philippines',
  batanes: 'Philippines',
  vigan: 'Philippines',
  dumaguete: 'Philippines',
  'puerto princesa': 'Philippines',
  sagada: 'Philippines',

  // France
  paris: 'France',
  nice: 'France',
  lyon: 'France',
  marseille: 'France',
  bordeaux: 'France',

  // Italy
  rome: 'Italy',
  florence: 'Italy',
  venice: 'Italy',
  milan: 'Italy',
  naples: 'Italy',
  amalfi: 'Italy',

  // United Kingdom
  london: 'United Kingdom',
  edinburgh: 'United Kingdom',
  manchester: 'United Kingdom',
  birmingham: 'United Kingdom',

  // United States
  'new york': 'United States',
  'new york city': 'United States',
  'los angeles': 'United States',
  'san francisco': 'United States',
  'las vegas': 'United States',
  chicago: 'United States',
  miami: 'United States',
  honolulu: 'United States',

  // Thailand
  bangkok: 'Thailand',
  'chiang mai': 'Thailand',
  phuket: 'Thailand',
  krabi: 'Thailand',

  // Indonesia
  bali: 'Indonesia',
  jakarta: 'Indonesia',
  yogyakarta: 'Indonesia',

  // Singapore
  singapore: 'Singapore',

  // Spain
  barcelona: 'Spain',
  madrid: 'Spain',
  seville: 'Spain',

  // Australia
  sydney: 'Australia',
  melbourne: 'Australia',
  brisbane: 'Australia',

  // Switzerland
  zurich: 'Switzerland',
  geneva: 'Switzerland',
  interlaken: 'Switzerland',
  lucerne: 'Switzerland',

  // Germany
  berlin: 'Germany',
  munich: 'Germany',
  frankfurt: 'Germany',
};

/**
 * Normalizes a country name to its canonical form.
 * e.g. "Korea, South" -> "South Korea", "USA" -> "United States"
 */
export function normalizeCountry(input?: string | null): string {
  if (!input) return '';
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // 1. Direct alias match
  if (COUNTRY_ALIASES[lower]) {
    return COUNTRY_ALIASES[lower];
  }

  // 2. City name mistakenly passed as country
  if (CITY_TO_COUNTRY[lower]) {
    return CITY_TO_COUNTRY[lower];
  }

  // 3. Fallback: Title-case or original trimmed string
  return trimmed;
}

/**
 * Gets the ISO 3166-1 alpha-2 code for a country.
 */
export function getCountryCode(countryName?: string | null): string {
  const canonical = normalizeCountry(countryName);
  return COUNTRY_CODES[canonical] || canonical.substring(0, 2).toUpperCase();
}

/**
 * Checks if a city/destination name matches a known country.
 * Returns canonical country name or null if unknown.
 */
export function getCountryForCity(cityName?: string | null): string | null {
  if (!cityName) return null;
  const clean = cityName.trim().toLowerCase();

  // 1. Direct match
  if (CITY_TO_COUNTRY[clean]) {
    return CITY_TO_COUNTRY[clean];
  }

  // 2. Contains match (e.g. "El Nido, Palawan" -> Philippines)
  for (const [cityKey, country] of Object.entries(CITY_TO_COUNTRY)) {
    if (clean === cityKey || clean.startsWith(cityKey) || clean.includes(cityKey)) {
      return country;
    }
  }

  return null;
}

/**
 * Compares two country names for equivalence under normalization.
 */
export function isSameCountry(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return normalizeCountry(a).toLowerCase() === normalizeCountry(b).toLowerCase();
}

/**
 * Given a list of countries, removes duplicate aliases and preserves order.
 */
export function deduplicateCountries(countries: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const c of countries) {
    const canonical = normalizeCountry(c);
    const key = canonical.toLowerCase();
    if (canonical && !seen.has(key)) {
      seen.add(key);
      result.push(canonical);
    }
  }

  return result;
}
