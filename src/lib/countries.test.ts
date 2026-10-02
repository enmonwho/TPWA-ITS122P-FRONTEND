import { describe, expect, it } from 'vitest';
import {
  getCountryId,
  getCountryName,
  mergeCountryRoute,
  normalizeCountryRoute,
  orderDestinationsByCountryRoute,
  searchCountryOptions,
} from './countries';

describe('country normalization', () => {
  it('maps South Korea aliases to one canonical country ID', () => {
    const canonicalId = getCountryId('South Korea');

    expect(canonicalId).toBe('south-korea');
    expect(getCountryId('Korea, South')).toBe(canonicalId);
    expect(getCountryId('Republic of Korea')).toBe(canonicalId);
    expect(getCountryName('Republic of Korea')).toBe('South Korea');
  });

  it('rejects uncontrolled free-text countries', () => {
    expect(getCountryId('Made Up Country')).toBeNull();
  });

  it('returns canonical autocomplete matches for partial input', () => {
    expect(searchCountryOptions('Jap').map((country) => country.name)).toContain('Japan');
    expect(
      searchCountryOptions('Republic of Korea').map((country) => country.name),
    ).toContain('South Korea');
  });

  it('keeps Seoul under the existing South Korea country', () => {
    const route = normalizeCountryRoute(['Korea, South', 'Japan']);
    const afterAddingSeoul = mergeCountryRoute(route, ['Republic of Korea']);

    expect(afterAddingSeoul).toEqual([
      { countryId: 'south-korea', name: 'South Korea', order: 0 },
      { countryId: 'japan', name: 'Japan', order: 1 },
    ]);
  });
});

describe('multi-country ordering', () => {
  const route = normalizeCountryRoute(['South Korea', 'Japan', 'Philippines']);

  it('orders destinations by the configured route rather than response order', () => {
    const destinations = [
      { name: 'Manila', country: 'Philippines', order: 0 },
      { name: 'Tokyo', country: 'Japan', order: 1 },
      { name: 'Seoul', country: 'Republic of Korea', order: 2 },
    ];

    expect(
      orderDestinationsByCountryRoute(destinations, route).map((item) => item.name),
    ).toEqual(['Seoul', 'Tokyo', 'Manila']);
  });

  it('preserves persisted order after a JSON refresh round-trip', () => {
    const refreshedRoute = JSON.parse(JSON.stringify(route));
    const refreshedDestinations = JSON.parse(
      JSON.stringify([
        { name: 'Tokyo', countryId: 'japan', order: 1 },
        { name: 'Manila', countryId: 'philippines', order: 2 },
        { name: 'Seoul', countryId: 'south-korea', order: 0 },
      ]),
    ) as Array<{ name: string; countryId: string; order: number }>;

    expect(
      orderDestinationsByCountryRoute(refreshedDestinations, refreshedRoute).map(
        (item) => item.name,
      ),
    ).toEqual(['Seoul', 'Tokyo', 'Manila']);
  });

  it('keeps route order after a destination is deleted', () => {
    const remainingDestinations = [
      { name: 'Manila', countryId: 'philippines', order: 2 },
      { name: 'Tokyo', countryId: 'japan', order: 1 },
    ];

    expect(
      orderDestinationsByCountryRoute(remainingDestinations, route).map(
        (destination) => destination.name,
      ),
    ).toEqual(['Tokyo', 'Manila']);
  });
});
