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
  vibes?: string[];
  bestMonths?: number[]; // 0 for Jan, 8 for Sep, etc.
}

export interface VibeItem {
  id: string;
  name: string;
  iconName: string;
}

export const VIBES_LIST: VibeItem[] = [
  { id: 'adventure', name: 'Adventure', iconName: 'Compass' },
  { id: 'arts-culture', name: 'Arts & Culture', iconName: 'Palette' },
  { id: 'beach', name: 'Beach', iconName: 'Palmtree' },
  { id: 'food-drink', name: 'Food & Drink', iconName: 'Utensils' },
  { id: 'festivals', name: 'Festivals', iconName: 'Sparkles' },
  { id: 'history', name: 'History', iconName: 'Landmark' },
  { id: 'nature', name: 'Nature', iconName: 'Trees' },
  { id: 'nightlife', name: 'Nightlife', iconName: 'Wine' },
  { id: 'off-beaten-path', name: 'Off the Beaten Path', iconName: 'Footprints' },
  { id: 'romantic', name: 'Romantic', iconName: 'Heart' },
  { id: 'scenic', name: 'Scenic', iconName: 'Mountain' },
  { id: 'skiing', name: 'Skiing', iconName: 'Snowflake' },
  { id: 'spiritual', name: 'Spiritual', iconName: 'Flame' },
  { id: 'villages', name: 'Villages', iconName: 'Home' },
  { id: 'wellness', name: 'Wellness', iconName: 'Flower2' },
  { id: 'wildlife', name: 'Wildlife', iconName: 'PawPrint' },
];

export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const STORAGE_KEY_COUNTRIES = 'lakbye_explore_countries_v2';
const STORAGE_KEY_TIMESTAMP = 'lakbye_explore_timestamp_v2';
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
    flag: 'https://flagcdn.com/w320/ph.png',
    description: 'World-renowned powdery white sand beach and vibrant island life.',
    imageUrl:
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
    vibes: ['Beach', 'Nightlife', 'Romantic', 'Adventure'],
    bestMonths: [0, 1, 2, 3, 4, 10, 11],
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
    flag: 'https://flagcdn.com/w320/ph.png',
    description: 'Lush coconut palm roads, pristine lagoons, and world-class surfing.',
    imageUrl:
      'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=800&q=80',
    vibes: ['Adventure', 'Beach', 'Nature', 'Wellness'],
    bestMonths: [6, 7, 8, 9, 10],
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
    flag: 'https://flagcdn.com/w320/ph.png',
    description: 'Dramatic towering karst cliffs, emerald lagoons, and hidden beaches.',
    imageUrl:
      'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=800&q=80',
    vibes: ['Nature', 'Scenic', 'Beach', 'Romantic'],
    bestMonths: [0, 1, 2, 3, 4, 11],
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
    flag: 'https://flagcdn.com/w320/ph.png',
    description: 'Crystal-clear Kayangan Lake and World War II shipwreck dive sites.',
    imageUrl:
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
    vibes: ['Adventure', 'Nature', 'Scenic', 'Off the Beaten Path'],
    bestMonths: [0, 1, 2, 3, 4, 10, 11],
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
    flag: 'https://flagcdn.com/w320/ph.png',
    description: 'Picturesque rolling green pastures, stone houses, and tranquil cliffs.',
    imageUrl:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    vibes: ['Scenic', 'Villages', 'Nature', 'Wellness'],
    bestMonths: [1, 2, 3, 4, 5],
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
    flag: 'https://flagcdn.com/w320/id.png',
    description: 'Ancient temples, lush terraced rice paddies, and coastal sunsets.',
    imageUrl:
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
    vibes: ['Spiritual', 'Wellness', 'Beach', 'Arts & Culture'],
    bestMonths: [3, 4, 5, 6, 7, 8, 9],
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
    flag: 'https://flagcdn.com/w320/gr.png',
    description: 'Whitewashed cliffside villas, cobalt-blue domes, and Aegean vistas.',
    imageUrl:
      'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80',
    vibes: ['Romantic', 'Scenic', 'History', 'Food & Drink'],
    bestMonths: [4, 5, 6, 7, 8, 9],
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
    flag: 'https://flagcdn.com/w320/mv.png',
    description: 'Intimate coral atolls, turquoise lagoons, and marine sanctuaries.',
    imageUrl:
      'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=800&q=80',
    vibes: ['Romantic', 'Beach', 'Wellness', 'Scenic'],
    bestMonths: [0, 1, 2, 3, 10, 11],
  },
];

/**
 * Curated list of high-priority countries including Stippl reference picks (Brunei, Cook Islands, Eswatini)
 * and popular global destinations.
 */
