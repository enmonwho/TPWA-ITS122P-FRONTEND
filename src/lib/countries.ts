import { COUNTRIES } from '../constants/countries';

export type CountryId = string;

export interface CountryOption {
  id: CountryId;
  name: string;
  aliases: string[];
}

export interface CountryRouteEntry {
  countryId: CountryId;
  name: string;
  order: number;
}

type CountryRouteInput =
  | string
  | {
      countryId?: unknown;
      id?: unknown;
      name?: unknown;
      country?: unknown;
      order?: unknown;
    };

const COUNTRY_ALIASES: Record<string, string[]> = {
  'South Korea': ['Korea, South', 'Republic of Korea', 'Korea Republic'],
  'North Korea': ['Korea, North', "Democratic People's Republic of Korea"],
  'United States': ['United States of America', 'USA', 'U.S.A.', 'US'],
  'United Kingdom': ['UK', 'Great Britain'],
  Czechia: ['Czech Republic'],
  Russia: ['Russian Federation'],
  Vietnam: ['Viet Nam'],
};

function normalizeLookupValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function createCountryId(name: string): CountryId {
  return normalizeLookupValue(name).replace(/\s+/g, '-');
}

export const COUNTRY_OPTIONS: CountryOption[] = COUNTRIES.map((name) => ({
  id: createCountryId(name),
  name,
  aliases: COUNTRY_ALIASES[name] || [],
}));

const COUNTRY_BY_ID = new Map(COUNTRY_OPTIONS.map((country) => [country.id, country]));
const COUNTRY_BY_LOOKUP = new Map<string, CountryOption>();

COUNTRY_OPTIONS.forEach((country) => {
  [country.name, ...country.aliases].forEach((value) => {
    COUNTRY_BY_LOOKUP.set(normalizeLookupValue(value), country);
  });
});

export function getCountryOption(value?: string | null): CountryOption | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return (
    COUNTRY_BY_ID.get(trimmed) ||
    COUNTRY_BY_LOOKUP.get(normalizeLookupValue(trimmed)) ||
    null
  );
}

export function getCountryId(value?: string | null): CountryId | null {
  return getCountryOption(value)?.id || null;
}

export function getCountryName(value?: string | null): string {
  return getCountryOption(value)?.name || '';
}

export function searchCountryOptions(
  query: string,
  excludedCountryIds: readonly CountryId[] = [],
): CountryOption[] {
  const normalizedQuery = query.trim().toLowerCase();
  const excluded = new Set(excludedCountryIds);

  return COUNTRY_OPTIONS.filter((country) => {
    if (excluded.has(country.id)) return false;
    if (!normalizedQuery) return true;

    return [country.name, ...country.aliases].some((candidate) => {
      const lower = candidate.toLowerCase();
      if (lower.includes(normalizedQuery)) return true;
      return lower
        .split(/\s+/)
        .some(
          (word) => word.startsWith(normalizedQuery) || normalizedQuery.startsWith(word),
        );
    });
  });
}

export function normalizeCountryRoute(
  inputs: readonly CountryRouteInput[] = [],
): CountryRouteEntry[] {
  const resolved = inputs
    .map((input, index) => {
      const rawId =
        typeof input === 'object' && input ? (input.countryId ?? input.id) : undefined;
      const rawName =
        typeof input === 'string'
          ? input
          : input && typeof input === 'object'
            ? (input.name ?? input.country)
            : undefined;
      const option = getCountryOption(
        typeof rawId === 'string' && rawId
          ? rawId
          : typeof rawName === 'string'
            ? rawName
            : '',
      );
      if (!option) return null;

      const rawOrder = typeof input === 'object' && input ? Number(input.order) : index;
      return {
        option,
        sourceIndex: index,
        order: Number.isFinite(rawOrder) ? rawOrder : index,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => a.order - b.order || a.sourceIndex - b.sourceIndex);

  const seen = new Set<CountryId>();
  return resolved
    .filter(({ option }) => {
      if (seen.has(option.id)) return false;
      seen.add(option.id);
      return true;
    })
    .map(({ option }, order) => ({ countryId: option.id, name: option.name, order }));
}

export function mergeCountryRoute(
  current: readonly CountryRouteInput[],
  additions: readonly CountryRouteInput[],
): CountryRouteEntry[] {
  return normalizeCountryRoute([...current, ...additions]);
}

export function removeCountryFromRoute(
  current: readonly CountryRouteInput[],
  countryId: CountryId,
): CountryRouteEntry[] {
  const canonicalId = getCountryId(countryId);
  return normalizeCountryRoute(current)
    .filter((entry) => entry.countryId !== canonicalId)
    .map((entry, order) => ({ ...entry, order }));
}

export function orderDestinationsByCountryRoute<
  T extends { countryId?: string; country?: string; order?: number },
>(destinations: readonly T[], route: readonly CountryRouteInput[]): T[] {
  const routeRank = new Map(
    normalizeCountryRoute(route).map((country) => [country.countryId, country.order]),
  );

  return destinations
    .map((destination, sourceIndex) => ({ destination, sourceIndex }))
    .sort((a, b) => {
      const aCountryId = getCountryId(a.destination.countryId || a.destination.country);
      const bCountryId = getCountryId(b.destination.countryId || b.destination.country);
      const aRank = aCountryId
        ? (routeRank.get(aCountryId) ?? Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER;
      const bRank = bCountryId
        ? (routeRank.get(bCountryId) ?? Number.MAX_SAFE_INTEGER)
        : Number.MAX_SAFE_INTEGER;

      if (aRank !== bRank) return aRank - bRank;

      const aOrder = Number(a.destination.order);
      const bOrder = Number(b.destination.order);
      const safeAOrder = Number.isFinite(aOrder) ? aOrder : a.sourceIndex;
      const safeBOrder = Number.isFinite(bOrder) ? bOrder : b.sourceIndex;
      return safeAOrder - safeBOrder || a.sourceIndex - b.sourceIndex;
    })
    .map(({ destination }) => destination);
}
