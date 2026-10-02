import { normalizeCountryRoute, type CountryRouteEntry } from './countries';

export type PackingStatusFilter = 'All' | 'Packed' | 'Unpacked';

export interface FilterablePackingItem {
  packed: boolean;
  category: string;
  destination?: string;
}

type CountryInput = string | CountryRouteEntry;

export function getPackingCountryScopes(route: readonly CountryInput[]): string[] {
  return normalizeCountryRoute(route).map((country) => `Country: ${country.name}`);
}

export function isValidPackingScope(scope: string, countryScopes: readonly string[]) {
  return scope === 'Overall Trip' || countryScopes.includes(scope);
}

export function normalizePackingQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.floor(quantity));
}

export function filterPackingItems<T extends FilterablePackingItem>(
  items: readonly T[],
  category: string,
  status: PackingStatusFilter,
  scope: string,
): T[] {
  return items.filter((item) => {
    if (category !== 'All Items' && item.category !== category) return false;
    if (status === 'Packed' && !item.packed) return false;
    if (status === 'Unpacked' && item.packed) return false;
    if (scope !== 'All' && (item.destination || 'Overall Trip') !== scope) return false;
    return true;
  });
}
