import { useState, useEffect } from 'react';
import {
  X,
  Compass,
  Landmark,
  Languages,
  Coins,
  Users,
  Globe2,
  Sparkles,
  Crown,
  Backpack,
  ArrowRight,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import type { ExplorePlace } from '../services/exploreService';
import type { CountryProfile } from '../types/destination';
import { countryProfilesApi } from '../services/api';
import {
  SUPPORTED_CURRENCIES,
  fetchExchangeRates,
  convert,
  formatCurrency,
} from '../lib/currency';

interface DestinationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: ExplorePlace | null;
  onStartTrip?: (placeName: string) => void;
}

// Curated comprehensive fallback profiles for instant display across the globe
const CURATED_COUNTRY_PROFILES: Record<string, Partial<CountryProfile>> = {
  Philippines: {
    country_name: 'Philippines',
    continent: 'Asia',
    capital: 'Manila',
    language: 'Filipino, English',
    currency: 'PHP',
    population: 115000000,
    description:
      'Archipelago of over 7,000 tropical islands renowned for powdery white-sand shores, emerald limestone lagoons, world-class diving reefs, and warm Filipino hospitality.',
    best_destinations: [
      'Boracay White Beach',
      'El Nido, Palawan',
      'Coron Twin Lagoons',
      'Siargao Cloud 9',
      'Batanes Rolling Hills',
      'Cebu & Bohol Chocolate Hills',
    ],
    budget_daily_cost: 1800,
    midrange_daily_cost: 4500,
    luxury_daily_cost: 14000,
    image_url:
      'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80',
  },
  Japan: {
    country_name: 'Japan',
    continent: 'Asia',
    capital: 'Tokyo',
    language: 'Japanese',
    currency: 'JPY',
    population: 125000000,
    description:
      'A seamless convergence of neon-lit futuristic metropolises and timeless Shinto shrines, tranquil bamboo groves, bullet trains, and revered culinary perfection.',
    best_destinations: [
      'Kyoto Fushimi Inari & Gion',
      'Tokyo Shibuya & Akihabara',
      'Mount Fuji & Lake Kawaguchi',
      'Osaka Dotonbori',
      'Hokkaido Niseko Snow Fields',
    ],
    budget_daily_cost: 3500,
    midrange_daily_cost: 8500,
    luxury_daily_cost: 25000,
    image_url:
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
  },
  France: {
    country_name: 'France',
    continent: 'Europe',
    capital: 'Paris',
    language: 'French',
    currency: 'EUR',
    population: 67800000,
    description:
      'The world epicenter of haute cuisine, high fashion, legendary art galleries, fairytale Loire castles, and the sun-soaked Mediterranean French Riviera.',
    best_destinations: [
      'Paris & the Louvre',
      'Nice & the French Riviera',
      'Mont Saint-Michel',
      'Provence Lavender Valleys',
      'Chamonix & Mont Blanc',
    ],
    budget_daily_cost: 4200,
    midrange_daily_cost: 9800,
    luxury_daily_cost: 28000,
    image_url:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
  },
  Italy: {
    country_name: 'Italy',
    continent: 'Europe',
    capital: 'Rome',
    language: 'Italian',
    currency: 'EUR',
    population: 59000000,
    description:
      'An open-air museum overflowing with UNESCO World Heritage treasures, dramatic pastel cliffside villages, romantic Venetian canals, and generational culinary craft.',
    best_destinations: [
      'Rome Colosseum & Vatican',
      'Florence Renaissance Heart',
      'Amalfi Coast & Positano',
      'Venice Grand Canal',
      'Cinque Terre Coastal Trails',
    ],
    budget_daily_cost: 4000,
    midrange_daily_cost: 9200,
    luxury_daily_cost: 26000,
    image_url:
      'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80',
  },
  'United States': {
    country_name: 'United States',
    continent: 'Americas',
    capital: 'Washington, D.C.',
    language: 'English',
    currency: 'USD',
    population: 335000000,
    description:
      'An immense country of stark geological contrasts — from majestic national park canyons and redwood forests to iconic glittering skylines and coastal highways.',
    best_destinations: [
      'New York City Skyline',
      'Grand Canyon National Park',
      'Maui & Kauai, Hawaii',
      'California Pacific Coast Highway',
      'Yellowstone Geysers',
    ],
    budget_daily_cost: 4800,
    midrange_daily_cost: 11000,
    luxury_daily_cost: 32000,
    image_url:
      'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?auto=format&fit=crop&w=1200&q=80',
  },
  Iceland: {
    country_name: 'Iceland',
    continent: 'Europe',
    capital: 'Reykjavik',
    language: 'Icelandic, English',
    currency: 'ISK',
    population: 376000,
    description:
      'The land of fire and ice where roaring waterfalls, glacial lagoons, erupting geysers, and ethereal northern lights dance across volcanic black-sand landscapes.',
    best_destinations: [
      'Blue Lagoon Geothermal Spa',
      'Golden Circle & Gullfoss',
      'Jökulsárlón Glacier Lagoon',
      'Reynisfjara Black Sand Beach',
      'Vatnajökull Ice Caves',
    ],
    budget_daily_cost: 5000,
    midrange_daily_cost: 12000,
    luxury_daily_cost: 30000,
    image_url:
      'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=1200&q=80',
  },
  Indonesia: {
    country_name: 'Indonesia',
    continent: 'Asia',
    capital: 'Jakarta',
    language: 'Indonesian',
    currency: 'IDR',
    population: 275000000,
    description:
      'A sprawling archipelago boasting lush terraced rice paddies, spiritual Hindu temples, active volcanic peaks, Komodo dragons, and tropical surf breaks.',
    best_destinations: [
      'Ubud & Bali Cultural Heart',
      'Komodo National Park',
      'Raja Ampat Coral Archipelago',
      'Mount Bromo Sunrise',
      'Gili Islands',
    ],
    budget_daily_cost: 1700,
    midrange_daily_cost: 4200,
    luxury_daily_cost: 13500,
    image_url:
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
  },
  Thailand: {
    country_name: 'Thailand',
    continent: 'Asia',
    capital: 'Bangkok',
    language: 'Thai',
    currency: 'THB',
    population: 71000000,
    description:
      'The Land of Smiles offering vibrant neon night markets, ornate Buddhist gilded temples, tropical karst limestone islands, and world-renowned street cuisine.',
    best_destinations: [
      'Bangkok Grand Palace & Markets',
      'Chiang Mai Old City',
      'Phuket & Phi Phi Islands',
      'Krabi Railay Beach',
      'Koh Samui Coconut Coast',
    ],
    budget_daily_cost: 1800,
    midrange_daily_cost: 4400,
    luxury_daily_cost: 13000,
    image_url:
      'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=80',
  },
  Australia: {
    country_name: 'Australia',
    continent: 'Oceania',
    capital: 'Canberra',
    language: 'English',
    currency: 'AUD',
    population: 26000000,
    description:
      'A sun-drenched sunburnt continent with kaleidoscopic coral reefs, golden surf beaches, vibrant cosmopolitan cities, and the sacred red expanse of the Outback.',
    best_destinations: [
      'Sydney Opera House & Harbour',
      'Great Barrier Reef',
      'Melbourne Laneways & Arts',
      'Uluru-Kata Tjuta National Park',
      'Whitsundays Whitehaven Beach',
    ],
    budget_daily_cost: 4500,
    midrange_daily_cost: 10500,
    luxury_daily_cost: 29000,
    image_url:
      'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?auto=format&fit=crop&w=1200&q=80',
  },
  Spain: {
    country_name: 'Spain',
    continent: 'Europe',
    capital: 'Madrid',
    language: 'Spanish',
    currency: 'EUR',
    population: 47500000,
    description:
      'A passionate nation celebrated for Gaudí architecture, flamenco rhythms, sun-kissed Mediterranean beaches, and lively evening tapas culture.',
    best_destinations: [
      'Barcelona Sagrada Família & Park Güell',
      'Madrid Prado & Royal Palace',
      'Seville & Andalusia',
      'Ibiza & Balearic Islands',
      'Granada Alhambra',
    ],
    budget_daily_cost: 3800,
    midrange_daily_cost: 8800,
    luxury_daily_cost: 24000,
    image_url:
      'https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80',
  },
};

