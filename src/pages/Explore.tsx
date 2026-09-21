import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobeMap from '../components/GlobeMap';
import magnifierIcon from '../assets/magnifier.png';
import { Star, Globe, X, Compass, Flame, ArrowUpRight } from 'lucide-react';
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

const CONTINENT_CENTERS: Record<string, [number, number]> = {
  Europe: [15.2551, 54.526],
  Asia: [100.6197, 34.0479],
  Americas: [-75.0, 10.0],
  Africa: [20.0, 8.7832],
  Oceania: [140.0188, -22.7359],
  All: [121.774, 12.8797],
};

export default function Explore() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const [countries, setCountries] = useState<ExplorePlace[]>([]);
  const [islands] = useState<ExplorePlace[]>(TOP_ISLANDS);
  const [popularPlace, setPopularPlace] = useState<ExplorePlace | null>(null);

  const [activeRegion, setActiveRegion] = useState('All');
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStartTripOpen, setIsStartTripOpen] = useState(false);

  const [mobileCategory, setMobileCategory] = useState('Most Popular');
  const [showMobileGlobe, setShowMobileGlobe] = useState(false);

  const [tripName, setTripName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelType, setTravelType] = useState('Solo');
  const [submitting, setSubmitting] = useState(false);

  const countryScrollRef = useRef<HTMLDivElement>(null);
  const islandScrollRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);

  // Debounce search input (~250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to dismiss autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideDesktop = searchContainerRef.current?.contains(target);
      const insideMobile = mobileSearchContainerRef.current?.contains(target);
      if (!insideDesktop && !insideMobile) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Combine all destinations for unified search and autocomplete
  const allDestinations = useMemo(() => {
    const list: ExplorePlace[] = [];
    if (popularPlace) list.push(popularPlace);
    list.push(...islands);
    list.push(...countries);

    const seen = new Set<string>();
    return list.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [popularPlace, islands, countries]);

  // Browse Mode: filtered countries by continent region
  const filteredCountries = useMemo(() => {
    return countries.filter((c) => activeRegion === 'All' || c.region === activeRegion);
  }, [countries, activeRegion]);

  // Search Mode detection
  const isSearchMode = debouncedQuery.trim().length > 0;

  // Search Mode: full matching search results across all datasets
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase().trim();
    return allDestinations.filter((place) => {
      return (
        place.name.toLowerCase().includes(q) ||
        (place.country && place.country.toLowerCase().includes(q)) ||
        (place.region && place.region.toLowerCase().includes(q)) ||
        (place.tag && place.tag.toLowerCase().includes(q)) ||
        (place.description && place.description.toLowerCase().includes(q))
      );
    });
  }, [allDestinations, debouncedQuery]);

  // Live Autocomplete matching suggestions (2+ characters)
  const autocompleteSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return allDestinations
      .filter((d) => {
        return (
          d.name.toLowerCase().includes(q) ||
          (d.country && d.country.toLowerCase().includes(q)) ||
          (d.region && d.region.toLowerCase().includes(q)) ||
          (d.tag && d.tag.toLowerCase().includes(q))
        );
      })
      .slice(0, 8);
  }, [allDestinations, searchQuery]);

  // Trending picks displayed when input is focused but empty (< 2 characters)
  const trendingSearches = useMemo(() => {
    const trendingIds = [
      'island-boracay',
      'island-palawan',
      'island-siargao',
      'island-batanes',
      'island-coron',
      'island-bali',
      'island-santorini',
    ];
    return allDestinations.filter((d) => trendingIds.includes(d.id)).slice(0, 6);
  }, [allDestinations]);

  // Sync Globe Markers: in Search Mode, only matching places show pins!
  const globeMarkers = useMemo(() => {
    const list: ExplorePlace[] = isSearchMode
      ? searchResults
      : [
          ...(popularPlace ? [popularPlace] : []),
          ...islands,
          ...filteredCountries.slice(0, 30),
        ];

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
  }, [isSearchMode, searchResults, popularPlace, islands, filteredCountries]);

  const handleSelectPlace = (place: ExplorePlace, openModal = false) => {
    setActiveMarkerId(place.id);
    setSelectedLocation(place.name);
    setTripName(`Trip to ${place.name}`);

    if (openModal) {
      setIsStartTripOpen(true);
    }
  };

  // Clicking an autocomplete suggestion fills the search bar and triggers full Search Mode
  const handleSelectSuggestion = (place: ExplorePlace) => {
    setSearchQuery(place.name);
    setDebouncedQuery(place.name);
    setIsDropdownOpen(false);
    handleSelectPlace(place, false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const activeList =
      searchQuery.trim().length >= 2 ? autocompleteSuggestions : trendingSearches;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (activeList.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % activeList.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (activeList.length > 0) {
        setHighlightedIndex((prev) => (prev - 1 + activeList.length) % activeList.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && activeList[highlightedIndex]) {
        handleSelectSuggestion(activeList[highlightedIndex]);
      } else if (searchQuery.trim()) {
        setDebouncedQuery(searchQuery);
        setIsDropdownOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
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

  const mobileDestinations = useMemo(() => {
    const allPlaces = [...TOP_ISLANDS, ...countries.slice(0, 20)];
    return allPlaces.filter((place) => {
      const q = debouncedQuery.toLowerCase();
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
  }, [debouncedQuery, mobileCategory, countries]);

  return (
    <div className="explore-page-wrapper">
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

            {/* Desktop Search Bar with Live Autocomplete Dropdown */}
            <div className="explore-search-wrapper" ref={searchContainerRef}>
              <div className="explore-search-input-box">
                <img src={magnifierIcon} alt="" className="w-5 h-5 opacity-50" />
                <input
                  type="text"
                  className="w-full bg-transparent outline-none text-sm font-medium text-stone-800 placeholder-stone-400"
                  placeholder="Search destinations, islands, or countries..."
                  value={searchQuery}
                  aria-label="Search destinations"
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                    setHighlightedIndex(-1);
                  }}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedQuery('');
                      setIsDropdownOpen(false);
                      setActiveMarkerId(null);
                    }}
                    className="text-stone-400 hover:text-stone-600 text-xs px-2 flex items-center gap-1 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {isDropdownOpen && (
                <div className="explore-autocomplete-dropdown">
                  {searchQuery.trim().length >= 2 ? (
                    <>
                      <div className="explore-autocomplete-header">
                        <span>Matching Places ({autocompleteSuggestions.length})</span>
                        <span className="text-[10px] text-stone-400 font-normal">
                          Press Enter to search
                        </span>
                      </div>
                      <div className="explore-autocomplete-list">
                        {autocompleteSuggestions.length > 0 ? (
                          autocompleteSuggestions.map((item, idx) => (
                            <div
                              key={item.id}
                              className={`explore-autocomplete-item ${
                                highlightedIndex === idx ? 'active' : ''
                              }`}
                              onClick={() => handleSelectSuggestion(item)}
                              onMouseEnter={() => setHighlightedIndex(idx)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSelectSuggestion(item);
                              }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className="w-9 h-9 rounded-lg bg-cover bg-center shrink-0 border border-stone-200"
                                  style={{ backgroundImage: `url(${item.imageUrl})` }}
                                />
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-stone-800 truncate">
                                    {item.name}
                                  </div>
                                  <div className="text-xs text-stone-500 flex items-center gap-1.5 truncate">
                                    {item.flag && (
                                      <img
                                        src={item.flag}
                                        alt=""
                                        className="w-3.5 h-2.5 object-cover rounded-xs"
                                      />
                                    )}
                                    <span>{item.country || item.region}</span>
                                    {item.tag && (
                                      <>
                                        <span className="text-stone-300">•</span>
                                        <span className="text-stone-400 truncate">
                                          {item.tag}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                                  {item.category === 'island'
                                    ? 'Island'
                                    : item.category === 'country'
                                      ? 'Country'
                                      : 'Place'}
                                </span>
                                <ArrowUpRight size={14} className="text-stone-400" />
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-stone-500">
                            No direct matches for &ldquo;{searchQuery}&rdquo;. Press Enter
                            to view all search results.
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="explore-autocomplete-header">
                        <span className="flex items-center gap-1.5 text-amber-700">
                          <Flame size={13} className="fill-amber-500 text-amber-500" />
                          <span>Trending Searches</span>
                        </span>
                        <span className="text-[10px] text-stone-400 font-normal">
                          Popular picks
                        </span>
                      </div>
                      <div className="explore-autocomplete-list">
                        {trendingSearches.map((item, idx) => (
                          <div
                            key={`trending-${item.id}`}
                            className={`explore-autocomplete-item ${
                              highlightedIndex === idx ? 'active' : ''
                            }`}
                            onClick={() => handleSelectSuggestion(item)}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSelectSuggestion(item);
                            }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-8 h-8 rounded-lg bg-cover bg-center shrink-0 border border-stone-200"
                                style={{ backgroundImage: `url(${item.imageUrl})` }}
                              />
                              <div className="min-w-0">
                                <span className="text-sm font-semibold text-stone-800 truncate block">
                                  {item.name}
                                </span>
                                <span className="text-xs text-stone-400 block truncate">
                                  {item.country || item.region}{' '}
                                  {item.tag ? `• ${item.tag}` : ''}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Trending
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* =========================================================================
                SEARCH MODE: Flat Results Grid or Empty State
               ========================================================================= */}
            {isSearchMode ? (
              <div className="explore-mode-transition flex flex-col gap-5">
                <div className="flex items-center justify-between pb-1 border-b border-stone-200/70">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-bold text-stone-900 tracking-tight">
                        Search Results
                      </h2>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                        {searchResults.length}{' '}
                        {searchResults.length === 1 ? 'place' : 'places'} found
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Showing matching destinations for &ldquo;
                      <span className="font-semibold text-stone-800">
                        {debouncedQuery}
                      </span>
                      &rdquo;
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedQuery('');
                      setActiveMarkerId(null);
                    }}
                    className="text-xs font-semibold text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <X size={14} />
                    <span>Clear search</span>
                  </button>
                </div>

                {searchResults.length > 0 ? (
                  <div className="explore-results-grid">
                    {searchResults.map((place) => (
                      <div
                        key={place.id}
                        className={`explore-result-card group ${
                          activeMarkerId === place.id ? 'ring-2 ring-amber-500' : ''
                        }`}
                        onClick={() => handleSelectPlace(place, false)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSelectPlace(place, false);
                        }}
                      >
                        <div
                          className="explore-result-image"
                          style={{ backgroundImage: `url(${place.imageUrl})` }}
                        >
                          <div className="explore-category-pill">
                            <span>
                              {place.category === 'island'
                                ? '🏝️ Island'
                                : place.category === 'country'
                                  ? '🌍 Country'
                                  : '📍 Place'}
                            </span>
                          </div>

                          <div className="explore-rating-pill">
                            <Star
                              size={12}
                              className="text-amber-500 fill-amber-500 shrink-0"
                            />
                            <span>{getPlaceRating(place.id)}</span>
                          </div>

                          <div className="absolute bottom-3.5 left-3.5 right-3.5 z-10">
                            <h3 className="text-base font-bold text-white tracking-tight drop-shadow-md truncate">
                              {place.name}
                            </h3>
                          </div>
                        </div>

                        <div className="explore-result-content">
                          <div>
                            <div className="explore-result-meta">
                              {place.flag && (
                                <img
                                  src={place.flag}
                                  alt=""
                                  className="w-4 h-3 object-cover rounded-xs"
                                />
                              )}
                              <span className="font-semibold text-stone-700">
                                {place.country || place.region}
                              </span>
                              {place.tag && (
                                <>
                                  <span className="text-stone-300">•</span>
                                  <span className="text-stone-500 truncate">
                                    {place.tag}
                                  </span>
                                </>
                              )}
                            </div>

                            {place.description && (
                              <p className="explore-result-description">
                                {place.description}
                              </p>
                            )}
                          </div>

                          <div className="explore-result-actions">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectPlace(place, true);
                              }}
                              className="btn-popular-plan"
                            >
                              Plan Trip
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectPlace(place, false);
                              }}
                              className="explore-result-globe-btn"
                              title="Frame on 3D Globe"
                            >
                              <span>Globe</span>
                              <ArrowUpRight size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Empty / Zero-Result State */
                  <div className="explore-zero-results">
                    <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Compass size={28} />
                    </div>

                    <div className="max-w-md">
                      <h3 className="text-base font-bold text-stone-900 mb-1">
                        No destinations found for &ldquo;{debouncedQuery}&rdquo;
                      </h3>
                      <p className="text-xs text-stone-500 leading-relaxed">
                        We couldn&apos;t find any islands or countries matching your
                        search. Try searching for a country or region instead.
                      </p>
                    </div>

                    {/* Helpful Category Chips */}
                    <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                      {[
                        'Philippines',
                        'Islands',
                        'Asia',
                        'Europe',
                        'Beach',
                        'Americas',
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            setSearchQuery(chip);
                            setDebouncedQuery(chip);
                          }}
                          className="px-3 py-1 text-xs font-medium bg-white text-stone-700 border border-stone-200 hover:border-amber-400 hover:text-amber-700 rounded-full transition shadow-xs cursor-pointer"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    {/* Fallback Trending Destinations */}
                    <div className="w-full mt-2 pt-4 border-t border-stone-200/80">
                      <p className="text-xs font-bold text-stone-700 mb-3 text-left">
                        🔥 Or explore our trending picks:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {islands.slice(0, 3).map((island) => (
                          <div
                            key={`zero-rec-${island.id}`}
                            className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center gap-2.5 cursor-pointer hover:border-amber-400 transition"
                            onClick={() => handleSelectPlace(island, true)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSelectPlace(island, true);
                            }}
                          >
                            <img
                              src={island.imageUrl}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div className="text-left overflow-hidden">
                              <h4 className="text-xs font-bold text-stone-800 truncate">
                                {island.name}
                              </h4>
                              <span className="text-[11px] text-amber-700 font-semibold block">
                                {island.tag || 'Trending'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setDebouncedQuery('');
                      }}
                      className="text-xs font-semibold text-stone-600 hover:text-stone-900 mt-2 underline cursor-pointer"
                    >
                      ← Return to Browse Mode
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* =========================================================================
                  BROWSE MODE: Featured, Companion, All Countries, Top Islands
                 ========================================================================= */
              <div className="explore-mode-transition flex flex-col gap-6">
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
                      style={{ backgroundImage: `url(${popularPlace.imageUrl})` }}
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

                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    Choose Your Companion, Find Your Destination
                  </h2>
                  <p className="text-xs text-stone-400 mb-3">
                    Wherever you&apos;re going and whoever&apos;s coming along, find the
                    ideal retreat for your next trip.
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

                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <h2 className="text-base font-bold text-stone-900">All Countries</h2>
                    <span className="text-xs text-stone-400">
                      {filteredCountries.length}{' '}
                      {filteredCountries.length === 1 ? 'country' : 'countries'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mb-3">
                    Explore places across every continent with live geographic
                    coordinates.
                  </p>

                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {['All', 'Europe', 'Asia', 'Americas', 'Africa', 'Oceania'].map(
                      (region) => (
                        <button
                          key={region}
                          type="button"
                          onClick={() => {
                            setActiveRegion(region);
                            setActiveMarkerId(null);
                            setFocusCoords(CONTINENT_CENTERS[region] || null);
                          }}
                          className={`region-chip-btn ${
                            activeRegion === region ? 'active' : ''
                          }`}
                        >
                          <span>{region}</span>
                        </button>
                      ),
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <button
                      type="button"
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
                          No destinations match in {activeRegion}.
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
                      type="button"
                      onClick={() => scrollContainer(countryScrollRef, 240)}
                      className="carousel-arrow-btn"
                      aria-label="Scroll countries right"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <h2 className="text-base font-bold text-stone-900">
                      Top Islands to Explore{' '}
                      <span className="text-stone-400 font-normal ml-1">
                        (🇵🇭 Philippines)
                      </span>
                    </h2>
                    <span className="text-xs text-stone-400">
                      {islands.length} iconic islands
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mb-3">
                    Discover breathtaking archipelagos, lagoons, and white-sand escapes
                    across the Philippines.
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
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
                      {islands.map((island) => (
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
                      type="button"
                      onClick={() => scrollContainer(islandScrollRef, 240)}
                      className="carousel-arrow-btn"
                      aria-label="Scroll islands right"
                    >
                      ›
                    </button>
                  </div>
                </div>

                <div className="explore-cta-banner">
                  <p className="explore-cta-text">
                    Start a new adventure and LakBye will handle your itineraries, stays,
                    and budget all in one place.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTripName('');
                      setSelectedLocation('');
                      setStartDate('');
                      setEndDate('');
                      setIsStartTripOpen(true);
                    }}
                    className="btn-lakbye-gradient"
                  >
                    <span>+</span>
                    <span>Start a Trip</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="explore-map-sticky-panel">
            <GlobeMap
              markers={globeMarkers}
              activeMarkerId={activeMarkerId}
              focusView={focusCoords}
              searchMode={isSearchMode}
              onMarkerClick={(id) => {
                const matched = allDestinations.find((p) => p.id === id) || popularPlace;
                if (matched) handleSelectPlace(matched, false);
              }}
            />
          </div>
        </div>
      </div>

      {/* Mobile Experience */}
      <div className="explore-mobile-content">
        <div className="explore-mobile-header-section">
          <h1 className="explore-mobile-title">Where to next?</h1>
          <p className="explore-mobile-subtitle">
            Discover your ultimate Philippine getaway
          </p>
        </div>

        {/* Mobile Search with Autocomplete Dropdown */}
        <div className="explore-search-wrapper" ref={mobileSearchContainerRef}>
          <div className="explore-mobile-search-box">
            <img src={magnifierIcon} alt="Search" className="w-4 h-4 opacity-50" />
            <input
              type="text"
              className="explore-mobile-search-input"
              placeholder="Search destinations, islands, countries..."
              value={searchQuery}
              aria-label="Search destinations"
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
                setHighlightedIndex(-1);
              }}
              onKeyDown={handleSearchKeyDown}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDebouncedQuery('');
                  setIsDropdownOpen(false);
                }}
                className="text-stone-400 text-xs px-2"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isDropdownOpen && (
            <div className="explore-autocomplete-dropdown">
              {searchQuery.trim().length >= 2 ? (
                <>
                  <div className="explore-autocomplete-header">
                    <span>Matching Places ({autocompleteSuggestions.length})</span>
                  </div>
                  <div className="explore-autocomplete-list">
                    {autocompleteSuggestions.map((item) => (
                      <div
                        key={`m-sug-${item.id}`}
                        className="explore-autocomplete-item"
                        onClick={() => handleSelectSuggestion(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSelectSuggestion(item);
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-lg bg-cover bg-center shrink-0"
                            style={{ backgroundImage: `url(${item.imageUrl})` }}
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-stone-800 truncate block">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-stone-500 truncate block">
                              {item.country || item.region}
                            </span>
                          </div>
                        </div>
                        <ArrowUpRight size={14} className="text-stone-400" />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="explore-autocomplete-header">
                    <span className="flex items-center gap-1 text-amber-700">
                      <Flame size={12} className="fill-amber-500 text-amber-500" />
                      <span>Trending Searches</span>
                    </span>
                  </div>
                  <div className="explore-autocomplete-list">
                    {trendingSearches.map((item) => (
                      <div
                        key={`m-trend-${item.id}`}
                        className="explore-autocomplete-item"
                        onClick={() => handleSelectSuggestion(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSelectSuggestion(item);
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-lg bg-cover bg-center shrink-0"
                            style={{ backgroundImage: `url(${item.imageUrl})` }}
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-stone-800 truncate block">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-stone-500 truncate block">
                              {item.country || item.region}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-amber-700">
                          Trending
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile Categories & 3D Globe Button */}
        {!isSearchMode && (
          <div className="explore-mobile-categories-strip">
            {['Most Popular', 'Hidden Gems', 'Beaches', 'Mountains', 'All'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setMobileCategory(cat);
                  setShowMobileGlobe(false);
                }}
                className={`explore-mobile-cat-pill ${
                  !showMobileGlobe && mobileCategory === cat ? 'active' : ''
                }`}
              >
                {cat}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowMobileGlobe((prev) => !prev)}
              className={`explore-mobile-cat-pill globe-toggle ${
                showMobileGlobe ? 'active' : ''
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>3D Globe</span>
            </button>
          </div>
        )}

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
                searchMode={isSearchMode}
                onMarkerClick={(id) => {
                  const matched =
                    allDestinations.find((p) => p.id === id) || popularPlace;
                  if (matched) handleSelectPlace(matched, true);
                }}
              />
            </div>
          </div>
        )}

        {/* Mobile Destinations: Search results when searching, category list when browsing */}
        <div className="explore-mobile-dest-grid">
          {isSearchMode ? (
            searchResults.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-stone-500">
                No destinations match &ldquo;{debouncedQuery}&rdquo;.
              </div>
            ) : (
              searchResults.map((place) => (
                <div
                  key={`m-res-${place.id}`}
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
                        {place.category === 'island'
                          ? 'Island'
                          : place.country || place.region}
                      </span>
                      <div className="explore-dest-rating">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>{getPlaceRating(place.id)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : loading && countries.length === 0 ? (
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
              No destinations match in {mobileCategory}.
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

      {/* Start a Trip Modal */}
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
                      className={`travel-type-pill ${
                        travelType === type ? 'active' : ''
                      }`}
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