export const SEED_POPULAR_COUNTRIES: ExplorePlace[] = [
  {
    id: 'BN',
    name: 'Brunei',
    country: 'Brunei',
    region: 'Asia',
    category: 'country',
    latitude: 4.5353,
    longitude: 114.7277,
    flag: 'https://flagcdn.com/w320/bn.png',
    population: 450000,
    imageUrl:
      'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1000&q=85',
    description:
      'A serene sultanate where rainforest meets regal Islamic heritage and golden-domed mosques.',
    tag: 'Regal Heritage',
    vibes: ['Spiritual', 'History', 'Nature', 'Off the Beaten Path'],
    bestMonths: [0, 1, 2, 8, 9, 10],
  },
  {
    id: 'CK',
    name: 'Cook Islands',
    country: 'Cook Islands',
    region: 'Oceania',
    category: 'island',
    latitude: -21.2367,
    longitude: -159.7777,
    flag: 'https://flagcdn.com/w320/ck.png',
    population: 17500,
    imageUrl:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    description:
      'Turquoise lagoons and breezy coral sands embracing authentic Polynesian tranquility.',
    tag: 'Turquoise Lagoons',
    vibes: ['Beach', 'Romantic', 'Nature', 'Off the Beaten Path'],
    bestMonths: [4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'SZ',
    name: 'Eswatini',
    country: 'Eswatini',
    region: 'Africa',
    category: 'country',
    latitude: -26.5225,
    longitude: 31.4659,
    flag: 'https://flagcdn.com/w320/sz.png',
    population: 1200000,
    imageUrl:
      'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=800&q=80',
    description:
      "Africa's last absolute monarchy with scenic highlands, rich wildlife, and cultural ceremonies.",
    tag: 'African Wilderness',
    vibes: ['Wildlife', 'Adventure', 'History', 'Festivals'],
    bestMonths: [4, 5, 6, 7, 8, 9],
  },
  {
    id: 'US',
    name: 'United States',
    country: 'United States',
    region: 'Americas',
    category: 'country',
    latitude: 37.0902,
    longitude: -95.7129,
    flag: 'https://flagcdn.com/w320/us.png',
    population: 335000000,
    imageUrl:
      'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?auto=format&fit=crop&w=800&q=80',
    description:
      'National parks, iconic coastlines, vibrant cityscapes, and diverse cultural melting pots.',
    tag: 'Diverse Landscapes',
    vibes: ['Adventure', 'Arts & Culture', 'Food & Drink', 'Scenic'],
    bestMonths: [4, 5, 8, 9, 10],
  },
  {
    id: 'FR',
    name: 'France',
    country: 'France',
    region: 'Europe',
    category: 'country',
    latitude: 46.2276,
    longitude: 2.2137,
    flag: 'https://flagcdn.com/w320/fr.png',
    population: 68000000,
    imageUrl:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
    description:
      'Iconic Parisian avenues, Provence lavender fields, haute cuisine, and Alpine peaks.',
    tag: 'Art & Romance',
    vibes: ['Arts & Culture', 'Romantic', 'Food & Drink', 'History'],
    bestMonths: [3, 4, 5, 8, 9, 10],
  },
  {
    id: 'IT',
    name: 'Italy',
    country: 'Italy',
    region: 'Europe',
    category: 'country',
    latitude: 41.8719,
    longitude: 12.5674,
    flag: 'https://flagcdn.com/w320/it.png',
    population: 59000000,
    imageUrl:
      'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80',
    description:
      'Renaissance art, dramatic coastal cliffs, ancient ruins, and world-class gastronomy.',
    tag: 'Cultural Heritage',
    vibes: ['Food & Drink', 'History', 'Arts & Culture', 'Romantic'],
    bestMonths: [3, 4, 5, 8, 9, 10],
  },
  {
    id: 'ES',
    name: 'Spain',
    country: 'Spain',
    region: 'Europe',
    category: 'country',
    latitude: 40.4637,
    longitude: -3.7492,
    flag: 'https://flagcdn.com/w320/es.png',
    population: 47000000,
    imageUrl:
      'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80',
    description:
      'Sun-drenched Mediterranean shores, flamenco rhythms, tapas, and Gothic architecture.',
    tag: 'Vibrant Culture',
    vibes: ['Festivals', 'Nightlife', 'Food & Drink', 'Beach'],
    bestMonths: [4, 5, 8, 9, 10],
  },
  {
    id: 'PH',
    name: 'Philippines',
    country: 'Philippines',
    region: 'Asia',
    category: 'country',
    latitude: 12.8797,
    longitude: 121.774,
    flag: 'https://flagcdn.com/w320/ph.png',
    population: 115000000,
    imageUrl:
      'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=800&q=80',
    description:
      'Archipelago of 7,641 islands known for beaches, diving, and warm hospitality.',
    tag: 'Tropical Archipelago',
    vibes: ['Beach', 'Adventure', 'Nature', 'Wellness'],
    bestMonths: [0, 1, 2, 3, 4, 11],
  },
  {
    id: 'JP',
    name: 'Japan',
    country: 'Japan',
    region: 'Asia',
    category: 'country',
    latitude: 36.2048,
    longitude: 138.2529,
    flag: 'https://flagcdn.com/w320/jp.png',
    population: 125000000,
    imageUrl:
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    description:
      'Futuristic megacities, ancient shrines, cherry blossoms, and culinary mastery.',
    tag: 'Ancient & Modern',
    vibes: ['Arts & Culture', 'Food & Drink', 'Spiritual', 'Villages'],
    bestMonths: [2, 3, 4, 9, 10, 11],
  },
  {
    id: 'TH',
    name: 'Thailand',
    country: 'Thailand',
    region: 'Asia',
    category: 'country',
    latitude: 15.87,
    longitude: 100.9925,
    flag: 'https://flagcdn.com/w320/th.png',
    population: 71000000,
    imageUrl:
      'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80',
    description:
      'Golden temples, bustling street markets, limestone islands, and flavorful dishes.',
    tag: 'Tropical Escapade',
    vibes: ['Food & Drink', 'Spiritual', 'Beach', 'Nightlife'],
    bestMonths: [0, 1, 2, 10, 11],
  },
  {
    id: 'CH',
    name: 'Switzerland',
    country: 'Switzerland',
    region: 'Europe',
    category: 'country',
    latitude: 46.8182,
    longitude: 8.2275,
    flag: 'https://flagcdn.com/w320/ch.png',
    population: 8700000,
    imageUrl:
      'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=800&q=80',
    description:
      'Alpine summits, crystal-clear glacial lakes, ski resorts, and scenic railway journeys.',
    tag: 'Alpine Wonder',
    vibes: ['Skiing', 'Scenic', 'Nature', 'Villages'],
    bestMonths: [0, 1, 5, 6, 7, 8, 11],
  },
  {
    id: 'AU',
    name: 'Australia',
    country: 'Australia',
    region: 'Oceania',
    category: 'country',
    latitude: -25.2744,
    longitude: 133.7751,
    flag: 'https://flagcdn.com/w320/au.png',
    population: 26000000,
    imageUrl:
      'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&w=800&q=80',
    description:
      'The Great Barrier Reef, Sydney Harbour, wild coasts, and vast red outback.',
    tag: 'Coastal & Wild',
    vibes: ['Adventure', 'Wildlife', 'Beach', 'Scenic'],
    bestMonths: [2, 3, 8, 9, 10, 11],
  },
  {
    id: 'BR',
    name: 'Brazil',
    country: 'Brazil',
    region: 'Americas',
    category: 'country',
    latitude: -14.235,
    longitude: -51.9253,
    flag: 'https://flagcdn.com/w320/br.png',
    population: 215000000,
    imageUrl:
      'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=800&q=80',
    description:
      'Copacabana beaches, Amazon rainforest, carnival rhythms, and thunderous waterfalls.',
    tag: 'Tropical Rhythms',
    vibes: ['Festivals', 'Beach', 'Wildlife', 'Adventure'],
    bestMonths: [0, 1, 2, 8, 9],
  },
  {
    id: 'ZA',
    name: 'South Africa',
    country: 'South Africa',
    region: 'Africa',
    category: 'country',
    latitude: -30.5595,
    longitude: 22.9375,
    flag: 'https://flagcdn.com/w320/za.png',
    population: 60000000,
    imageUrl:
      'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=800&q=80',
    description:
      'Kruger National Park safaris, Table Mountain panoramas, and coastal winelands.',
    tag: 'Wild Safari',
    vibes: ['Wildlife', 'Scenic', 'Adventure', 'Food & Drink'],
    bestMonths: [4, 5, 6, 7, 8, 9],
  },
  {
    id: 'NZ',
    name: 'New Zealand',
    country: 'New Zealand',
    region: 'Oceania',
    category: 'country',
    latitude: -40.9006,
    longitude: 174.886,
    flag: 'https://flagcdn.com/w320/nz.png',
    population: 5100000,
    imageUrl:
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
    description:
      'Fjords, geothermal geysers, glaciers, hiking tracks, and mountain scenery.',
    tag: 'Nature Paradise',
    vibes: ['Scenic', 'Adventure', 'Nature', 'Off the Beaten Path'],
    bestMonths: [0, 1, 2, 10, 11],
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
 * Fallback images for continents/regions when REST Countries has no seed match.
 */
const REGION_DEFAULT_IMAGES: Record<string, string> = {
  Europe:
    'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=800&q=80',
  Asia: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
  Americas:
    'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?auto=format&fit=crop&w=800&q=80',
  Africa:
    'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=800&q=80',
  Oceania:
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  Others:
    'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=800&q=80',
};

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
          country: name,
          region,
          category: 'country' as const,
          latitude: lat,
          longitude: lng,
          flag: c.flags?.svg || c.flags?.png || '',
          population: c.population || 0,
          imageUrl:
            seedMatch?.imageUrl ||
            REGION_DEFAULT_IMAGES[region] ||
            getMapboxStaticThumb(lng, lat, 320, 240, 5, 'outdoors-v12'),
          description:
            seedMatch?.description ||
            `Discover the breathtaking sights, local culture, and landscapes of ${name}.`,
          tag: seedMatch?.tag || region,
          vibes: seedMatch?.vibes || ['Scenic', 'Arts & Culture', 'Nature'],
          bestMonths: seedMatch?.bestMonths || [2, 3, 4, 8, 9, 10],
        };
      })
      .sort((a, b) => (b.population || 0) - (a.population || 0));

    // Ensure Brunei, Cook Islands, and Eswatini are included prominently at the top
    const seedIds = new Set(places.map((p) => p.id));
    for (const seed of SEED_POPULAR_COUNTRIES) {
      if (!seedIds.has(seed.id)) {
        places.unshift(seed);
      }
    }

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
 * Returns the 3 Editor's picks (1 large hero card + 2 stacked cards)
 * matching Stippl's featured layout (e.g. Brunei, Cook Islands, Eswatini).
 */
