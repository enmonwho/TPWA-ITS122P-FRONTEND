/**
 * Service for dynamically fetching and managing Explore page destination data
 * using the REST Countries API, Mapbox static imagery, and curated island datasets.
 */

export interface ExplorePlace {
  id: string;
  name: string;
  country?: string;
  region: string;
  category: 'country' | 'island' | 'popular';
  latitude: number;
  longitude: number;
  imageUrl: string;
  flag?: string;
  description?: string;
  tag?: string;
  population?: number;
}

const STORAGE_KEY_COUNTRIES = 'lakbye_explore_countries_v1';
const STORAGE_KEY_TIMESTAMP = 'lakbye_explore_timestamp_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

/**
 * Generates a Mapbox static map thumbnail URL for any coordinate.
 */
export function getMapboxStaticThumb(
  lng: number,
  lat: number,
  width = 400,
  height = 300,
  zoom = 9,
  style: 'outdoors-v12' | 'satellite-streets-v12' | 'streets-v12' = 'outdoors-v12',
): string {
  if (!MAPBOX_TOKEN) {
    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';
  }
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${lng},${lat},${zoom},0/${width}x${height}@2x?access_token=${MAPBOX_TOKEN}`;
}

/**
 * Curated iconic island destinations with exact coordinates and custom visual thumbnails.
 */
export const TOP_ISLANDS: ExplorePlace[] = [
  {
    id: 'island-boracay',
    name: 'Boracay Island',
    country: 'Philippines',
    region: 'Asia',
    category: 'island',
    latitude: 11.9674,
    longitude: 121.9248,
    tag: 'White Sand Beach',
    description: 'World-renowned powdery white sand beach and vibrant island life.',
    imageUrl:
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'island-siargao',
    name: 'Siargao',
    country: 'Philippines',
    region: 'Asia',
    category: 'island',
    latitude: 9.8569,
    longitude: 126.0461,
    tag: 'Surfing Capital',
    description: 'Lush coconut palm roads, pristine lagoons, and world-class surfing.',
    imageUrl:
      'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'island-palawan',
    name: 'El Nido, Palawan',
    country: 'Philippines',
    region: 'Asia',
    category: 'island',
    latitude: 11.1949,
    longitude: 119.4013,
    tag: 'Limestone Lagoons',
    description: 'Dramatic towering karst cliffs, emerald lagoons, and hidden beaches.',
    imageUrl:
      'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'island-coron',
    name: 'Coron, Palawan',
    country: 'Philippines',
    region: 'Asia',
    category: 'island',
    latitude: 12.0006,
    longitude: 120.2003,
    tag: 'Shipwreck Diving',
    description: 'Crystal-clear Kayangan Lake and World War II shipwreck dive sites.',
    imageUrl:
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'island-batanes',
    name: 'Batanes Islands',
    country: 'Philippines',
    region: 'Asia',
    category: 'island',
    latitude: 20.4485,
    longitude: 121.9708,
    tag: 'Rolling Hills',
    description: 'Picturesque rolling green pastures, stone houses, and tranquil cliffs.',
    imageUrl:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'island-cebu',
    name: 'Bantayan & Malapascua',
    country: 'Philippines',
    region: 'Asia',
    category: 'island',
    latitude: 11.2185,
    longitude: 123.7381,
    tag: 'Island Hopping',
    description: 'Serene sandbars, thresher shark dives, and laid-back fishing villages.',
    imageUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'island-bali',
    name: 'Bali',
    country: 'Indonesia',
    region: 'Asia',
    category: 'island',
    latitude: -8.4095,
    longitude: 115.1889,
    tag: 'Island of the Gods',
    description: 'Ancient temples, lush terraced rice paddies, and coastal sunsets.',
    imageUrl:
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'island-santorini',
    name: 'Santorini',
    country: 'Greece',
    region: 'Europe',
    category: 'island',
    latitude: 36.3932,
    longitude: 25.4615,
    tag: 'Cycladic Haven',
    description: 'Whitewashed cliffside villas, cobalt-blue domes, and Aegean vistas.',
    imageUrl:
      'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'island-maldives',
    name: 'Maldives Atolls',
    country: 'Maldives',
    region: 'Asia',
    category: 'island',
    latitude: 3.2028,
    longitude: 73.2207,
    tag: 'Overwater Bungalows',
    description: 'Intimate coral atolls, turquoise lagoons, and marine sanctuaries.',
    imageUrl:
      'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=600&q=80',
  },
];

/**
 * Curated list of high-priority popular countries for instantaneous initial render
 * and offline fallback.
 */
const SEED_POPULAR_COUNTRIES: ExplorePlace[] = [
  {
    id: 'PH',
    name: 'Philippines',
    region: 'Asia',
    category: 'country',
    latitude: 12.8797,
    longitude: 121.774,
    flag: 'https://flagcdn.com/w320/ph.png',
    population: 115000000,
    imageUrl:
      'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=600&q=80',
    description:
      'Archipelago of 7,641 islands known for beaches, diving, and hospitality.',
    tag: 'Home Island Explorer',
  },
  {
    id: 'JP',
    name: 'Japan',
    region: 'Asia',
    category: 'country',
    latitude: 36.2048,
    longitude: 138.2529,
    flag: 'https://flagcdn.com/w320/jp.png',
    population: 125000000,
    imageUrl:
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
    description:
      'Futuristic megacities, ancient shrines, cherry blossoms, and culinary art.',
    tag: 'Top Asian Destination',
  },
  {
    id: 'IT',
    name: 'Italy',
    region: 'Europe',
    category: 'country',
    latitude: 41.8719,
    longitude: 12.5674,
    flag: 'https://flagcdn.com/w320/it.png',
    population: 59000000,
    imageUrl:
      'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=600&q=80',
    description:
      'Renaissance art, dramatic coastal cliffs, historic ruins, and gastronomy.',
    tag: 'Cultural Heritage',
  },
  {
    id: 'FR',
    name: 'France',
    region: 'Europe',
    category: 'country',
    latitude: 46.2276,
    longitude: 2.2137,
    flag: 'https://flagcdn.com/w320/fr.png',
    population: 68000000,
    imageUrl:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
    description: 'Iconic Parisian avenues, Provence lavender fields, and Alpine peaks.',
    tag: 'Art & Romance',
  },
  {
    id: 'ES',
    name: 'Spain',
    region: 'Europe',
    category: 'country',
    latitude: 40.4637,
    longitude: -3.7492,
    flag: 'https://flagcdn.com/w320/es.png',
    population: 47000000,
    imageUrl:
      'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=600&q=80',
    description: 'Sun-drenched Mediterranean shores, flamenco, and Gothic architecture.',
    tag: 'Vibrant Culture',
  },
  {
    id: 'TH',
    name: 'Thailand',
    region: 'Asia',
    category: 'country',
    latitude: 15.87,
    longitude: 100.9925,
    flag: 'https://flagcdn.com/w320/th.png',
    population: 71000000,
    imageUrl:
      'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=600&q=80',
    description: 'Golden temples, bustling night markets, and tropical limestone bays.',
    tag: 'Tropical Escapade',
  },
  {
    id: 'CH',
    name: 'Switzerland',
    region: 'Europe',
    category: 'country',
    latitude: 46.8182,
    longitude: 8.2275,
    flag: 'https://flagcdn.com/w320/ch.png',
    population: 8700000,
    imageUrl:
      'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=600&q=80',
    description: 'Alpine summits, sparkling mountain lakes, and scenic railway journeys.',
    tag: 'Alpine Wonder',
  },
  {
    id: 'AU',
    name: 'Australia',
    region: 'Oceania',
    category: 'country',
    latitude: -25.2744,
    longitude: 133.7751,
    flag: 'https://flagcdn.com/w320/au.png',
    population: 26000000,
    imageUrl:
      'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&w=600&q=80',
    description: 'The Great Barrier Reef, Sydney Harbour, and vast golden outback.',
    tag: 'Coastal Adventure',
  },
  {
    id: 'US',
    name: 'United States',
    region: 'Americas',
    category: 'country',
    latitude: 37.0902,
    longitude: -95.7129,
    flag: 'https://flagcdn.com/w320/us.png',
    population: 335000000,
    imageUrl:
      'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?auto=format&fit=crop&w=600&q=80',
    description: 'National parks, iconic coastlines, and world-class cultural hubs.',
    tag: 'Diverse Landscapes',
  },
  {
    id: 'BR',
    name: 'Brazil',
    region: 'Americas',
    category: 'country',
    latitude: -14.235,
    longitude: -51.9253,
    flag: 'https://flagcdn.com/w320/br.png',
    population: 215000000,
    imageUrl:
      'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=600&q=80',
    description: 'Copacabana beaches, Amazon rainforest, and vibrant carnival rhythms.',
    tag: 'Tropical Rhythms',
  },
  {
    id: 'ZA',
    name: 'South Africa',
    region: 'Africa',
    category: 'country',
    latitude: -30.5595,
    longitude: 22.9375,
    flag: 'https://flagcdn.com/w320/za.png',
    population: 60000000,
    imageUrl:
      'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=600&q=80',
    description: 'Kruger National Park safaris, Table Mountain, and coastal winelands.',
    tag: 'Wild Safari',
  },
  {
    id: 'NZ',
    name: 'New Zealand',
    region: 'Oceania',
    category: 'country',
    latitude: -40.9006,
    longitude: 174.886,
    flag: 'https://flagcdn.com/w320/nz.png',
    population: 5100000,
    imageUrl:
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
    description:
      'Fjords, geothermal geysers, glaciers, and Lord of the Rings landscapes.',
    tag: 'Nature Paradise',
  },
];

/**
 * Normalizes regions into standard buckets matching the UI tabs.
 */
function normalizeRegion(apiRegion: string): string {
  const norm = (apiRegion || '').toLowerCase();
  if (norm.includes('europe')) return 'Europe';
  if (norm.includes('asia')) return 'Asia';
  if (norm.includes('americ')) return 'Americas';
  if (norm.includes('africa')) return 'Africa';
  if (norm.includes('oceania')) return 'Oceania';
  return 'Others';
}

/**
 * Fetches countries dynamically from REST Countries API with local caching.
 */
export async function fetchExploreCountries(): Promise<ExplorePlace[]> {
  try {
    // 1. Check valid cache in localStorage
    const cachedData = localStorage.getItem(STORAGE_KEY_COUNTRIES);
    const cachedTime = localStorage.getItem(STORAGE_KEY_TIMESTAMP);

    if (cachedData && cachedTime) {
      const age = Date.now() - parseInt(cachedTime, 10);
      if (age < CACHE_TTL_MS) {
        const parsed = JSON.parse(cachedData) as ExplorePlace[];
        if (parsed.length > 0) return parsed;
      }
    }

    // 2. Fetch fresh country list from REST Countries API
    const response = await fetch(
      'https://restcountries.com/v3.1/all?fields=name,cca2,region,latlng,population,flags',
    );

    if (!response.ok) {
      throw new Error(`REST Countries responded with HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid REST Countries response structure');
    }

    const places: ExplorePlace[] = data
      .filter((c) => c.name?.common && Array.isArray(c.latlng) && c.latlng.length >= 2)
      .map((c) => {
        const lat = c.latlng[0];
        const lng = c.latlng[1];
        const name = c.name.common;
        const region = normalizeRegion(c.region);

        // Find curated seed match for high-res photo or generate Mapbox static thumb
        const seedMatch = SEED_POPULAR_COUNTRIES.find(
          (s) => s.id === c.cca2 || s.name.toLowerCase() === name.toLowerCase(),
        );

        return {
          id: c.cca2,
          name,
          region,
          category: 'country' as const,
          latitude: lat,
          longitude: lng,
          flag: c.flags?.svg || c.flags?.png || '',
          population: c.population || 0,
          imageUrl:
            seedMatch?.imageUrl ||
            getMapboxStaticThumb(lng, lat, 320, 240, 5, 'outdoors-v12'),
          description: seedMatch?.description || `${name} located in ${region}.`,
          tag: seedMatch?.tag || region,
        };
      })
      .sort((a, b) => (b.population || 0) - (a.population || 0));

    // Cache to localStorage
    try {
      localStorage.setItem(STORAGE_KEY_COUNTRIES, JSON.stringify(places));
      localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
    } catch {
      // Ignore quota storage limits
    }

    return places;
  } catch (err) {
    console.warn(
      'Failed to load live REST Countries, using high-res seed fallback:',
      err,
    );
    return SEED_POPULAR_COUNTRIES;
  }
}

/**
 * Returns the featured "Most Popular" destination with rich metadata.
 */
export function getMostPopularDestination(allCountries: ExplorePlace[]): ExplorePlace {
  // Prioritize Philippines or Japan for LakBye's travel audience
  const featured =
    allCountries.find((c) => c.id === 'PH') ||
    TOP_ISLANDS[0] ||
    allCountries[0] ||
    SEED_POPULAR_COUNTRIES[0];

  return {
    ...featured,
    name: 'Boracay, Philippines',
    tag: 'Trending Destination',
    description:
      'Voted one of the best tropical islands in the world. Famous for its powdery White Beach, turquoise waters, and sunset sailing.',
    imageUrl:
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=85',
    latitude: 11.9674,
    longitude: 121.9248,
  };
}