export default function DestinationDetailModal({
  isOpen,
  onClose,
  place,
  onStartTrip,
}: DestinationDetailModalProps) {
  const [profile, setProfile] = useState<CountryProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('PHP');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ PHP: 1 });
  const [isRatesLoading, setIsRatesLoading] = useState(false);

  // Determine target country key
  const countryName = place?.country || place?.name || 'Philippines';

  // Load exchange rates via Frankfurter API
  useEffect(() => {
    let isMounted = true;
    const loadRates = async () => {
      setIsRatesLoading(true);
      try {
        const result = await fetchExchangeRates('PHP');
        if (isMounted && result?.rates) {
          setExchangeRates(result.rates);
        }
      } catch (err) {
        console.warn('Exchange rates loading failed:', err);
      } finally {
        if (isMounted) setIsRatesLoading(false);
      }
    };
    loadRates();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch or generate country profile
  useEffect(() => {
    if (!isOpen || !place) return;

    let isMounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        // 1. Check real backend database
        const apiData = await countryProfilesApi.getByName(countryName);
        if (isMounted && apiData) {
          setProfile(apiData);
          setLoading(false);
          return;
        }
      } catch {
        // Fall back gracefully
      }

      // 2. Fall back to curated rich profile
      const curated = CURATED_COUNTRY_PROFILES[countryName];
      if (curated) {
        if (isMounted) {
          setProfile({
            id: curated.id || `curated-${countryName.toLowerCase()}`,
            country_name: curated.country_name || countryName,
            continent: curated.continent || place.region || 'World',
            capital: curated.capital || 'Capital City',
            language: curated.language || 'Official Language',
            currency: curated.currency || 'Local Currency',
            population: curated.population || (place.population ?? 10000000),
            description:
              curated.description ||
              place.description ||
              'Stunning destination with scenic attractions and cultural depth.',
            best_destinations: curated.best_destinations || [
              place.name,
              `${countryName} Coast`,
              `${countryName} Highlands`,
            ],
            budget_daily_cost: curated.budget_daily_cost || 2500,
            midrange_daily_cost: curated.midrange_daily_cost || 6000,
            luxury_daily_cost: curated.luxury_daily_cost || 18000,
            image_url: curated.image_url || place.imageUrl,
          });
          setLoading(false);
        }
        return;
      }

      // 3. Dynamic generic fallback for any unknown country/island
      if (isMounted) {
        setProfile({
          id: `dyn-${place.id}`,
          country_name: countryName,
          continent: place.region || 'World',
          capital: `${place.name} City`,
          language: 'Local & English',
          currency: 'PHP',
          population: place.population || 5000000,
          description:
            place.description ||
            `Discover the breathtaking beauty and rich travel experiences of ${countryName}. A premier destination offering remarkable scenic views, hospitable communities, and memorable activities.`,
          best_destinations: [
            place.name,
            `${countryName} Central`,
            `${countryName} Coast`,
            `${countryName} Highlands`,
          ],
          budget_daily_cost: 2200,
          midrange_daily_cost: 5500,
          luxury_daily_cost: 16000,
          image_url: place.imageUrl,
        });
        setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [isOpen, place, countryName]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !place) return null;

  // Convert cost from PHP baseline to chosen currency
  const getConvertedCost = (costInPhp: number): string => {
    const converted = convert(costInPhp, 'PHP', selectedCurrency, exchangeRates);
    return formatCurrency(converted, selectedCurrency);
  };

  const handleStartTripClick = () => {
    onClose();
    if (onStartTrip) {
      onStartTrip(profile?.country_name || place.country || place.name);
    }
  };

  return (
    <div
      className="modal-overlay destination-detail-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dest-detail-title"
    >
      <button
        type="button"
        className="modal-backdrop-dismiss"
        aria-label="Close modal backdrop"
        onClick={onClose}
      />

      <div className="destination-detail-modal-container animate-fade-in-up">
        {/* Hero Header with Image */}
        <div className="destination-detail-hero">
          <div
            className="destination-detail-hero-img"
            style={{
              backgroundImage: `url(${profile?.image_url || place.imageUrl})`,
            }}
          />
          <div className="destination-detail-hero-gradient" />

          {/* Close button */}
          <button
            type="button"
            className="destination-detail-close-btn"
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={18} />
          </button>

          {/* Title and Badges */}
          <div className="destination-detail-hero-info">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {place.flag && (
                <img
                  src={place.flag}
                  alt=""
                  className="w-6 h-4 object-cover rounded-xs shadow-xs"
                />
              )}
              <span className="destination-badge-continent">
                <Globe2 size={12} />
                {profile?.continent || place.region}
              </span>
              <span className="destination-badge-category">
                {place.category === 'island' ? '🏝️ Island' : '🌍 Country'}
              </span>
            </div>
            <h2 id="dest-detail-title" className="destination-detail-title">
              {profile?.country_name || place.name}
            </h2>
            {place.country && place.country !== place.name && (
              <p className="text-white/80 text-xs font-medium flex items-center gap-1 mt-0.5">
                <MapPin size={12} className="text-amber-400" />
                <span>{place.country}</span>
              </p>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="destination-detail-body no-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
              <Compass className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-sm">Loading destination insights...</span>
            </div>
          ) : (
            <>
              {/* 1. Overview Description */}
              <section className="destination-detail-section">
                <h3 className="destination-section-heading">Overview</h3>
                <p className="destination-overview-text">
                  {profile?.description || place.description}
                </p>
              </section>

              {/* 2. Quick Facts Grid (5 Facts) */}
              <section className="destination-detail-section">
                <h3 className="destination-section-heading">Quick Facts</h3>
                <div className="destination-facts-grid">
                  <div className="destination-fact-card">
                    <div className="destination-fact-icon bg-amber-50 text-amber-600">
                      <Landmark size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="destination-fact-label">Capital</span>
                      <p className="destination-fact-value truncate">
                        {profile?.capital || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="destination-fact-card">
                    <div className="destination-fact-icon bg-blue-50 text-blue-600">
                      <Languages size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="destination-fact-label">Language</span>
                      <p className="destination-fact-value truncate">
                        {profile?.language || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="destination-fact-card">
                    <div className="destination-fact-icon bg-emerald-50 text-emerald-600">
                      <Coins size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="destination-fact-label">Currency</span>
                      <p className="destination-fact-value truncate">
                        {profile?.currency || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="destination-fact-card">
                    <div className="destination-fact-icon bg-purple-50 text-purple-600">
                      <Users size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="destination-fact-label">Population</span>
                      <p className="destination-fact-value truncate">
                        {profile?.population
                          ? Number(profile.population).toLocaleString('en-US')
                          : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="destination-fact-card col-span-2 sm:col-span-1">
                    <div className="destination-fact-icon bg-rose-50 text-rose-600">
                      <Globe2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="destination-fact-label">Continent</span>
                      <p className="destination-fact-value truncate">
                        {profile?.continent || place.region}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. Top Destination Recommendations */}
              {profile?.best_destinations && profile.best_destinations.length > 0 && (
                <section className="destination-detail-section">
                  <h3 className="destination-section-heading">Top Recommendations</h3>
                  <div className="destination-recommendations-list">
                    {profile.best_destinations.map((destName, i) => (
                      <div key={i} className="destination-recommendation-pill">
                        <MapPin size={14} className="text-amber-500 shrink-0" />
                        <span>{destName}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 4. Tiered Daily Cost Estimates with Frankfurter Live Converter */}
              <section className="destination-detail-section">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="destination-section-heading mb-0">
                      Estimated Daily Travel Costs
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      ECB reference rates via Frankfurter API
                    </p>
                  </div>

                  {/* Currency Picker */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <span className="text-xs text-stone-500 font-medium">Currency:</span>
                    <select
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value)}
                      className="destination-currency-select"
                      disabled={isRatesLoading}
                      aria-label="Select currency"
                    >
                      {SUPPORTED_CURRENCIES.map((curr) => (
                        <option key={curr.code} value={curr.code}>
                          {curr.code} ({curr.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="destination-costs-grid">
                  {/* Budget Tier */}
                  <div className="destination-cost-card budget-tier">
                    <div className="flex items-center justify-between mb-2">
                      <span className="destination-cost-tier-name">Budget</span>
                      <div className="destination-cost-icon-wrap bg-emerald-100 text-emerald-700">
                        <Backpack size={16} />
                      </div>
                    </div>
                    <div className="destination-cost-amount">
                      {getConvertedCost(profile?.budget_daily_cost || 1800)}
                    </div>
                    <span className="destination-cost-subtext">per traveler / day</span>
                    <ul className="destination-cost-perks">
                      <li>• Hostels or budget guesthouses</li>
                      <li>• Local street food & casual eateries</li>
                      <li>• Public transit & walking tours</li>
                    </ul>
                  </div>

                  {/* Mid-Range Tier */}
                  <div className="destination-cost-card midrange-tier">
                    <div className="destination-cost-popular-badge">
                      <TrendingUp size={11} />
                      <span>Most Popular</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="destination-cost-tier-name text-amber-900">
                        Mid-Range
                      </span>
                      <div className="destination-cost-icon-wrap bg-amber-200 text-amber-800">
                        <Sparkles size={16} />
                      </div>
                    </div>
                    <div className="destination-cost-amount text-amber-950">
                      {getConvertedCost(profile?.midrange_daily_cost || 4500)}
                    </div>
                    <span className="destination-cost-subtext">per traveler / day</span>
                    <ul className="destination-cost-perks">
                      <li>• 3-4 star boutique hotels</li>
                      <li>• Sit-down dining & local cafes</li>
                      <li>• Guided day excursions & ride-hails</li>
                    </ul>
                  </div>

                  {/* Luxury Tier */}
                  <div className="destination-cost-card luxury-tier">
                    <div className="flex items-center justify-between mb-2">
                      <span className="destination-cost-tier-name">Luxury</span>
                      <div className="destination-cost-icon-wrap bg-purple-100 text-purple-700">
                        <Crown size={16} />
                      </div>
                    </div>
                    <div className="destination-cost-amount">
                      {getConvertedCost(profile?.luxury_daily_cost || 14000)}
                    </div>
                    <span className="destination-cost-subtext">per traveler / day</span>
                    <ul className="destination-cost-perks">
                      <li>• 5-star beachfront resorts</li>
                      <li>• Fine dining & private chefs</li>
                      <li>• Private chauffeurs & VIP access</li>
                    </ul>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Modal Footer with "Start Trip Here" Button */}
        <div className="destination-detail-footer">
          <button
            type="button"
            onClick={onClose}
            className="destination-detail-btn-cancel"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleStartTripClick}
            className="destination-detail-btn-start"
          >
            <span>Start Trip Here</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