export function getEditorsPicks(allCountries: ExplorePlace[]): {
  hero: ExplorePlace;
  stackedTop: ExplorePlace;
  stackedBottom: ExplorePlace;
} {
  const brunei =
    allCountries.find((c) => c.name.toLowerCase().includes('brunei')) ||
    SEED_POPULAR_COUNTRIES[0];
  const cookIslands =
    allCountries.find((c) => c.name.toLowerCase().includes('cook')) ||
    SEED_POPULAR_COUNTRIES[1];
  const eswatini =
    allCountries.find(
      (c) =>
        c.name.toLowerCase().includes('eswatini') ||
        c.name.toLowerCase().includes('swaziland'),
    ) || SEED_POPULAR_COUNTRIES[2];

  return {
    hero: brunei,
    stackedTop: cookIslands,
    stackedBottom: eswatini,
  };
}

/**
 * Returns 4 seasonal destinations for "Best time to travel" based on selected month (0 to 11).
 * Defaults to iconic global destinations matching Stippl (United States, France, Italy, Spain).
 */
export function getBestTimeToTravel(
  allCountries: ExplorePlace[],
  monthIndex: number,
): ExplorePlace[] {
  // If places with bestMonths match, prioritize them
  const matching = allCountries.filter(
    (c) => c.bestMonths && c.bestMonths.includes(monthIndex),
  );

  if (matching.length >= 4) {
    return matching.slice(0, 4);
  }

  // Fallback to top recognizable seed countries (US, FR, IT, ES)
  const defaultSeeds = ['US', 'FR', 'IT', 'ES']
    .map((code) => allCountries.find((c) => c.id === code))
    .filter(Boolean) as ExplorePlace[];

  if (defaultSeeds.length === 4) return defaultSeeds;

  return allCountries.slice(0, 4);
}

/**
 * Filters places matching a selected vibe tag.
 */
export function getPlacesByVibe(
  places: ExplorePlace[],
  vibeName: string,
): ExplorePlace[] {
  const norm = vibeName.toLowerCase();
  return places.filter((p) => {
    if (p.vibes && p.vibes.some((v) => v.toLowerCase() === norm)) return true;
    if (p.tag && p.tag.toLowerCase().includes(norm)) return true;
    if (p.description && p.description.toLowerCase().includes(norm)) return true;
    return false;
  });
}

/**
 * Returns the featured "Most Popular" destination with rich metadata.
 */
export function getMostPopularDestination(allCountries: ExplorePlace[]): ExplorePlace {
  const featured =
    allCountries.find((c) => c.name.toLowerCase().includes('brunei')) ||
    allCountries.find((c) => c.id === 'PH') ||
    SEED_POPULAR_COUNTRIES[0];

  return featured;
}
