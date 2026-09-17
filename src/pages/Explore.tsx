import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobeMap from '../components/GlobeMap';
import magnifierIcon from '../assets/magnifier.png';
import { Star, Globe, X } from 'lucide-react';
import { tripsApi } from '../services/api';
import {
  fetchExploreCountries,
  TOP_ISLANDS,
  getMostPopularDestination,
  type ExplorePlace,
} from '../services/exploreService';

const COMPANIONS = [
  {
    type: 'Solo',
    title: 'Solo\nRetreat',
    bg: 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=400&q=80',
  },
  {
    type: 'Couple',
    title: 'Couple\nRetreat',
    bg: 'https://images.unsplash.com/photo-1510414842594-a61752d3857d?auto=format&fit=crop&w=400&q=80',
  },
  {
    type: 'Friends',
    title: 'Friend\nGetaway',
    bg: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=400&q=80',
  },
  {
    type: 'Family',
    title: 'Family\nVacation',
    bg: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=400&q=80',
  },
];

export default function Explore() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [countries, setCountries] = useState<ExplorePlace[]>([]);
  const [islands] = useState<ExplorePlace[]>(TOP_ISLANDS);
  const [popularPlace, setPopularPlace] = useState<ExplorePlace | null>(null);
  const [activeRegion, setActiveRegion] = useState('All');
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStartTripOpen, setIsStartTripOpen] = useState(false);

  // Mobile layout states
  const [mobileCategory, setMobileCategory] = useState('Most Popular');
  const [showMobileGlobe, setShowMobileGlobe] = useState(false);

  // Modal form states
  const [tripName, setTripName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelType, setTravelType] = useState('Solo');
  const [submitting, setSubmitting] = useState(false);

  const countryScrollRef = useRef<HTMLDivElement>(null);
  const islandScrollRef = useRef<HTMLDivElement>(null);

  // Load live dynamic destination datasets
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const loadedCountries = await fetchExploreCountries();
        if (!isMounted) return;

        setCountries(loadedCountries);
        const featured = getMostPopularDestination(loadedCountries);
        setPopularPlace(featured);
        setSelectedLocation(featured.name);
        setActiveMarkerId(featured.id);
      } catch (err) {
        console.error('Error loading explore destinations:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const scrollContainer = (
    ref: React.RefObject<HTMLDivElement | null>,
    offset: number,
  ) => {
    if (ref.current) {
      ref.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Filter countries by active region & search query
  const filteredCountries = useMemo(() => {
    return countries.filter((c) => {
      const matchesRegion = activeRegion === 'All' || c.region === activeRegion;
      const matchesSearch =
        !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.region.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRegion && matchesSearch;
    });
  }, [countries, activeRegion, searchQuery]);

  // Filter islands by search query
  const filteredIslands = useMemo(() => {
    return islands.filter((island) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        island.name.toLowerCase().includes(q) ||
        (island.country && island.country.toLowerCase().includes(q)) ||
        (island.tag && island.tag.toLowerCase().includes(q))
      );
    });
  }, [islands, searchQuery]);

  // Mapbox 3D Globe markers (combines popular, islands, and top region countries)
  const globeMarkers = useMemo(() => {
    const list: ExplorePlace[] = [];
    if (popularPlace) list.push(popularPlace);
    list.push(...islands);
    list.push(...filteredCountries.slice(0, 30));

    // Deduplicate by ID
    const seen = new Set<string>();
    return list
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .map((d) => ({
        id: d.id,
        lng: d.longitude,
        lat: d.latitude,
        title: d.name,
      }));
  }, [popularPlace, islands, filteredCountries]);

  const handleSelectPlace = (place: ExplorePlace, openModal = false) => {
    setActiveMarkerId(place.id);
    setSelectedLocation(place.name);
    setTripName(`Trip to ${place.name}`);

    if (openModal) {
      setIsStartTripOpen(true);
    }
  };

  const handleStartPlanning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripName.trim() || !startDate || !endDate) return;

    setSubmitting(true);
    try {
      const newTrip = await tripsApi.createTrip({
        title: tripName,
        start_date: startDate,
        end_date: endDate,
        total_budget: 15000,
        status: 'planning',
      });
      setIsStartTripOpen(false);
      navigate(`/trip/${newTrip.id}`);
    } catch (err) {
      console.error('Failed to create trip:', err);
      setIsStartTripOpen(false);
      navigate('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  // Curated ratings mapping matching Figma aesthetics
  const getPlaceRating = (id: string): string => {
    const ratings: Record<string, string> = {
      'island-palawan': '4.9',
      'island-batanes': '4.8',
      'island-siargao': '4.7',
      'island-boracay': '4.9',
      'island-coron': '4.8',
      'island-cebu': '4.6',
      'island-bali': '4.8',
      'island-santorini': '4.9',
    };
    return ratings[id] || '4.7';
  };

  // Filtered destinations for mobile 2-column grid
  const mobileDestinations = useMemo(() => {
    const allPlaces = [...TOP_ISLANDS, ...countries.slice(0, 20)];
    return allPlaces.filter((place) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        place.name.toLowerCase().includes(q) ||
        (place.country && place.country.toLowerCase().includes(q)) ||
        (place.tag && place.tag.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (mobileCategory === 'All') return true;
      if (mobileCategory === 'Most Popular') {
        return (
          [
            'island-palawan',
            'island-batanes',
            'island-siargao',
            'island-boracay',
            'island-coron',
          ].includes(place.id) || place.category === 'popular'
        );
      }
      if (mobileCategory === 'Beaches') {
        return (
          (place.tag &&
            (place.tag.includes('Beach') ||
              place.tag.includes('Surfing') ||
              place.tag.includes('Lagoons'))) ||
          place.name.includes('Island') ||
          place.name.includes('Beach')
        );
      }
      if (mobileCategory === 'Hidden Gems') {
        return ['island-batanes', 'island-coron', 'island-cebu'].includes(place.id);
      }
      if (mobileCategory === 'Mountains') {
        return (
          place.region === 'Americas' ||
          place.region === 'Europe' ||
          place.id === 'island-batanes' ||
          (place.tag && place.tag.includes('Hills'))
        );
      }
      return true;
    });
  }, [searchQuery, mobileCategory, countries]);

  return (
    <div className="explore-page-wrapper">
      {/* Desktop Layout (≥1025px) */}
      <div className="explore-desktop-content">
        <div className="explore-container-card">
          <div className="explore-scroll-pane">
            <div className="explore-header-group">
              <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
                Where to next?
              </h1>
              <p className="text-xs text-stone-500 mt-1">
                Explore trending islands, world destinations, and plan your next itinerary
                in 3D.
              </p>
            </div>

            {/* Search Box with Real-Time Filtering */}
            <div className="explore-search-input-box">
              <img src={magnifierIcon} alt="" className="w-5 h-5 opacity-50" />
              <input
                type="text"
                className="w-full bg-transparent outline-none text-sm font-medium text-stone-800 placeholder-stone-400"
                placeholder="Search destinations, islands, or countries..."
                value={searchQuery}
                aria-label="Search destinations"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-stone-400 hover:text-stone-600 text-xs px-2"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Most Popular Feature Card (Dynamic Hero) */}
            {popularPlace && (
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <h2 className="text-lg font-bold text-stone-900">Most Popular</h2>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
                    ★ Featured Destination
                  </span>
                </div>
                <div
                  className="explore-popular-card"
                  style={{
                    backgroundImage: `url(${popularPlace.imageUrl})`,
                  }}
                  onClick={() => handleSelectPlace(popularPlace, false)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSelectPlace(popularPlace, false);
                  }}
                >
                  <div className="explore-popular-card-content">
                    <div className="explore-popular-badge">
                      <span>{popularPlace.tag || 'Trending Now'}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">
                      {popularPlace.name}
                    </h3>
                    <p className="text-xs text-stone-200 line-clamp-2 max-w-lg drop-shadow">
                      {popularPlace.description}
                    </p>
                    <div className="flex gap-2.5 mt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPlace(popularPlace, true);
                        }}
                        className="btn-popular-plan"
                      >
                        Plan Trip Here
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPlace(popularPlace, false);
                        }}
                        className="btn-popular-globe"
                      >
                        View on Globe ↗
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Companion Selector Grid */}
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Choose Your Companion, Find Your Destination
              </h2>
              <p className="text-xs text-stone-400 mb-3">
                Wherever you're going and whoever's coming along, find the ideal retreat
                for your next trip.
              </p>
              <div className="companion-grid">
                {COMPANIONS.map((item) => (
                  <button
                    type="button"
                    key={item.type}
                    onClick={() => {
                      setTravelType(item.type);
                      setIsStartTripOpen(true);
                    }}
                    className="companion-btn-card text-left"
                    style={{ backgroundImage: `url(${item.bg})` }}
                  >
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* All Countries Carousel (REST Countries API live data) */}
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="text-base font-bold text-stone-900">All Countries</h2>
                <span className="text-xs text-stone-400">
                  {filteredCountries.length}{' '}
                  {filteredCountries.length === 1 ? 'country' : 'countries'}
                </span>
              </div>
              <p className="text-xs text-stone-400 mb-3">
                Explore places across every continent with live geographic coordinates.
              </p>

              {/* Region Filter Chips */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {['All', 'Europe', 'Asia', 'Americas', 'Africa', 'Oceania'].map(
                  (region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => setActiveRegion(region)}
                      className={`region-chip-btn ${activeRegion === region ? 'active' : ''}`}
                    >
                      <span>{region}</span>
                    </button>
                  ),
                )}
              </div>

              {/* Carousel Content */}
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => scrollContainer(countryScrollRef, -240)}
                  className="carousel-arrow-btn"
                  aria-label="Scroll countries left"
                >
                  ‹
                </button>
                <div
                  ref={countryScrollRef}
                  className="flex gap-4 overflow-x-auto py-2 no-scrollbar scroll-smooth flex-1"
                >
                  {loading && countries.length === 0 ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={`skel-${i}`} className="carousel-card animate-pulse">
                        <div className="carousel-thumb bg-stone-200" />
                        <div className="w-16 h-3 bg-stone-200 rounded mt-1" />
                      </div>
                    ))
                  ) : filteredCountries.length === 0 ? (
                    <div className="py-8 text-center text-xs text-stone-500 w-full">
                      No destinations match your search in {activeRegion}.
                    </div>
                  ) : (
                    filteredCountries.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className="carousel-card text-left group"
                        onClick={() => handleSelectPlace(item, true)}
                        title={`Click to plan a trip to ${item.name}`}
                      >
                        <div
                          className="carousel-thumb"
                          style={{ backgroundImage: `url(${item.imageUrl})` }}
                        >
                          {item.flag && (
                            <img
                              src={item.flag}
                              alt=""
                              className="carousel-flag-badge"
                              loading="lazy"
                            />
                          )}
                        </div>
                        <span className="carousel-label group-hover:text-amber-700 transition-colors">
                          {item.name}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                <button
                  onClick={() => scrollContainer(countryScrollRef, 240)}
                  className="carousel-arrow-btn"
                  aria-label="Scroll countries right"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Top Islands to Explore Carousel */}
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="text-base font-bold text-stone-900">
                  Top Islands to Explore
                </h2>
                <span className="text-xs text-stone-400">
                  {filteredIslands.length} iconic islands
                </span>
              </div>
              <p className="text-xs text-stone-400 mb-3">
                Discover breathtaking archipelagos, lagoons, and white-sand escapes.
              </p>

              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => scrollContainer(islandScrollRef, -240)}
                  className="carousel-arrow-btn"
                  aria-label="Scroll islands left"
                >
                  ‹
                </button>
                <div
                  ref={islandScrollRef}
                  className="flex gap-4 overflow-x-auto py-2 no-scrollbar scroll-smooth flex-1"
                >
                  {filteredIslands.map((island) => (
                    <button
                      type="button"
                      key={`island-${island.id}`}
                      className="carousel-card text-left group"
                      onClick={() => handleSelectPlace(island, true)}
                      title={`Click to plan a trip to ${island.name}`}
                    >
                      <div
                        className="carousel-thumb"
                        style={{ backgroundImage: `url(${island.imageUrl})` }}
                      >
                        {island.tag && (
                          <span className="carousel-tag-badge">{island.tag}</span>
                        )}
                      </div>
                      <span className="carousel-label group-hover:text-amber-700 transition-colors">
                        {island.name}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => scrollContainer(islandScrollRef, 240)}
                  className="carousel-arrow-btn"
                  aria-label="Scroll islands right"
                >
                  ›
                </button>
              </div>
            </div>

            {/* CTA Banner */}
            <div className="explore-cta-banner">
              <p className="explore-cta-text">
                Start a new adventure and LakBye will handle your itineraries, stays, and
                budget all in one place.
              </p>
              <button
                onClick={() => setIsStartTripOpen(true)}
                className="btn-lakbye-gradient"
              >
                <span>+</span>
                <span>Start a Trip</span>
              </button>
            </div>
          </div>

          {/* 3D Mapbox Globe Sticky Panel */}
          <div className="explore-map-sticky-panel">
            <GlobeMap
              markers={globeMarkers}
              activeMarkerId={activeMarkerId}
              onMarkerClick={(id) => {
                const matched =
                  [...islands, ...countries].find((p) => p.id === id) || popularPlace;
                if (matched) {
                  handleSelectPlace(matched, false);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Layout (≤1024px) - Figma Node 23:110 */}
      <div className="explore-mobile-content">
        <div className="explore-mobile-header-section">
          <h1 className="explore-mobile-title">Where to next?</h1>
          <p className="explore-mobile-subtitle">
            Discover your ultimate Philippine getaway
          </p>
        </div>

        {/* Search Input Box */}
        <div className="explore-mobile-search-box">
          <img src={magnifierIcon} alt="Search" className="w-4 h-4 opacity-50" />
          <input
            type="text"
            className="explore-mobile-search-input"
            placeholder="Search destinations, hotels, itineraries..."
            value={searchQuery}
            aria-label="Search destinations"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-stone-400 text-xs px-2"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Pills (Scrollable) */}
        <div className="explore-mobile-categories-strip">
          {['Most Popular', 'Hidden Gems', 'Beaches', 'Mountains', 'All'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setMobileCategory(cat);
                setShowMobileGlobe(false);
              }}
              className={`explore-mobile-cat-pill ${!showMobileGlobe && mobileCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowMobileGlobe((prev) => !prev)}
            className={`explore-mobile-cat-pill globe-toggle ${showMobileGlobe ? 'active' : ''}`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>3D Globe</span>
          </button>
        </div>

        {/* Optional 3D Globe Interactive View on Mobile */}
        {showMobileGlobe && (
          <div className="explore-mobile-globe-card">
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-xs font-bold text-stone-700">
                Interactive 3D Globe
              </span>
              <button
                type="button"
                onClick={() => setShowMobileGlobe(false)}
                className="text-stone-400 hover:text-stone-600 text-xs font-semibold"
              >
                Close ✕
              </button>
            </div>
            <div className="explore-mobile-globe-inner">
              <GlobeMap
                markers={globeMarkers}
                activeMarkerId={activeMarkerId}
                onMarkerClick={(id) => {
                  const matched =
                    [...islands, ...countries].find((p) => p.id === id) || popularPlace;
                  if (matched) {
                    handleSelectPlace(matched, true);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* 2-Column (Mobile) / 3-Column (iPad) Destinations Grid (Figma Frame 23:144) */}
        <div className="explore-mobile-dest-grid">
          {loading && countries.length === 0 ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={`skel-dest-${idx}`} className="explore-dest-card animate-pulse">
                <div className="explore-dest-image bg-stone-200" />
                <div className="p-3">
                  <div className="w-24 h-4 bg-stone-200 rounded mb-2" />
                  <div className="w-16 h-3 bg-stone-200 rounded" />
                </div>
              </div>
            ))
          ) : mobileDestinations.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-stone-500">
              No destinations match "{searchQuery}" in {mobileCategory}.
            </div>
          ) : (
            mobileDestinations.map((place) => (
              <div
                key={place.id}
                className="explore-dest-card"
                onClick={() => handleSelectPlace(place, true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSelectPlace(place, true);
                }}
              >
                <div
                  className="explore-dest-image"
                  style={{ backgroundImage: `url(${place.imageUrl})` }}
                />
                <div className="explore-dest-info">
                  <h3 className="explore-dest-name">{place.name}</h3>
                  <div className="explore-dest-meta">
                    <span className="explore-dest-tag">
                      {place.tag || place.region || 'Island Escape'}
                    </span>
                    <div className="explore-dest-rating">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>{getPlaceRating(place.id)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Start Trip Modal */}
      {isStartTripOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-trip-title"
        >
          <button
            type="button"
            className="modal-backdrop-dismiss"
            aria-label="Close modal"
            onClick={() => setIsStartTripOpen(false)}
          />
          <div className="start-trip-modal-card">
            <button
              type="button"
              onClick={() => setIsStartTripOpen(false)}
              className="modal-close-btn"
              aria-label="Close modal"
            >
              ✕
            </button>
            <h2 id="start-trip-title" className="text-lg font-bold text-stone-900 mb-3">
              Start a Trip
            </h2>

            <form onSubmit={handleStartPlanning} className="flex flex-col gap-5">
              <div>
                <label htmlFor="explore-trip-name" className="modal-label">
                  Trip Name
                </label>
                <input
                  id="explore-trip-name"
                  type="text"
                  required
                  className="modal-input-gradient"
                  placeholder="e.g. Boracay Island Hopping"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="explore-destination-country" className="modal-label">
                  Destination
                </label>
                <div className="relative">
                  <input
                    id="explore-destination-country"
                    type="text"
                    required
                    className="modal-input-gradient"
                    placeholder="Enter destination (e.g. Boracay, Japan, France)"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="explore-start-date" className="modal-label">
                  Travel Dates
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="explore-start-date"
                    type="date"
                    required
                    className="modal-input-gradient flex-1 text-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span className="text-sm font-medium text-stone-900">to</span>
                  <input
                    id="explore-end-date"
                    type="date"
                    required
                    aria-label="End date"
                    className="modal-input-gradient flex-1 text-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <span className="modal-label">Travel Type</span>
                <div className="travel-type-container">
                  {['Solo', 'Couple', 'Friends', 'Family'].map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setTravelType(type)}
                      className={`travel-type-pill ${travelType === type ? 'active' : ''}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center mt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-start-planning-modal"
                >
                  {submitting ? 'Starting...' : 'Start Planning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
