import { getCountryId } from './countries';

interface MapboxContextEntry {
  id?: string;
  text?: string;
  short_code?: string;
}

export interface MapboxGeocodingFeature {
  id: string;
  text: string;
  place_name: string;
  place_type?: string[];
  center: [number, number];
  context?: MapboxContextEntry[];
  properties?: {
    mapbox_id?: string;
    short_code?: string;
  };
}

interface MapboxGeocodingResponse {
  features?: MapboxGeocodingFeature[];
}

export interface MapboxDestinationResult {
  featureId: string;
  mapboxId?: string;
  name: string;
  placeName: string;
  country: string;
  countryCode: string;
  region?: string;
  longitude: number;
  latitude: number;
}

const countryCodeCache = new Map<string, string>();

function normalizeIsoCode(value?: string): string | null {
  const code = value?.split('-')[0]?.trim().toLowerCase();
  return code && /^[a-z]{2}$/.test(code) ? code : null;
}

function contextEntry(
  feature: MapboxGeocodingFeature,
  prefix: 'country' | 'region',
): MapboxContextEntry | undefined {
  return feature.context?.find((entry) => entry.id?.startsWith(`${prefix}.`));
}

export function normalizeMapboxDestination(
  feature: MapboxGeocodingFeature,
  selectedCountry: string,
  restrictedCountryCode: string,
): MapboxDestinationResult | null {
  const country = contextEntry(feature, 'country');
  const region = contextEntry(feature, 'region');
  const code =
    normalizeIsoCode(country?.short_code) ||
    normalizeIsoCode(feature.properties?.short_code) ||
    normalizeIsoCode(restrictedCountryCode);
  if (!code || code !== normalizeIsoCode(restrictedCountryCode)) return null;

  const placeTypes = feature.place_type || [];
  const isCountryPlace = placeTypes.includes('country');
  const countryName =
    country?.text || (isCountryPlace ? feature.text : '') || selectedCountry;
  const regionName =
    region?.text ||
    (placeTypes.includes('region') && !isCountryPlace ? feature.text : undefined);
  const [longitude, latitude] = feature.center;
  if (
    !feature.id ||
    !feature.text ||
    !feature.place_name ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  )
    return null;

  return {
    featureId: feature.id,
    mapboxId: feature.properties?.mapbox_id,
    name: feature.text,
    placeName: feature.place_name,
    country: countryName,
    countryCode: code,
    region: regionName,
    longitude,
    latitude,
  };
}

function buildGeocodingUrl(
  query: string,
  token: string,
  parameters: Record<string, string>,
): string {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
  );
  Object.entries({ ...parameters, access_token: token }).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
  return url.toString();
}

export async function resolveMapboxCountryCode(
  countryName: string,
  token: string,
  signal: AbortSignal,
): Promise<string | null> {
  const countryId = getCountryId(countryName);
  if (!countryId) return null;
  const cached = countryCodeCache.get(countryId);
  if (cached) return cached;

  const response = await fetch(
    buildGeocodingUrl(countryName, token, {
      autocomplete: 'false',
      language: 'en',
      limit: '5',
      types: 'country',
    }),
    { signal },
  );
  if (!response.ok) throw new Error('Mapbox country lookup failed');

  const data = (await response.json()) as MapboxGeocodingResponse;
  const countryFeature = (data.features || []).find((feature) => {
    const featureCountry = contextEntry(feature, 'country');
    const candidates = [feature.text, featureCountry?.text];
    return candidates.some((candidate) => getCountryId(candidate) === countryId);
  });
  const featureCountry = countryFeature && contextEntry(countryFeature, 'country');
  const code = normalizeIsoCode(
    countryFeature?.properties?.short_code || featureCountry?.short_code,
  );
  if (code) countryCodeCache.set(countryId, code);
  return code;
}

export async function searchMapboxDestinations(
  query: string,
  selectedCountry: string,
  token: string,
  signal: AbortSignal,
): Promise<MapboxDestinationResult[]> {
  const cleanQuery = query.trim();
  const cleanCountry = selectedCountry.trim();
  if (!cleanQuery || !cleanCountry || !token) return [];

  const countryCode = await resolveMapboxCountryCode(cleanCountry, token, signal);
  if (!countryCode) return [];

  const response = await fetch(
    buildGeocodingUrl(cleanQuery, token, {
      autocomplete: 'true',
      country: countryCode,
      language: 'en',
      limit: '8',
      types: 'place',
    }),
    { signal },
  );
  if (!response.ok) throw new Error('Mapbox destination search failed');

  const data = (await response.json()) as MapboxGeocodingResponse;
  return (data.features || [])
    .map((feature) => normalizeMapboxDestination(feature, cleanCountry, countryCode))
    .filter((feature): feature is MapboxDestinationResult => feature !== null);
}
