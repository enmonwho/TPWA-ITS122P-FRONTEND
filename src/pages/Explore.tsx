import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobeMap from '../components/GlobeMap';
import DestinationDetailModal from '../components/DestinationDetailModal';
import magnifierIcon from '../assets/magnifier.png';
import {
  Star,
  Globe,
  X,
  Compass,
  Flame,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Palette,
  Palmtree,
  Utensils,
  Sparkles,
  Landmark,
  Trees,
  Wine,
  Footprints,
  Heart,
  Mountain,
  Snowflake,
  Home,
  Flower2,
  PawPrint,
} from 'lucide-react';
import { tripsApi, destinationsApi, activitiesApi } from '../services/api';
import {
  fetchExploreCountries,
  TOP_ISLANDS,
  getEditorsPicks,
  getBestTimeToTravel,
  getPlacesByVibe,
  VIBES_LIST,
  MONTHS_SHORT,
  type ExplorePlace,
} from '../services/exploreService';

const CONTINENT_CENTERS: Record<string, [number, number]> = {
  Europe: [15.2551, 54.526],
  Asia: [100.6197, 34.0479],
  Americas: [-75.0, 10.0],
  Africa: [20.0, 8.7832],
  Oceania: [140.0188, -22.7359],
  Philippines: [121.774, 12.8797],
  All: [121.774, 12.8797],
};

const MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function Explore() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const [countries, setCountries] = useState<ExplorePlace[]>([]);
  const [islands] = useState<ExplorePlace[]>(TOP_ISLANDS);

  const [activeRegion, setActiveRegion] = useState('All');
  const [activeMonth, setActiveMonth] = useState<number>(() => new Date().getMonth());
  const [activeVibe, setActiveVibe] = useState<string | null>(null);

  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStartTripOpen, setIsStartTripOpen] = useState(false);
  const [selectedDetailPlace, setSelectedDetailPlace] = useState<ExplorePlace | null>(
    null,
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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

  // Fetch real data dynamically from REST API and backend endpoints (no hardcoding)
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [loadedCountries, backendDests, backendActivities] =
          await Promise.allSettled([
            fetchExploreCountries(),
            destinationsApi.getAll(),
            activitiesApi.getAll(),
          ]);

        if (!isMounted) return;

        let placeList: ExplorePlace[] = [];
        if (loadedCountries.status === 'fulfilled') {
          placeList = [...loadedCountries.value];
        }

        // Merge backend destinations if present
        if (backendDests.status === 'fulfilled' && backendDests.value.length > 0) {
          backendDests.value.forEach((d) => {
            if (
              !placeList.some(
                (p) => p.name.toLowerCase() === d.location_name.toLowerCase(),
              )
            ) {
              placeList.push({
                id: `backend-${d.id}`,
                name: d.location_name,
                country: 'Philippines',
                region: 'Asia',
                category: 'popular',
                latitude: d.latitude || 12.8797,
                longitude: d.longitude || 121.774,
                imageUrl:
                  'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=800&q=80',
                flag: 'https://flagcdn.com/w320/ph.png',
                description: `Iconic stop in the Philippines: ${d.location_name}.`,
                tag: 'Trip Destination',
                vibes: ['Beach', 'Scenic', 'Adventure'],
                bestMonths: [0, 1, 2, 3, 4, 11],
              });
            }
          });
        }

        // Augment place descriptions with backend activities
        if (
          backendActivities.status === 'fulfilled' &&
          backendActivities.value.length > 0
        ) {
          const acts = backendActivities.value;
          placeList = placeList.map((p) => {
            const matchedAct = acts.find((a) =>
              p.name.toLowerCase().includes(a.title.toLowerCase()),
            );
            if (matchedAct && !p.description?.includes(matchedAct.title)) {
              return {
                ...p,
                tag: 'Featured Activity',
              };
            }
            return p;
          });
        }

        setCountries(placeList);
        const picks = getEditorsPicks(placeList);
        setSelectedLocation(picks.hero.name);
        setActiveMarkerId(picks.hero.id);
      } catch (err) {
        console.error('Error loading explore destinations from APIs:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute Stippl Editor's Picks (1 hero card + 2 stacked cards)
  const editorsPicks = useMemo(() => {
    return getEditorsPicks(countries);
  }, [countries]);

  // Compute Best Time to Travel (4 cards matching current/selected month)
  const bestTimePlaces = useMemo(() => {
    return getBestTimeToTravel(countries, activeMonth);
  }, [countries, activeMonth]);

  // Combined master catalog of all places
  const allDestinations = useMemo(() => {
    const map = new Map<string, ExplorePlace>();
    TOP_ISLANDS.forEach((i) => map.set(i.id, i));
    countries.forEach((c) => map.set(c.id, c));
    return Array.from(map.values());
  }, [countries]);

  // Filtered countries list for "All Countries" section
  const filteredCountries = useMemo(() => {
    let list = countries;

    // Filter by Region
    if (activeRegion === 'Philippines') {
      list = list.filter(
        (c) => c.country === 'Philippines' || c.name.includes('Philippines'),
      );
    } else if (activeRegion !== 'All') {
      list = list.filter((c) => c.region === activeRegion);
    }

    // Filter by Vibe if selected
    if (activeVibe) {
      list = getPlacesByVibe(list, activeVibe);
    }

    return list;
  }, [countries, activeRegion, activeVibe]);

  // Markers for interactive 3D Globe
  const globeMarkers = useMemo(() => {
    const list = activeVibe
      ? getPlacesByVibe(allDestinations, activeVibe)
      : filteredCountries.length > 0
        ? filteredCountries
        : allDestinations;

    return list.slice(0, 35).map((p) => ({
      id: p.id,
      title: p.name,
      name: p.name,
      lat: p.latitude,
      lng: p.longitude,
      flag: p.flag,
    }));
  }, [allDestinations, filteredCountries, activeVibe]);

  // Search Results
  const isSearchMode = Boolean(debouncedQuery.trim());
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return allDestinations.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.country && p.country.toLowerCase().includes(q)) ||
        (p.region && p.region.toLowerCase().includes(q)) ||
        (p.tag && p.tag.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.vibes && p.vibes.some((v) => v.toLowerCase().includes(q))),
    );
  }, [debouncedQuery, allDestinations]);

  // Autocomplete Suggestions
  const autocompleteSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return [];
    const q = searchQuery.toLowerCase();
    return allDestinations
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.country && p.country.toLowerCase().includes(q)) ||
          (p.tag && p.tag.toLowerCase().includes(q)),
      )
      .slice(0, 6);
  }, [searchQuery, allDestinations]);

  const trendingSearches = useMemo(() => {
    return [
      ...TOP_ISLANDS.slice(0, 3),
      ...countries.filter((c) =>
        ['BN', 'CK', 'SZ', 'US', 'FR', 'IT', 'JP'].includes(c.id),
      ),
    ].slice(0, 5);
  }, [countries]);

  const scrollContainer = (
    ref: React.RefObject<HTMLDivElement | null>,
    offset: number,
  ) => {
    if (ref.current) {
      ref.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleOpenDetailModal = (place: ExplorePlace) => {
    setActiveMarkerId(place.id);
    setFocusCoords([place.longitude, place.latitude]);
    setSelectedDetailPlace(place);
    setIsDetailModalOpen(true);
  };

  const handleStartTripFromCountry = (targetName: string) => {
    setSelectedLocation(targetName);
    setTripName(`${targetName} Adventure`);
    setStartDate('');
    setEndDate('');
    setIsStartTripOpen(true);
  };

  const handleSelectPlace = (place: ExplorePlace, openPlanModal = false) => {
    setActiveMarkerId(place.id);
    setFocusCoords([place.longitude, place.latitude]);
    setSelectedLocation(place.name);

    if (openPlanModal) {
      setTripName(`${place.name} Adventure`);
      setStartDate('');
      setEndDate('');
      setIsStartTripOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsStartTripOpen(false);
    setTripName('');
    setSelectedLocation('');
    setStartDate('');
    setEndDate('');
  };

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
    if (endDate <= startDate) return;

    setSubmitting(true);
    try {
      const newTrip = await tripsApi.createTrip({
        title: tripName,
        start_date: startDate,
        end_date: endDate,
        total_budget: 15000,
        status: 'planning',
      });
      handleCloseModal();
      navigate(`/trip/${newTrip.id}`);
    } catch (err) {
      console.error('Failed to create trip:', err);
      handleCloseModal();
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
      BN: '4.8',
      CK: '4.9',
      SZ: '4.7',
      US: '4.8',
      FR: '4.9',
      IT: '4.9',
      ES: '4.8',
    };
    return ratings[id] || '4.8';
  };

  const renderVibeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Compass':
        return <Compass size={14} className="shrink-0 text-amber-600" />;
      case 'Palette':
        return <Palette size={14} className="shrink-0 text-violet-600" />;
      case 'Palmtree':
        return <Palmtree size={14} className="shrink-0 text-emerald-600" />;
      case 'Utensils':
        return <Utensils size={14} className="shrink-0 text-rose-600" />;
      case 'Sparkles':
        return <Sparkles size={14} className="shrink-0 text-amber-500" />;
      case 'Landmark':
        return <Landmark size={14} className="shrink-0 text-indigo-600" />;
      case 'Trees':
        return <Trees size={14} className="shrink-0 text-emerald-700" />;
      case 'Wine':
        return <Wine size={14} className="shrink-0 text-pink-600" />;
      case 'Footprints':
        return <Footprints size={14} className="shrink-0 text-stone-600" />;
      case 'Heart':
        return <Heart size={14} className="shrink-0 text-rose-500" />;
      case 'Mountain':
        return <Mountain size={14} className="shrink-0 text-cyan-700" />;
      case 'Snowflake':
        return <Snowflake size={14} className="shrink-0 text-sky-500" />;
      case 'Flame':
        return <Flame size={14} className="shrink-0 text-orange-500" />;
      case 'Home':
        return <Home size={14} className="shrink-0 text-amber-800" />;
      case 'Flower2':
        return <Flower2 size={14} className="shrink-0 text-teal-600" />;
      case 'PawPrint':
        return <PawPrint size={14} className="shrink-0 text-amber-700" />;
      default:
        return <Compass size={14} className="shrink-0 text-amber-600" />;
    }
  };

  // Mobile destinations filter
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
            'BN',
            'CK',
            'SZ',
            'island-palawan',
            'island-boracay',
            'island-siargao',
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
        return ['BN', 'CK', 'SZ', 'island-batanes', 'island-coron'].includes(place.id);
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

  const currentMonthYearStr = `${MONTHS_FULL[activeMonth]} ${new Date().getFullYear()}`;

  return (
    <div className="explore-page-wrapper">
      <div className="explore-desktop-content">
        <div className="explore-container-card">
          <div className="explore-scroll-pane">
            {/* Header: Where to next? */}
            <div className="explore-header-group">
              <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
                Where to next?
              </h1>
              <p className="text-xs text-stone-500 mt-1">
                Explore trending destinations, plan seasonal escapes, and browse by vibe
                in 3D.
              </p>
            </div>

            {/* Desktop Search Bar with Live Autocomplete Dropdown */}
            <div className="explore-search-wrapper" ref={searchContainerRef}>
              <div className="explore-search-input-box">
                <img src={magnifierIcon} alt="" className="w-5 h-5 opacity-50 shrink-0" />
                <input
                  type="text"
                  className="explore-search-input"
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

            {/* Search Mode: Results Grid or Empty State */}
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
                        onClick={() => handleOpenDetailModal(place)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleOpenDetailModal(place);
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
                                handleStartTripFromCountry(place.name);
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

                    <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                      {[
                        'Philippines',
                        'Brunei',
                        'Cook Islands',
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
              /* Browse Mode: Stippl Reference Layout */
              <div className="explore-mode-transition flex flex-col gap-6">
                {/* 1. FEATURED / Editor's picks (1 Hero + 2 Stacked) */}
                <div className="stippl-section">
                  <span className="stippl-overline">Featured</span>
                  <div className="stippl-header-row">
                    <h2 className="stippl-title">Editor&apos;s picks</h2>
                    <span className="stippl-date-badge">{currentMonthYearStr}</span>
                  </div>

                  <div className="stippl-featured-grid">
                    {/* Hero Card */}
                    <button
                      type="button"
                      className="stippl-hero-card group"
                      style={{ backgroundImage: `url(${editorsPicks.hero.imageUrl})` }}
                      onClick={() => handleOpenDetailModal(editorsPicks.hero)}
                      title={`View details for ${editorsPicks.hero.name}`}
                    >
                      <div className="stippl-hero-content">
                        <div className="stippl-hero-title-row">
                          {editorsPicks.hero.flag && (
                            <img
                              src={editorsPicks.hero.flag}
                              alt=""
                              className="stippl-hero-flag"
                            />
                          )}
                          <h3 className="stippl-hero-title">{editorsPicks.hero.name}</h3>
                        </div>
                        <p className="stippl-hero-desc">
                          {editorsPicks.hero.description}
                        </p>
                      </div>
                    </button>

                    {/* Stacked Cards */}
                    <div className="stippl-stacked-col">
                      <button
                        type="button"
                        className="stippl-stacked-card group"
                        style={{
                          backgroundImage: `url(${editorsPicks.stackedTop.imageUrl})`,
                        }}
                        onClick={() => handleOpenDetailModal(editorsPicks.stackedTop)}
                        title={`View details for ${editorsPicks.stackedTop.name}`}
                      >
                        <div className="stippl-stacked-content">
                          <div className="stippl-stacked-title-row">
                            {editorsPicks.stackedTop.flag && (
                              <img
                                src={editorsPicks.stackedTop.flag}
                                alt=""
                                className="stippl-stacked-flag"
                              />
                            )}
                            <h3 className="stippl-stacked-title">
                              {editorsPicks.stackedTop.name}
                            </h3>
                          </div>
                          <p className="stippl-stacked-desc">
                            {editorsPicks.stackedTop.description}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="stippl-stacked-card group"
                        style={{
                          backgroundImage: `url(${editorsPicks.stackedBottom.imageUrl})`,
                        }}
                        onClick={() => handleOpenDetailModal(editorsPicks.stackedBottom)}
                        title={`View details for ${editorsPicks.stackedBottom.name}`}
                      >
                        <div className="stippl-stacked-content">
                          <div className="stippl-stacked-title-row">
                            {editorsPicks.stackedBottom.flag && (
                              <img
                                src={editorsPicks.stackedBottom.flag}
                                alt=""
                                className="stippl-stacked-flag"
                              />
                            )}
                            <h3 className="stippl-stacked-title">
                              {editorsPicks.stackedBottom.name}
                            </h3>
                          </div>
                          <p className="stippl-stacked-desc">
                            {editorsPicks.stackedBottom.description}
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. WHEN TO GO / Best time to travel */}
                <div className="stippl-section">
                  <span className="stippl-overline">When to go</span>
                  <div className="stippl-header-row">
                    <h2 className="stippl-title">Best time to travel</h2>
                    <div className="stippl-nav-arrows">
                      <button
                        type="button"
                        className="stippl-nav-arrow-btn"
                        onClick={() => setActiveMonth((m) => (m === 0 ? 11 : m - 1))}
                        aria-label="Previous month"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        className="stippl-nav-arrow-btn"
                        onClick={() => setActiveMonth((m) => (m === 11 ? 0 : m + 1))}
                        aria-label="Next month"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Month Tabs */}
                  <div className="stippl-month-tabs no-scrollbar">
                    {MONTHS_SHORT.map((mName, idx) => (
                      <button
                        key={mName}
                        type="button"
                        onClick={() => setActiveMonth(idx)}
                        className={`stippl-month-btn ${
                          activeMonth === idx ? 'active' : ''
                        }`}
                      >
                        {mName}
                      </button>
                    ))}
                  </div>

                  {/* 4 Cards Grid */}
                  <div className="stippl-travel-grid">
                    {bestTimePlaces.map((place) => (
                      <button
                        key={`travel-${place.id}`}
                        type="button"
                        className="stippl-travel-card group text-left"
                        style={{ backgroundImage: `url(${place.imageUrl})` }}
                        onClick={() => handleOpenDetailModal(place)}
                        title={`View details for ${place.name}`}
                      >
                        {place.flag ? (
                          <img
                            src={place.flag}
                            alt=""
                            className="stippl-travel-flag-badge"
                          />
                        ) : (
                          <div className="w-6 h-6" />
                        )}
                        <span className="stippl-travel-name">{place.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. VIBE / Browse by feel */}
                <div className="stippl-section">
                  <span className="stippl-overline">Vibe</span>
                  <div className="stippl-header-row">
                    <h2 className="stippl-title">Browse by feel</h2>
                    {activeVibe && (
                      <button
                        type="button"
                        onClick={() => setActiveVibe(null)}
                        className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
                      >
                        Clear filter ✕
                      </button>
                    )}
                  </div>

                  {/* 16 Vibe Pills */}
                  <div className="stippl-vibe-pills">
                    {VIBES_LIST.map((vibe) => (
                      <button
                        key={vibe.id}
                        type="button"
                        onClick={() => {
                          setActiveVibe((prev) =>
                            prev === vibe.name ? null : vibe.name,
                          );
                        }}
                        className={`stippl-vibe-pill ${
                          activeVibe === vibe.name ? 'active' : ''
                        }`}
                      >
                        {renderVibeIcon(vibe.iconName)}
                        <span>{vibe.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. ALL COUNTRIES / Explore Destinations */}
                <div className="stippl-section">
                  <span className="stippl-overline">All Countries</span>
                  <div className="stippl-header-row mb-3">
                    <h2 className="stippl-title">Explore Destinations</h2>
                    <span className="explore-count-label">
                      {filteredCountries.length}{' '}
                      {filteredCountries.length === 1 ? 'place' : 'places'}
                    </span>
                  </div>

                  {/* Region Filter Chips */}
                  <div className="explore-region-chips no-scrollbar">
                    {[
                      'All',
                      'Philippines',
                      'Asia',
                      'Europe',
                      'Americas',
                      'Africa',
                      'Oceania',
                    ].map((region) => (
                      <button
                        key={region}
                        type="button"
                        onClick={() => {
                          setActiveRegion(region);
                          setActiveMarkerId(null);
                          const coords = CONTINENT_CENTERS[region];
                          setFocusCoords(coords ? [coords[0], coords[1]] : null);
                        }}
                        className={`region-chip-btn ${
                          activeRegion === region ? 'active' : ''
                        }`}
                      >
                        <span>{region}</span>
                      </button>
                    ))}
                  </div>

                  {/* Horizontal Scroll Carousel */}
                  <div className="explore-carousel-wrapper">
                    <button
                      type="button"
                      onClick={() => scrollContainer(countryScrollRef, -260)}
                      className="carousel-arrow-btn"
                      aria-label="Scroll countries left"
                    >
                      ‹
                    </button>
                    <div
                      ref={countryScrollRef}
                      className="flex gap-5 overflow-x-auto py-3 no-scrollbar scroll-smooth flex-1"
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
                          No destinations match{' '}
                          {activeVibe ? `vibe "${activeVibe}" in ` : ''}
                          {activeRegion}.
                        </div>
                      ) : (
                        filteredCountries.map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            className="carousel-card text-left group"
                            onClick={() => handleOpenDetailModal(item)}
                            title={`View details for ${item.name}`}
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
                      onClick={() => scrollContainer(countryScrollRef, 260)}
                      className="carousel-arrow-btn"
                      aria-label="Scroll countries right"
                    >
                      ›
                    </button>
                  </div>
                </div>

                {/* Top Islands (🇵🇭 Philippines) */}
                <div className="stippl-section">
                  <div className="explore-section-header">
                    <h2 className="stippl-title">
                      Top Islands to Explore{' '}
                      <span className="text-stone-400 font-normal text-base ml-1">
                        (🇵🇭 Philippines)
                      </span>
                    </h2>
                    <span className="explore-count-label">
                      {islands.length} iconic islands
                    </span>
                  </div>
                  <p className="explore-section-subtitle">
                    Discover breathtaking archipelagos, lagoons, and white-sand escapes.
                  </p>

                  <div className="explore-carousel-wrapper">
                    <button
                      type="button"
                      onClick={() => scrollContainer(islandScrollRef, -260)}
                      className="carousel-arrow-btn"
                      aria-label="Scroll islands left"
                    >
                      ‹
                    </button>
                    <div
                      ref={islandScrollRef}
                      className="flex gap-5 overflow-x-auto py-3 no-scrollbar scroll-smooth flex-1"
                    >
                      {islands.map((island) => (
                        <button
                          type="button"
                          key={`island-${island.id}`}
                          className="carousel-card text-left group"
                          onClick={() => handleOpenDetailModal(island)}
                          title={`View details for ${island.name}`}
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
                      onClick={() => scrollContainer(islandScrollRef, 260)}
                      className="carousel-arrow-btn"
                      aria-label="Scroll islands right"
                    >
                      ›
                    </button>
                  </div>
                </div>

                {/* Bottom CTA Banner */}
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

          {/* Right Sticky 3D Globe Panel */}
          <div className="explore-map-sticky-panel">
            <GlobeMap
              markers={globeMarkers}
              activeMarkerId={activeMarkerId}
              focusView={focusCoords}
              searchMode={isSearchMode}
              onMarkerClick={(id) => {
                const matched =
                  allDestinations.find((p) => p.id === id) || editorsPicks.hero;
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
            Discover your ultimate getaway across the globe
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
                className="text-stone-400 hover:text-stone-600 text-xs font-semibold cursor-pointer"
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
                    allDestinations.find((p) => p.id === id) || editorsPicks.hero;
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
                  onClick={() => handleOpenDetailModal(place)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleOpenDetailModal(place);
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
                onClick={() => handleOpenDetailModal(place)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleOpenDetailModal(place);
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
            onClick={handleCloseModal}
          />
          <div className="start-trip-modal-card">
            <button
              type="button"
              onClick={handleCloseModal}
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
                    min={new Date().toISOString().split('T')[0]}
                    className="modal-input-gradient flex-1 text-sm"
                    value={startDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStartDate(val);
                      if (endDate && endDate <= val) {
                        setEndDate('');
                      }
                    }}
                  />
                  <span className="text-sm font-medium text-stone-900">to</span>
                  <input
                    id="explore-end-date"
                    type="date"
                    required
                    min={
                      startDate
                        ? (() => {
                            const d = new Date(startDate);
                            d.setDate(d.getDate() + 1);
                            return d.toISOString().split('T')[0];
                          })()
                        : (() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 1);
                            return d.toISOString().split('T')[0];
                          })()
                    }
                    aria-label="End date"
                    className="modal-input-gradient flex-1 text-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                {startDate && endDate && endDate <= startDate && (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">
                    Return date must be after departure date.
                  </p>
                )}
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

      {/* Destination Detail Modal */}
      <DestinationDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDetailPlace(null);
        }}
        place={selectedDetailPlace}
        onStartTrip={handleStartTripFromCountry}
      />
    </div>
  );
}
