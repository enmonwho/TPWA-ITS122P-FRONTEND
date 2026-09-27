import { getCoordinatesForName } from '../constants/coordinates';

export const ACCOMMODATION_OPTIONS = [
  'Hotel (Standard / 3-4★)',
  'Luxury Hotel & Resort (5★)',
  'Boutique Hotel',
  'Resort & Spa',
  'Vacation Rental / Airbnb',
  'Hostel / Capsule Hotel',
  'Bed & Breakfast (B&B)',
  'Villa & Beachfront Suite',
  'Eco Lodge / Glamping',
  'Guesthouse / Homestay',
  'Apartment / Aparthotel',
];

export const ACTIVITIES_OPTIONS = [
  'Sightseeing & Iconic Landmarks',
  'Cultural & Historical Walking Tour',
  'Museums, Art & Architecture',
  'Food Tour & Local Street Food',
  'Beach, Island Hopping & Water Sports',
  'Mountain Hiking & Nature Trekking',
  'Adventure & Theme Parks',
  'Shopping & Night Markets',
  'Nightlife & City Entertainment',
  'Spa, Wellness & Thermal Springs',
  'Wildlife Safari & Marine Encounter',
  'Photography & Sunset Cruise',
];

export const TRANSPORTATION_OPTIONS = [
  'Flight (International / Domestic)',
  'High-Speed Bullet Train / Shinkansen',
  'Express Train / Intercity Rail',
  'Subway & Metro Transit',
  'Rental Car / Road Trip',
  'Private Transfer / Taxi / Grab',
  'Ferry / Passenger Boat',
  'Scenic Coach / Bus',
  'Bicycle / Scooter Rental',
  'Walking / Pedestrian Exploration',
];

