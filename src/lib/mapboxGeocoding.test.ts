import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeMapboxDestination,
  searchMapboxDestinations,
  type MapboxGeocodingFeature,
} from './mapboxGeocoding';

afterEach(() => vi.unstubAllGlobals());

describe('normalizeMapboxDestination', () => {
  it('normalizes place, country, region, coordinates, and IDs from context', () => {
    const feature: MapboxGeocodingFeature = {
      id: 'place.tokyo',
      text: 'Tokyo',
      place_name: 'Tokyo, Tokyo Prefecture, Japan',
      place_type: ['place'],
      center: [139.69, 35.68],
      context: [
        { id: 'region.1', text: 'Tokyo Prefecture' },
        { id: 'country.1', text: 'Japan', short_code: 'jp' },
      ],
      properties: { mapbox_id: 'dXJuOm1ieHBsYzp0b2t5bw' },
    };

    expect(normalizeMapboxDestination(feature, 'Japan', 'jp')).toEqual({
      featureId: 'place.tokyo',
      mapboxId: 'dXJuOm1ieHBsYzp0b2t5bw',
      name: 'Tokyo',
      placeName: 'Tokyo, Tokyo Prefecture, Japan',
      country: 'Japan',
      countryCode: 'jp',
      region: 'Tokyo Prefecture',
      longitude: 139.69,
      latitude: 35.68,
    });
  });

  it('uses the country-restricted Singapore place when normal country context is absent', () => {
    const feature: MapboxGeocodingFeature = {
      id: 'place.singapore',
      text: 'Singapore',
      place_name: 'Singapore',
      place_type: ['country', 'place'],
      center: [103.808, 1.3516],
      properties: { short_code: 'sg' },
    };

    expect(normalizeMapboxDestination(feature, 'Singapore', 'sg')).toMatchObject({
      name: 'Singapore',
      country: 'Singapore',
      countryCode: 'sg',
      longitude: 103.808,
      latitude: 1.3516,
    });
  });

  it('rejects results from a country other than the country filter', () => {
    const feature: MapboxGeocodingFeature = {
      id: 'place.busan',
      text: 'Busan',
      place_name: 'Busan, South Korea',
      place_type: ['place'],
      center: [129.07, 35.17],
      context: [{ id: 'country.kr', text: 'South Korea', short_code: 'kr' }],
    };

    expect(normalizeMapboxDestination(feature, 'Japan', 'jp')).toBeNull();
  });

  it('resolves an ISO code before searching only place results in that country', async () => {
    const requestedUrls: URL[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      requestedUrls.push(url);
      const features =
        url.searchParams.get('types') === 'country'
          ? [
              {
                id: 'country.tr',
                text: 'Turkey',
                place_name: 'Turkey',
                place_type: ['country'],
                center: [35, 39],
                properties: { short_code: 'tr' },
              },
            ]
          : [
              {
                id: 'place.istanbul',
                text: 'Istanbul',
                place_name: 'Istanbul, Turkey',
                place_type: ['place'],
                center: [28.97, 41.01],
                context: [{ id: 'country.tr', text: 'Turkey', short_code: 'tr' }],
              },
            ];
      return new Response(JSON.stringify({ features }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchMapboxDestinations(
      'Istanbul',
      'Turkey',
      'pk.test-token',
      new AbortController().signal,
    );

    expect(requestedUrls).toHaveLength(2);
    expect(requestedUrls[0].searchParams.get('types')).toBe('country');
    expect(requestedUrls[1].searchParams.get('country')).toBe('tr');
    expect(requestedUrls[1].searchParams.get('types')).toBe('place');
    expect(requestedUrls[1].searchParams.get('language')).toBe('en');
    expect(requestedUrls[1].searchParams.get('autocomplete')).toBe('true');
    expect(results[0]).toMatchObject({
      name: 'Istanbul',
      country: 'Turkey',
      countryCode: 'tr',
      longitude: 28.97,
      latitude: 41.01,
    });
  });
});