export interface AutoFillRecommendation {
  name: string;
  country?: string;
  nights: number;
  accommodation: string;
  activities: string;
  transportation: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Curated smart recommendations for top global destinations.
 */
const CITY_RECOMMENDATIONS: Record<
  string,
  Omit<AutoFillRecommendation, 'name' | 'latitude' | 'longitude'>
> = {
  tokyo: {
    country: 'Japan',
    nights: 4,
    accommodation: 'Boutique Hotel',
    activities: 'Sightseeing & Iconic Landmarks',
    transportation: 'High-Speed Bullet Train / Shinkansen',
  },
  kyoto: {
    country: 'Japan',
    nights: 3,
    accommodation: 'Guesthouse / Homestay',
    activities: 'Cultural & Historical Walking Tour',
    transportation: 'Express Train / Intercity Rail',
  },
  osaka: {
    country: 'Japan',
    nights: 3,
    accommodation: 'Hotel (Standard / 3-4★)',
    activities: 'Food Tour & Local Street Food',
    transportation: 'Subway & Metro Transit',
  },
  paris: {
    country: 'France',
    nights: 4,
    accommodation: 'Boutique Hotel',
    activities: 'Museums, Art & Architecture',
    transportation: 'Subway & Metro Transit',
  },
  nice: {
    country: 'France',
    nights: 3,
    accommodation: 'Resort & Spa',
    activities: 'Beach, Island Hopping & Water Sports',
    transportation: 'Express Train / Intercity Rail',
  },
  rome: {
    country: 'Italy',
    nights: 3,
    accommodation: 'Bed & Breakfast (B&B)',
    activities: 'Cultural & Historical Walking Tour',
    transportation: 'Subway & Metro Transit',
  },
  florence: {
    country: 'Italy',
    nights: 3,
    accommodation: 'Boutique Hotel',
    activities: 'Museums, Art & Architecture',
    transportation: 'Express Train / Intercity Rail',
  },
  venice: {
    country: 'Italy',
    nights: 2,
    accommodation: 'Boutique Hotel',
    activities: 'Photography & Sunset Cruise',
    transportation: 'Ferry / Passenger Boat',
  },
  london: {
    country: 'United Kingdom',
    nights: 4,
    accommodation: 'Hotel (Standard / 3-4★)',
    activities: 'Sightseeing & Iconic Landmarks',
    transportation: 'Subway & Metro Transit',
  },
  edinburgh: {
    country: 'United Kingdom',
    nights: 3,
    accommodation: 'Bed & Breakfast (B&B)',
    activities: 'Cultural & Historical Walking Tour',
    transportation: 'Express Train / Intercity Rail',
  },
  'new york': {
    country: 'United States',
    nights: 4,
    accommodation: 'Hotel (Standard / 3-4★)',
    activities: 'Sightseeing & Iconic Landmarks',
    transportation: 'Subway & Metro Transit',
  },
  'san francisco': {
    country: 'United States',
    nights: 3,
    accommodation: 'Boutique Hotel',
    activities: 'Sightseeing & Iconic Landmarks',
    transportation: 'Subway & Metro Transit',
  },
  'los angeles': {
    country: 'United States',
    nights: 4,
    accommodation: 'Hotel (Standard / 3-4★)',
    activities: 'Adventure & Theme Parks',
    transportation: 'Rental Car / Road Trip',
  },
  manila: {
    country: 'Philippines',
    nights: 2,
    accommodation: 'Hotel (Standard / 3-4★)',
    activities: 'Food Tour & Local Street Food',
    transportation: 'Private Transfer / Taxi / Grab',
  },
  cebu: {
    country: 'Philippines',
    nights: 3,
    accommodation: 'Resort & Spa',
    activities: 'Beach, Island Hopping & Water Sports',
    transportation: 'Ferry / Passenger Boat',
  },
  boracay: {
    country: 'Philippines',
    nights: 4,
    accommodation: 'Villa & Beachfront Suite',
    activities: 'Beach, Island Hopping & Water Sports',
    transportation: 'Ferry / Passenger Boat',
  },
  palawan: {
    country: 'Philippines',
    nights: 4,
    accommodation: 'Eco Lodge / Glamping',
    activities: 'Beach, Island Hopping & Water Sports',
    transportation: 'Ferry / Passenger Boat',
  },
  'el nido': {
    country: 'Philippines',
    nights: 4,
    accommodation: 'Eco Lodge / Glamping',
    activities: 'Beach, Island Hopping & Water Sports',
    transportation: 'Ferry / Passenger Boat',
  },
  coron: {
    country: 'Philippines',
    nights: 3,
    accommodation: 'Resort & Spa',
    activities: 'Beach, Island Hopping & Water Sports',
    transportation: 'Ferry / Passenger Boat',
  },
  siargao: {
    country: 'Philippines',
    nights: 4,
    accommodation: 'Villa & Beachfront Suite',
    activities: 'Beach, Island Hopping & Water Sports',
    transportation: 'Bicycle / Scooter Rental',
  },
  baguio: {
    country: 'Philippines',
    nights: 2,
    accommodation: 'Bed & Breakfast (B&B)',
    activities: 'Mountain Hiking & Nature Trekking',
    transportation: 'Scenic Coach / Bus',
  },
  bohol: {
    country: 'Philippines',
    nights: 3,
    accommodation: 'Resort & Spa',
    activities: 'Wildlife Safari & Marine Encounter',
    transportation: 'Rental Car / Road Trip',
  },
  bali: {
    country: 'Indonesia',
    nights: 4,
    accommodation: 'Resort & Spa',
    activities: 'Beach, Island Hopping & Water Sports',
    transportation: 'Private Transfer / Taxi / Grab',
  },
  bangkok: {
    country: 'Thailand',
    nights: 3,
    accommodation: 'Boutique Hotel',
    activities: 'Food Tour & Local Street Food',
    transportation: 'Subway & Metro Transit',
  },
  phuket: {
    country: 'Thailand',
    nights: 4,
    accommodation: 'Resort & Spa',
    activities: 'Beach, Island Hopping & Water Sports',
    transportation: 'Private Transfer / Taxi / Grab',
  },
  'chiang mai': {
    country: 'Thailand',
    nights: 3,
    accommodation: 'Guesthouse / Homestay',
    activities: 'Cultural & Historical Walking Tour',
    transportation: 'Bicycle / Scooter Rental',
  },
  singapore: {
    country: 'Singapore',
    nights: 3,
    accommodation: 'Luxury Hotel & Resort (5★)',
    activities: 'Sightseeing & Iconic Landmarks',
    transportation: 'Subway & Metro Transit',
  },
  seoul: {
    country: 'South Korea',
    nights: 4,
    accommodation: 'Boutique Hotel',
    activities: 'Shopping & Night Markets',
    transportation: 'Subway & Metro Transit',
  },
  busan: {
    country: 'South Korea',
    nights: 3,
    accommodation: 'Hotel (Standard / 3-4★)',
    activities: 'Beach, Island Hopping & Water Sports',
    transportation: 'High-Speed Bullet Train / Shinkansen',
  },
  sydney: {
    country: 'Australia',
    nights: 4,
    accommodation: 'Hotel (Standard / 3-4★)',
    activities: 'Sightseeing & Iconic Landmarks',
    transportation: 'Subway & Metro Transit',
  },
  melbourne: {
    country: 'Australia',
    nights: 3,
    accommodation: 'Boutique Hotel',
    activities: 'Food Tour & Local Street Food',
    transportation: 'Subway & Metro Transit',
  },
  barcelona: {
    country: 'Spain',
    nights: 4,
    accommodation: 'Boutique Hotel',
    activities: 'Museums, Art & Architecture',
    transportation: 'Subway & Metro Transit',
  },
  madrid: {
    country: 'Spain',
    nights: 3,
    accommodation: 'Hotel (Standard / 3-4★)',
    activities: 'Museums, Art & Architecture',
    transportation: 'High-Speed Bullet Train / Shinkansen',
  },
  amsterdam: {
    country: 'Netherlands',
    nights: 3,
    accommodation: 'Boutique Hotel',
    activities: 'Museums, Art & Architecture',
    transportation: 'Bicycle / Scooter Rental',
  },
  berlin: {
    country: 'Germany',
    nights: 3,
    accommodation: 'Hotel (Standard / 3-4★)',
    activities: 'Cultural & Historical Walking Tour',
    transportation: 'Subway & Metro Transit',
  },
  zurich: {
    country: 'Switzerland',
    nights: 3,
    accommodation: 'Boutique Hotel',
    activities: 'Sightseeing & Iconic Landmarks',
    transportation: 'Scenic Coach / Bus',
  },
  interlaken: {
    country: 'Switzerland',
    nights: 3,
    accommodation: 'Eco Lodge / Glamping',
    activities: 'Mountain Hiking & Nature Trekking',
    transportation: 'Scenic Coach / Bus',
  },
  dubai: {
    country: 'United Arab Emirates',
    nights: 3,
    accommodation: 'Luxury Hotel & Resort (5★)',
    activities: 'Sightseeing & Iconic Landmarks',
    transportation: 'Private Transfer / Taxi / Grab',
  },
  cairo: {
    country: 'Egypt',
    nights: 3,
    accommodation: 'Hotel (Standard / 3-4★)',
    activities: 'Cultural & Historical Walking Tour',
    transportation: 'Private Transfer / Taxi / Grab',
  },
  reykjavik: {
    country: 'Iceland',
    nights: 4,
    accommodation: 'Eco Lodge / Glamping',
    activities: 'Mountain Hiking & Nature Trekking',
    transportation: 'Rental Car / Road Trip',
  },
};

/**
 * Top curated highlight stops per country for full itinerary generation.
 */
export const COUNTRY_HIGHLIGHT_STOPS: Record<string, string[]> = {
  japan: ['Tokyo', 'Kyoto', 'Osaka'],
  philippines: ['Manila', 'Cebu', 'Boracay'],
  france: ['Paris', 'Nice'],
  italy: ['Rome', 'Florence', 'Venice'],
  'united kingdom': ['London', 'Edinburgh'],
  'united states': ['New York', 'San Francisco', 'Los Angeles'],
  spain: ['Barcelona', 'Madrid'],
  thailand: ['Bangkok', 'Chiang Mai', 'Phuket'],
  'south korea': ['Seoul', 'Busan'],
  australia: ['Sydney', 'Melbourne'],
  indonesia: ['Bali', 'Jakarta'],
  switzerland: ['Zurich', 'Interlaken'],
  germany: ['Berlin', 'Munich'],
};

export interface DestinationPlace {
  name: string;
  country: string;
}

/**
 * Curated destination places with countries for instant autocomplete search.
 */
export const POPULAR_PLACES: DestinationPlace[] = [
  // Philippines
  { name: 'Boracay', country: 'Philippines' },
  { name: 'Cebu City', country: 'Philippines' },
  { name: 'El Nido, Palawan', country: 'Philippines' },
  { name: 'Coron, Palawan', country: 'Philippines' },
  { name: 'Siargao', country: 'Philippines' },
  { name: 'Baguio', country: 'Philippines' },
  { name: 'Manila', country: 'Philippines' },
  { name: 'Bohol (Panglao)', country: 'Philippines' },
  { name: 'Batanes', country: 'Philippines' },
  { name: 'Tagaytay', country: 'Philippines' },
  { name: 'Davao City', country: 'Philippines' },
  { name: 'Vigan', country: 'Philippines' },
  { name: 'Dumaguete', country: 'Philippines' },
  { name: 'Puerto Princesa', country: 'Philippines' },
  { name: 'Sagada', country: 'Philippines' },

  // Japan & East Asia
  { name: 'Tokyo', country: 'Japan' },
  { name: 'Kyoto', country: 'Japan' },
  { name: 'Osaka', country: 'Japan' },
  { name: 'Sapporo', country: 'Japan' },
  { name: 'Nara', country: 'Japan' },
  { name: 'Fukuoka', country: 'Japan' },
  { name: 'Hiroshima', country: 'Japan' },
  { name: 'Seoul', country: 'South Korea' },
  { name: 'Busan', country: 'South Korea' },
  { name: 'Jeju Island', country: 'South Korea' },
  { name: 'Taipei', country: 'Taiwan' },
  { name: 'Kaohsiung', country: 'Taiwan' },
  { name: 'Hong Kong', country: 'Hong Kong' },
  { name: 'Macau', country: 'Macau' },
  { name: 'Beijing', country: 'China' },
  { name: 'Shanghai', country: 'China' },

  // Southeast Asia
  { name: 'Singapore', country: 'Singapore' },
  { name: 'Bangkok', country: 'Thailand' },
  { name: 'Chiang Mai', country: 'Thailand' },
  { name: 'Phuket', country: 'Thailand' },
  { name: 'Krabi', country: 'Thailand' },
  { name: 'Koh Samui', country: 'Thailand' },
  { name: 'Bali', country: 'Indonesia' },
  { name: 'Jakarta', country: 'Indonesia' },
  { name: 'Yogyakarta', country: 'Indonesia' },
  { name: 'Kuala Lumpur', country: 'Malaysia' },
  { name: 'Penang', country: 'Malaysia' },
  { name: 'Hanoi', country: 'Vietnam' },
  { name: 'Ho Chi Minh City', country: 'Vietnam' },
  { name: 'Da Nang', country: 'Vietnam' },
  { name: 'Hoi An', country: 'Vietnam' },
  { name: 'Siem Reap (Angkor)', country: 'Cambodia' },

  // Europe
  { name: 'Paris', country: 'France' },
  { name: 'Nice', country: 'France' },
  { name: 'Lyon', country: 'France' },
  { name: 'Rome', country: 'Italy' },
  { name: 'Florence', country: 'Italy' },
  { name: 'Venice', country: 'Italy' },
  { name: 'Milan', country: 'Italy' },
  { name: 'Amalfi Coast', country: 'Italy' },
  { name: 'Barcelona', country: 'Spain' },
  { name: 'Madrid', country: 'Spain' },
  { name: 'Seville', country: 'Spain' },
  { name: 'London', country: 'United Kingdom' },
  { name: 'Edinburgh', country: 'United Kingdom' },
  { name: 'Amsterdam', country: 'Netherlands' },
  { name: 'Berlin', country: 'Germany' },
  { name: 'Munich', country: 'Germany' },
  { name: 'Frankfurt', country: 'Germany' },
  { name: 'Vienna', country: 'Austria' },
  { name: 'Salzburg', country: 'Austria' },
  { name: 'Zurich', country: 'Switzerland' },
  { name: 'Geneva', country: 'Switzerland' },
  { name: 'Lucerne', country: 'Switzerland' },
  { name: 'Interlaken', country: 'Switzerland' },
  { name: 'Prague', country: 'Czech Republic' },
  { name: 'Budapest', country: 'Hungary' },
  { name: 'Athens', country: 'Greece' },
  { name: 'Santorini', country: 'Greece' },
  { name: 'Mykonos', country: 'Greece' },
  { name: 'Lisbon', country: 'Portugal' },
  { name: 'Porto', country: 'Portugal' },
  { name: 'Dublin', country: 'Ireland' },
  { name: 'Copenhagen', country: 'Denmark' },
  { name: 'Stockholm', country: 'Sweden' },
  { name: 'Oslo', country: 'Norway' },
  { name: 'Reykjavik', country: 'Iceland' },
  { name: 'Dubrovnik', country: 'Croatia' },

  // Americas
  { name: 'New York City', country: 'United States' },
  { name: 'Los Angeles', country: 'United States' },
  { name: 'San Francisco', country: 'United States' },
  { name: 'Las Vegas', country: 'United States' },
  { name: 'Miami', country: 'United States' },
  { name: 'Chicago', country: 'United States' },
  { name: 'Honolulu (Hawaii)', country: 'United States' },
  { name: 'Vancouver', country: 'Canada' },
  { name: 'Toronto', country: 'Canada' },
  { name: 'Montreal', country: 'Canada' },
  { name: 'Banff', country: 'Canada' },
  { name: 'Cancun', country: 'Mexico' },
  { name: 'Mexico City', country: 'Mexico' },
  { name: 'Rio de Janeiro', country: 'Brazil' },
  { name: 'Buenos Aires', country: 'Argentina' },
  { name: 'Cusco (Machu Picchu)', country: 'Peru' },

  // Oceania
  { name: 'Sydney', country: 'Australia' },
  { name: 'Melbourne', country: 'Australia' },
  { name: 'Brisbane', country: 'Australia' },
  { name: 'Auckland', country: 'New Zealand' },
  { name: 'Queenstown', country: 'New Zealand' },
  { name: 'Fiji', country: 'Fiji' },

  // Middle East & Africa
  { name: 'Dubai', country: 'United Arab Emirates' },
  { name: 'Abu Dhabi', country: 'United Arab Emirates' },
  { name: 'Doha', country: 'Qatar' },
  { name: 'Istanbul', country: 'Turkey' },
  { name: 'Cappadocia', country: 'Turkey' },
  { name: 'Cairo', country: 'Egypt' },
  { name: 'Marrakech', country: 'Morocco' },
  { name: 'Cape Town', country: 'South Africa' },
];

/**
 * Searches for matching destinations based on user input.
 */
export function searchDestinations(query: string, maxResults = 8): DestinationPlace[] {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();

  return POPULAR_PLACES.filter(
    (place) =>
      place.name.toLowerCase().includes(q) || place.country.toLowerCase().includes(q),
  ).slice(0, maxResults);
}

/**
 * Intelligently returns curated auto-fill recommendation for a destination.
 */
export function getAutoFillRecommendations(
  destinationName: string,
  countryHint?: string,
): AutoFillRecommendation {
  const cleanName = destinationName.trim();
  const lowerName = cleanName.toLowerCase();
  const coords = getCoordinatesForName(cleanName);

  // 1. Direct city match
  for (const [key, rec] of Object.entries(CITY_RECOMMENDATIONS)) {
    if (lowerName === key || lowerName.includes(key) || key.includes(lowerName)) {
      return {
        name: cleanName,
        country: rec.country || countryHint,
        nights: rec.nights,
        accommodation: rec.accommodation,
        activities: rec.activities,
        transportation: rec.transportation,
        latitude: coords ? coords[1] : undefined,
        longitude: coords ? coords[0] : undefined,
      };
    }
  }

  // 2. Keyword-based heuristics
  if (
    lowerName.includes('beach') ||
    lowerName.includes('island') ||
    lowerName.includes('coast') ||
    lowerName.includes('cove') ||
    lowerName.includes('sea') ||
    lowerName.includes('resort')
  ) {
    return {
      name: cleanName,
      country: countryHint,
      nights: 3,
      accommodation: 'Resort & Spa',
      activities: 'Beach, Island Hopping & Water Sports',
      transportation: 'Ferry / Passenger Boat',
      latitude: coords ? coords[1] : undefined,
      longitude: coords ? coords[0] : undefined,
    };
  }

  if (
    lowerName.includes('mountain') ||
    lowerName.includes('hill') ||
    lowerName.includes('peak') ||
    lowerName.includes('alps') ||
    lowerName.includes('trek') ||
    lowerName.includes('forest')
  ) {
    return {
      name: cleanName,
      country: countryHint,
      nights: 3,
      accommodation: 'Eco Lodge / Glamping',
      activities: 'Mountain Hiking & Nature Trekking',
      transportation: 'Rental Car / Road Trip',
      latitude: coords ? coords[1] : undefined,
      longitude: coords ? coords[0] : undefined,
    };
  }

  // 3. General default recommendation
  return {
    name: cleanName,
    country: countryHint,
    nights: 3,
    accommodation: 'Boutique Hotel',
    activities: 'Sightseeing & Iconic Landmarks',
    transportation: 'Express Train / Intercity Rail',
    latitude: coords ? coords[1] : undefined,
    longitude: coords ? coords[0] : undefined,
  };
}
