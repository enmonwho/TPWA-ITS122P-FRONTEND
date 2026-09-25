import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import GlobeMap, { type MarkerData } from '../components/GlobeMap';
import CreateTripModal from '../components/CreateTripModal';
import magnifierIcon from '../assets/magnifier.png';
import { tripsApi, destinationsApi } from '../services/api';
import { mergeTripsWithExtras, formatDateOnly } from '../lib/tripExtras';
import { getMapboxStaticThumb } from '../services/exploreService';
import type { Trip } from '../types/trip';
import type { Destination } from '../types/destination';
import {
  Globe,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Navigation,
  X,
  ExternalLink,
} from 'lucide-react';

export interface TripWithDestinations extends Trip {
  destinations: Destination[];
}

interface GeocodeFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number]; // [lng, lat]
}

export default function MapView() {
  const [trips, setTrips] = useState<TripWithDestinations[]>([]);
  const [activeTripId, setActiveTripId] = useState<number | string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View modes: 'my-trips' (per-trip inspection) or 'world-tracker' (Stippl-style aggregate view)
  const [activeViewMode, setActiveViewMode] = useState<'my-trips' | 'world-tracker'>(
    'my-trips',
  );
  const [worldFilter, setWorldFilter] = useState<'all' | 'visited' | 'upcoming'>('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);
  const [isAddPlaceView, setIsAddPlaceView] = useState(false);
  const [addPlaceMode, setAddPlaceMode] = useState<'search' | 'manual'>('search');

  // Manual Add Form State
  const [placeName, setPlaceName] = useState('');
  const [placeAddress, setPlaceAddress] = useState('');
  const [placeCountry, setPlaceCountry] = useState('');
  const [placeCity, setPlaceCity] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');

  // Live Search Geocoding Autocomplete
  const [placeSearchInput, setPlaceSearchInput] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<GeocodeFeature[]>([]);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<GeocodeFeature | null>(null);

  // Map Camera Focus & Active Pin Selection
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null);
  const [focusView, setFocusView] = useState<[number, number] | null>(null);
  const [selectedDestinationItem, setSelectedDestinationItem] = useState<{
    destination: Destination;
    trip: Trip;
    isVisited: boolean;
  } | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // =========================================================================
  // PHASE 1: Real Data Loading (tripsApi + destinationsApi)
  // =========================================================================
  const fetchTripsAndDestinationsLogic = useCallback(async (): Promise<
    TripWithDestinations[]
  > => {
    // Discard stale local-only test data
    localStorage.removeItem('lakbye_map_lists');

    const apiTrips = await tripsApi.getTrips();
    const mergedTrips = mergeTripsWithExtras(apiTrips || []);

    // Fetch real destinations for each trip in parallel
    const tripsWithDests: TripWithDestinations[] = await Promise.all(
      mergedTrips.map(async (trip) => {
        try {
          const dests = await destinationsApi.getByTripId(trip.id);
          return {
            ...trip,
            destinations: dests || [],
          };
        } catch {
          return {
            ...trip,
            destinations: [],
          };
        }
      }),
    );

    return tripsWithDests;
  }, []);

  const fetchTripsAndDestinations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTripsAndDestinationsLogic();
      setTrips(data);
    } catch (err: unknown) {
      console.error('Failed to load trips for map:', err);
      setError('Unable to load trips. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [fetchTripsAndDestinationsLogic]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const data = await fetchTripsAndDestinationsLogic();
        if (!isMounted) return;
        setTrips(data);
      } catch (err: unknown) {
        if (!isMounted) return;
        console.error('Failed to load trips for map:', err);
        setError('Unable to load trips. Please check your connection.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [fetchTripsAndDestinationsLogic]);

  // Active Selected Trip
  const activeTrip = useMemo(
    () => trips.find((t) => String(t.id) === String(activeTripId)) || null,
    [trips, activeTripId],
  );

  // =========================================================================
  // Helper: Geocoding via Mapbox API
  // =========================================================================
  const geocodeLocation = async (
    query: string,
  ): Promise<{ lat: number; lng: number; placeName: string } | null> => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token || !query.trim()) return null;

    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query.trim(),
        )}.json?access_token=${token}&limit=1`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return {
          lng,
          lat,
          placeName: data.features[0].place_name,
        };
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }
    return null;
  };

  // Computed suggestions to render inline rather than clearing state defensively in effects
  const suggestionsToShow =
    placeSearchInput.trim() && addPlaceMode === 'search' && !selectedFeature
      ? placeSuggestions
      : [];

  // Live Autocomplete Effect for Add Place Search Mode
  useEffect(() => {
    const query = placeSearchInput.trim();
    if (!query || addPlaceMode !== 'search') {
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsSearchingGeocode(true);
      try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN;
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            query,
          )}.json?access_token=${token}&autocomplete=true&limit=5`,
        );
        if (res.ok && isMounted) {
          const data = await res.json();
          setPlaceSuggestions(data.features || []);
        }
      } catch (err) {
        console.error('Search suggestions error:', err);
      } finally {
        if (isMounted) {
          setIsSearchingGeocode(false);
        }
      }
    }, 280);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [placeSearchInput, addPlaceMode]);

  // =========================================================================
  // Destination Creation (Backend Write)
  // =========================================================================
  const handleAddSearchPlace = async () => {
    if (!selectedFeature || !activeTrip) return;
    setIsGeocoding(true);
    setGeocodeError('');

    try {
      const [lng, lat] = selectedFeature.center;
      let newDest: Destination;

      try {
        newDest = await destinationsApi.create({
          trip_id: activeTrip.id,
          location_name: selectedFeature.text || selectedFeature.place_name,
          latitude: lat,
          longitude: lng,
          order_sequence: (activeTrip.destinations?.length || 0) + 1,
        });
      } catch (backendErr) {
        console.warn(
          'Backend destinationsApi.create error, using optimistic place with real coordinates:',
          backendErr,
        );
        newDest = {
          id: Date.now(),
          trip_id: Number(activeTrip.id),
          location_name: selectedFeature.text || selectedFeature.place_name,
          latitude: lat,
          longitude: lng,
          order_sequence: (activeTrip.destinations?.length || 0) + 1,
        };
      }

      // Update state in place
      setTrips((prev) =>
        prev.map((t) =>
          String(t.id) === String(activeTrip.id)
            ? { ...t, destinations: [...(t.destinations || []), newDest] }
            : t,
        ),
      );

      // Focus map to newly added pin
      setFocusView([lng, lat]);
      setActiveMarkerId(String(newDest.id));

      // Reset form
      setPlaceSearchInput('');
      setSelectedFeature(null);
      setPlaceSuggestions([]);
      setIsAddPlaceView(false);
    } catch (err) {
      console.error('Failed to add destination:', err);
      setGeocodeError('Failed to resolve or save place. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleAddManualPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim() || !activeTrip) return;

    setIsGeocoding(true);
    setGeocodeError('');

    try {
      // Resolve REAL coordinates via Mapbox Geocoding API
      const locationQuery = [placeName, placeAddress, placeCity, placeCountry]
        .filter(Boolean)
        .join(', ');

      const coords = await geocodeLocation(locationQuery);
      if (!coords) {
        setGeocodeError(
          'Could not find location coordinates on Mapbox. Please check spelling.',
        );
        setIsGeocoding(false);
        return;
      }

      let newDest: Destination;
      try {
        newDest = await destinationsApi.create({
          trip_id: activeTrip.id,
          location_name: placeName.trim(),
          latitude: coords.lat,
          longitude: coords.lng,
          order_sequence: (activeTrip.destinations?.length || 0) + 1,
        });
      } catch (backendErr) {
        console.warn(
          'Backend destinationsApi.create error, using optimistic place with real coordinates:',
          backendErr,
        );
        newDest = {
          id: Date.now(),
          trip_id: Number(activeTrip.id),
          location_name: placeName.trim(),
          latitude: coords.lat,
          longitude: coords.lng,
          order_sequence: (activeTrip.destinations?.length || 0) + 1,
        };
      }

      // Update state in place
      setTrips((prev) =>
        prev.map((t) =>
          String(t.id) === String(activeTrip.id)
            ? { ...t, destinations: [...(t.destinations || []), newDest] }
            : t,
        ),
      );

      // Focus map to newly added pin
      setFocusView([coords.lng, coords.lat]);
      setActiveMarkerId(String(newDest.id));

      // Reset form fields
      setPlaceName('');
      setPlaceAddress('');
      setPlaceCity('');
      setPlaceCountry('');
      setIsAddPlaceView(false);
    } catch (err) {
      console.error('Failed to create destination:', err);
      setGeocodeError('Failed to save destination. Please try again.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleDeleteDestination = async (destId: number) => {
    if (!activeTrip) return;
    try {
      await destinationsApi.delete(destId);
    } catch (err) {
      console.error('Failed to delete destination from backend:', err);
    }
    setTrips((prev) =>
      prev.map((t) =>
        String(t.id) === String(activeTrip.id)
          ? { ...t, destinations: t.destinations.filter((d) => d.id !== destId) }
          : t,
      ),
    );
  };

  // =========================================================================
  // PHASE 2: Aggregate World Tracker Data & Markers
  // =========================================================================
  const allDestinationsWithTrip = useMemo(() => {
    return trips.flatMap((t) =>
      (t.destinations || [])
        .filter(
          (d) =>
            d.latitude !== null &&
            d.latitude !== undefined &&
            d.longitude !== null &&
            d.longitude !== undefined &&
            !isNaN(Number(d.latitude)) &&
            !isNaN(Number(d.longitude)),
        )
        .map((d) => {
          const isVisited = t.status === 'completed';
          return {
            destination: {
              ...d,
              latitude: Number(d.latitude),
              longitude: Number(d.longitude),
            },
            trip: t,
            isVisited,
          };
        }),
    );
  }, [trips]);

  // Synchronized with Dashboard's Countries Explored stat logic
  const countriesExploredCount = useMemo(() => {
    const tripCountries = trips.flatMap((t) => t.countries || []);
    const destCountries = allDestinationsWithTrip
      .map((item) => {
        const parts = item.destination.location_name.split(',').map((p) => p.trim());
        return parts.length > 1 ? parts[parts.length - 1] : null;
      })
      .filter((c): c is string => typeof c === 'string' && !/\d/.test(c) && c.length > 2);

    return Array.from(new Set([...tripCountries, ...destCountries])).length;
  }, [trips, allDestinationsWithTrip]);

  const visitedDestinationsCount = useMemo(
    () => allDestinationsWithTrip.filter((item) => item.isVisited).length,
    [allDestinationsWithTrip],
  );

  const upcomingDestinationsCount = useMemo(
    () => allDestinationsWithTrip.filter((item) => !item.isVisited).length,
    [allDestinationsWithTrip],
  );

  // Filtered World Tracker Items
  const filteredWorldItems = useMemo(() => {
    return allDestinationsWithTrip.filter((item) => {
      if (worldFilter === 'visited' && !item.isVisited) return false;
      if (worldFilter === 'upcoming' && item.isVisited) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.destination.location_name.toLowerCase().includes(q);
        const matchesTrip = item.trip.name.toLowerCase().includes(q);
        return matchesName || matchesTrip;
      }
      return true;
    });
  }, [allDestinationsWithTrip, worldFilter, searchQuery]);

  // Mapbox Globe Markers: Derived dynamically based on current mode
  const globeMarkers = useMemo<MarkerData[]>(() => {
    if (activeViewMode === 'world-tracker') {
      // In World Tracker mode, show aggregate pins across all trips with visited/upcoming distinction
      return filteredWorldItems.map((item) => {
        const dateStr =
          item.trip.startDate && item.trip.endDate
            ? `${formatDateOnly(item.trip.startDate)} - ${formatDateOnly(item.trip.endDate)}`
            : '';

        return {
          id: String(item.destination.id),
          lat: Number(item.destination.latitude),
          lng: Number(item.destination.longitude),
          title: item.destination.location_name,
          color: item.isVisited ? '#10b981' : '#e9724c',
          tripName: item.trip.name,
          tripDates: dateStr,
          status: item.isVisited ? 'completed' : 'upcoming',
          thumbnailUrl:
            item.trip.cover_photo ||
            getMapboxStaticThumb(
              Number(item.destination.longitude),
              Number(item.destination.latitude),
              200,
              160,
              9,
              'outdoors-v12',
            ),
        };
      });
    }

    // In My Trips mode:
    if (activeTrip) {
      // When a trip is selected, show only that trip's destinations
      const dateStr =
        activeTrip.startDate && activeTrip.endDate
          ? `${formatDateOnly(activeTrip.startDate)} - ${formatDateOnly(activeTrip.endDate)}`
          : '';

      return (activeTrip.destinations || [])
        .filter(
          (d) =>
            d.latitude !== null &&
            d.latitude !== undefined &&
            d.longitude !== null &&
            d.longitude !== undefined &&
            !isNaN(Number(d.latitude)) &&
            !isNaN(Number(d.longitude)),
        )
        .map((d) => ({
          id: String(d.id),
          lat: Number(d.latitude),
          lng: Number(d.longitude),
          title: d.location_name,
          color: activeTrip.status === 'completed' ? '#10b981' : '#e9724c',
          tripName: activeTrip.name,
          tripDates: dateStr,
          status: activeTrip.status === 'completed' ? 'completed' : 'upcoming',
          thumbnailUrl:
            activeTrip.cover_photo ||
            getMapboxStaticThumb(
              Number(d.longitude),
              Number(d.latitude),
              200,
              160,
              9,
              'outdoors-v12',
            ),
        }));
    }

    // When viewing trip list without active selection, show all trip destinations
    return allDestinationsWithTrip.map((item) => ({
      id: String(item.destination.id),
      lat: Number(item.destination.latitude),
      lng: Number(item.destination.longitude),
      title: item.destination.location_name,
      color: item.isVisited ? '#10b981' : '#e9724c',
      tripName: item.trip.name,
      tripDates: `${formatDateOnly(item.trip.startDate)} - ${formatDateOnly(item.trip.endDate)}`,
      status: item.isVisited ? 'completed' : 'upcoming',
      thumbnailUrl:
        item.trip.cover_photo ||
        getMapboxStaticThumb(
          Number(item.destination.longitude),
          Number(item.destination.latitude),
          200,
          160,
          9,
          'outdoors-v12',
        ),
    }));
  }, [activeViewMode, filteredWorldItems, activeTrip, allDestinationsWithTrip]);

  const handleMarkerSelect = useCallback(
    (markerId: string) => {
      setActiveMarkerId(markerId);
      const found = allDestinationsWithTrip.find(
        (item) => String(item.destination.id) === String(markerId),
      );
      if (found) {
        setSelectedDestinationItem(found);
        setIsDetailDrawerOpen(true);
        setFocusView([
          Number(found.destination.longitude),
          Number(found.destination.latitude),
        ]);
      }
    },
    [allDestinationsWithTrip],
  );

  // Filtered trips list for My Trips overview
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [trips, searchQuery]);

  return (
    <div className="map-page-wrapper">
      <div className="map-container-card">
        {/* Left Sidebar Pane */}
        <div className="map-sidebar-pane">
          <div className="map-sidebar-scroll-content">
            {/* Top Mode Switcher: My Trips vs World Tracker */}
            {!isAddPlaceView && (
              <div className="map-view-mode-tabs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveViewMode('my-trips');
                  }}
                  className={`map-view-mode-btn ${
                    activeViewMode === 'my-trips' ? 'active' : ''
                  }`}
                >
                  <MapPin size={15} />
                  <span>My Trips</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveViewMode('world-tracker');
                    setActiveTripId(null);
                  }}
                  className={`map-view-mode-btn ${
                    activeViewMode === 'world-tracker' ? 'active' : ''
                  }`}
                >
                  <Globe size={15} />
                  <span>World Tracker</span>
                </button>
              </div>
            )}

            {/* View State A: Add New Place Form */}
            {isAddPlaceView ? (
              <div className="flex flex-col h-full pr-1">
                <div className="flex items-center justify-between mb-4 border-b border-stone-200 pb-3">
                  <button
                    onClick={() => {
                      setIsAddPlaceView(false);
                      setGeocodeError('');
                    }}
                    className="text-stone-700 text-sm font-semibold flex items-center gap-1 hover:text-stone-900 cursor-pointer"
                  >
                    <ArrowLeft size={16} /> Cancel
                  </button>
                  <h3 className="text-base font-bold text-stone-900">
                    Add Place to {activeTrip?.name}
                  </h3>
                  <div className="w-12" />
                </div>

                {/* Sub-mode Toggle: Search Autocomplete vs Manual Input */}
                <div className="flex justify-center mb-4">
                  <div className="inline-flex bg-stone-100 p-1 rounded-full border border-stone-200">
                    <button
                      type="button"
                      onClick={() => setAddPlaceMode('search')}
                      className={`px-6 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        addPlaceMode === 'search'
                          ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                          : 'text-stone-500'
                      }`}
                    >
                      Search Location
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddPlaceMode('manual')}
                      className={`px-6 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        addPlaceMode === 'manual'
                          ? 'bg-white text-stone-900 shadow-sm border border-stone-200'
                          : 'text-stone-500'
                      }`}
                    >
                      Add Manually
                    </button>
                  </div>
                </div>

                {geocodeError && (
                  <div className="p-3 mb-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                    {geocodeError}
                  </div>
                )}

                {addPlaceMode === 'search' ? (
                  <div className="flex flex-col gap-3 py-1">
                    <div className="relative">
                      <img
                        src={magnifierIcon}
                        alt=""
                        className="w-4 h-4 opacity-50 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                      />
                      <input
                        type="text"
                        className="modal-input-gradient pl-11"
                        placeholder="Search landmark, city, or address..."
                        value={placeSearchInput}
                        onChange={(e) => {
                          setPlaceSearchInput(e.target.value);
                          setSelectedFeature(null);
                        }}
                      />
                      {isSearchingGeocode && (
                        <Loader2
                          size={16}
                          className="animate-spin text-stone-400 absolute right-4 top-1/2 -translate-y-1/2"
                        />
                      )}
                    </div>

                    {/* Autocomplete Suggestions */}
                    {suggestionsToShow.length > 0 && (
                      <div className="geocode-suggestions-list">
                        {suggestionsToShow.map((feat) => (
                          <button
                            key={feat.id}
                            type="button"
                            className="geocode-suggestion-item"
                            onClick={() => {
                              setSelectedFeature(feat);
                              setPlaceSearchInput(feat.place_name);
                              setPlaceSuggestions([]);
                            }}
                          >
                            <span className="font-semibold block text-stone-900 text-sm">
                              {feat.text}
                            </span>
                            <span className="text-xs text-stone-500 block truncate">
                              {feat.place_name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {selectedFeature && (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col gap-2 mt-2">
                        <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
                          <CheckCircle2 size={16} className="text-emerald-600" />
                          <span>Location Selected:</span>
                        </div>
                        <p className="text-sm text-stone-800 font-bold">
                          {selectedFeature.text}
                        </p>
                        <p className="text-xs text-stone-600">
                          {selectedFeature.place_name}
                        </p>
                        <p className="text-[11px] font-mono text-stone-500">
                          Coords: {selectedFeature.center[1].toFixed(5)},{' '}
                          {selectedFeature.center[0].toFixed(5)}
                        </p>
                        <button
                          type="button"
                          onClick={handleAddSearchPlace}
                          disabled={isGeocoding}
                          className="btn-start-planning-modal mt-2"
                        >
                          {isGeocoding ? 'Saving place...' : 'Add to Trip'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <form
                    onSubmit={handleAddManualPlace}
                    className="flex flex-col gap-3 pb-8"
                  >
                    <div>
                      <label htmlFor="manual-place-name" className="modal-label">
                        PLACE NAME *
                      </label>
                      <input
                        id="manual-place-name"
                        type="text"
                        required
                        className="modal-input-gradient"
                        placeholder="e.g. Louvre Museum"
                        value={placeName}
                        onChange={(e) => setPlaceName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="manual-place-address" className="modal-label">
                        ADDRESS / LOCATION
                      </label>
                      <input
                        id="manual-place-address"
                        type="text"
                        className="modal-input-gradient"
                        placeholder="e.g. Rue de Rivoli"
                        value={placeAddress}
                        onChange={(e) => setPlaceAddress(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="manual-place-city" className="modal-label">
                          CITY
                        </label>
                        <input
                          id="manual-place-city"
                          type="text"
                          className="modal-input-gradient"
                          placeholder="e.g. Paris"
                          value={placeCity}
                          onChange={(e) => setPlaceCity(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="manual-place-country" className="modal-label">
                          COUNTRY
                        </label>
                        <input
                          id="manual-place-country"
                          type="text"
                          className="modal-input-gradient"
                          placeholder="e.g. France"
                          value={placeCountry}
                          onChange={(e) => setPlaceCountry(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-center mt-3">
                      <button
                        type="submit"
                        disabled={isGeocoding}
                        className="btn-start-planning-modal flex items-center justify-center gap-2"
                      >
                        {isGeocoding ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Resolving Coordinates...</span>
                          </>
                        ) : (
                          'Geocode & Add Place'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : activeViewMode === 'world-tracker' ? (
              /* ============================================================= */
              /* View State B: World Tracker (Aggregate Stippl View)           */
              /* ============================================================= */
              <div className="flex flex-col gap-4">
                {/* World Stats Card */}
                <div className="world-tracker-stats-card">
                  <div className="world-tracker-stat-item">
                    <span className="world-tracker-stat-val text-amber-600">
                      {countriesExploredCount}
                    </span>
                    <span className="world-tracker-stat-lbl">Countries</span>
                  </div>
                  <div className="world-tracker-stat-item">
                    <span className="world-tracker-stat-val text-emerald-600">
                      {visitedDestinationsCount}
                    </span>
                    <span className="world-tracker-stat-lbl">Visited</span>
                  </div>
                  <div className="world-tracker-stat-item">
                    <span className="world-tracker-stat-val text-stone-800">
                      {upcomingDestinationsCount}
                    </span>
                    <span className="world-tracker-stat-lbl">Upcoming</span>
                  </div>
                </div>

                {/* Legend Bar */}
                <div className="map-legend-bar">
                  <div className="flex items-center gap-1.5">
                    <span className="map-legend-dot visited" />
                    <span className="text-stone-700">Visited Places</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="map-legend-dot upcoming" />
                    <span className="text-stone-700">Upcoming Itineraries</span>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="map-category-tabs">
                  <button
                    type="button"
                    onClick={() => setWorldFilter('all')}
                    className={`map-tab-pill ${worldFilter === 'all' ? 'active' : ''}`}
                  >
                    All ({allDestinationsWithTrip.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorldFilter('visited')}
                    className={`map-tab-pill ${worldFilter === 'visited' ? 'active' : ''}`}
                  >
                    Visited ({visitedDestinationsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorldFilter('upcoming')}
                    className={`map-tab-pill ${worldFilter === 'upcoming' ? 'active' : ''}`}
                  >
                    Upcoming ({upcomingDestinationsCount})
                  </button>
                </div>

                {/* Search Bar */}
                <div className="map-search-box">
                  <img src={magnifierIcon} alt="" className="w-5 h-5 opacity-50" />
                  <input
                    type="text"
                    className="w-full bg-transparent outline-none text-sm font-medium text-stone-800 placeholder-stone-400"
                    placeholder="Search place or trip..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Aggregate Destination Cards */}
                {filteredWorldItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-stone-500">
                    <Globe size={32} className="text-stone-300 mb-2" />
                    <p className="font-semibold text-sm">No destinations found</p>
                    <p className="text-xs text-stone-400 mt-1">
                      Add destinations to your trips to plot them across the globe!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {filteredWorldItems.map((item) => {
                      const isActive = activeMarkerId === String(item.destination.id);

                      return (
                        <button
                          type="button"
                          key={`world-${item.destination.id}`}
                          onClick={() => {
                            setActiveMarkerId(String(item.destination.id));
                            setFocusView([
                              Number(item.destination.longitude),
                              Number(item.destination.latitude),
                            ]);
                          }}
                          className={`map-place-card text-left w-full cursor-pointer transition-all ${
                            isActive ? 'ring-2 ring-amber-500 bg-amber-50/20' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-stone-900 text-sm">
                                {item.destination.location_name}
                              </h4>
                              <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1">
                                <span>{item.trip.name}</span>
                                {item.trip.startDate && (
                                  <>
                                    <span>•</span>
                                    <span>{formatDateOnly(item.trip.startDate)}</span>
                                  </>
                                )}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                item.isVisited
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {item.isVisited ? 'Visited' : 'Upcoming'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
                            <span>
                              {Number(item.destination.latitude).toFixed(4)},{' '}
                              {Number(item.destination.longitude).toFixed(4)}
                            </span>
                            <span className="flex items-center gap-1 text-stone-600 font-sans hover:text-stone-900">
                              <Navigation size={11} /> Fly to Pin
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : !activeTrip ? (
              /* ============================================================= */
              /* View State C: My Trips Overview List                          */
              /* ============================================================= */
              <div className="flex flex-col gap-3">
                <div className="map-search-box">
                  <img src={magnifierIcon} alt="" className="w-5 h-5 opacity-50" />
                  <input
                    type="text"
                    className="w-full bg-transparent outline-none text-sm font-medium text-stone-800 placeholder-stone-400"
                    placeholder="Search trips..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {loading ? (
                  <div className="flex items-center justify-center p-12 text-stone-400">
                    <Loader2 size={24} className="animate-spin" />
                  </div>
                ) : error ? (
                  <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                    {error}
                  </div>
                ) : filteredTrips.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-stone-500">
                    <p className="font-semibold text-sm">No trips found</p>
                    <p className="text-xs text-stone-400 mt-1">
                      Create your first trip using the button below.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 mt-1">
                    {filteredTrips.map((trip) => {
                      const dateRange =
                        trip.startDate && trip.endDate
                          ? `${formatDateOnly(trip.startDate)} - ${formatDateOnly(
                              trip.endDate,
                            )}`
                          : 'No dates set';

                      const placeCount = trip.destinations?.length || 0;

                      return (
                        <button
                          type="button"
                          key={trip.id}
                          className="map-list-item-row text-left w-full hover:bg-stone-50 transition-colors"
                          onClick={() => {
                            setActiveTripId(trip.id);
                            // If the trip has destinations, focus on the first one
                            if (trip.destinations && trip.destinations.length > 0) {
                              setFocusView([
                                Number(trip.destinations[0].longitude),
                                Number(trip.destinations[0].latitude),
                              ]);
                              setActiveMarkerId(String(trip.destinations[0].id));
                            }
                          }}
                        >
                          <div className="map-list-item-title">
                            <span>{trip.name}</span>
                            <span className="text-stone-400 text-sm font-normal">›</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="map-list-date-badge">{dateRange}</span>
                            <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                              {placeCount} {placeCount === 1 ? 'place' : 'places'}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                trip.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {trip.status || 'planning'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* ============================================================= */
              /* View State D: Selected Trip Destinations                      */
              /* ============================================================= */
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setActiveTripId(null);
                        setActiveMarkerId(null);
                      }}
                      className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-700 font-bold hover:bg-stone-200 transition-colors cursor-pointer"
                    >
                      ‹
                    </button>
                    <div>
                      <h2 className="text-xl font-bold text-stone-900">
                        {activeTrip.name}
                      </h2>
                      <span className="map-list-date-badge mt-0.5">
                        {activeTrip.startDate && activeTrip.endDate
                          ? `${formatDateOnly(activeTrip.startDate)} - ${formatDateOnly(
                              activeTrip.endDate,
                            )}`
                          : 'No dates set'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsAddPlaceView(true);
                      setGeocodeError('');
                    }}
                    className="btn-lakbye-gradient text-xs py-2 px-4 cursor-pointer"
                  >
                    + Add Place
                  </button>
                </div>

                {/* Destinations List */}
                {!activeTrip.destinations || activeTrip.destinations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center my-4">
                    <MapPin size={32} className="text-stone-300 mb-2" />
                    <p className="font-bold text-stone-800 mb-1">
                      No places in this trip yet
                    </p>
                    <p className="text-xs text-stone-500 mb-3">
                      Add your first destination to place markers on the globe!
                    </p>
                    <button
                      onClick={() => setIsAddPlaceView(true)}
                      className="btn-lakbye-gradient text-xs py-2 px-4 cursor-pointer"
                    >
                      + Add First Place
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {activeTrip.destinations.map((dest) => {
                      const isActive = activeMarkerId === String(dest.id);

                      return (
                        <div
                          key={dest.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleMarkerSelect(String(dest.id))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleMarkerSelect(String(dest.id));
                            }
                          }}
                          className={`map-place-card transition-all cursor-pointer ${
                            isActive ? 'ring-2 ring-amber-500 bg-amber-50/20' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-stone-900 text-base">
                                {dest.location_name}
                              </h4>
                              <p className="text-[11px] font-mono text-stone-400 mt-1">
                                {dest.latitude.toFixed(4)}, {dest.longitude.toFixed(4)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title="Fly to location"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkerSelect(String(dest.id));
                                }}
                                className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors"
                              >
                                <Navigation size={15} />
                              </button>
                              <button
                                type="button"
                                title="Delete place"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDestination(dest.id);
                                }}
                                className="p-1.5 text-red-400 hover:text-red-700 transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                          <div>
                            <span className="place-badge badge-destinations">
                              Destination
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Action: Create Trip (opens CreateTripModal) */}
          {!activeTrip && !isAddPlaceView && activeViewMode === 'my-trips' && (
            <button
              type="button"
              onClick={() => setIsCreateTripModalOpen(true)}
              className="map-new-list-btn"
            >
              <Plus size={18} className="font-bold" />
              <span>Create Trip</span>
            </button>
          )}
        </div>

        {/* Right Globe View Panel */}
        <div className="map-globe-view-panel relative">
          <GlobeMap
            markers={globeMarkers}
            activeMarkerId={activeMarkerId}
            focusView={focusView}
            onMarkerClick={handleMarkerSelect}
          />

          {/* Destination Detail Drawer (Section 6) */}
          {isDetailDrawerOpen && selectedDestinationItem && (
            <div
              className="map-destination-drawer"
              role="dialog"
              aria-label="Destination Details"
            >
              <div className="map-destination-drawer-hero">
                <img
                  src={
                    selectedDestinationItem.trip.cover_photo ||
                    getMapboxStaticThumb(
                      selectedDestinationItem.destination.longitude,
                      selectedDestinationItem.destination.latitude,
                      400,
                      240,
                      10,
                      'outdoors-v12',
                    )
                  }
                  alt={selectedDestinationItem.destination.location_name}
                />
                <div className="map-destination-drawer-hero-overlay" />
                <button
                  type="button"
                  className="map-destination-drawer-close"
                  onClick={() => {
                    setIsDetailDrawerOpen(false);
                    setActiveMarkerId(null);
                  }}
                  aria-label="Close destination details"
                >
                  <X size={16} />
                </button>
                <span
                  className={`map-destination-drawer-badge ${
                    selectedDestinationItem.isVisited
                      ? 'bg-emerald-500/90 text-white'
                      : 'bg-amber-500/90 text-white'
                  }`}
                >
                  {selectedDestinationItem.isVisited
                    ? 'Visited Place'
                    : 'Upcoming Destination'}
                </span>
              </div>

              <div className="map-destination-drawer-content">
                <div>
                  <h3 className="map-destination-drawer-title">
                    {selectedDestinationItem.destination.location_name}
                  </h3>
                  <div className="map-destination-drawer-coords mt-2">
                    <MapPin size={13} className="text-amber-600" />
                    <span>
                      {Number(selectedDestinationItem.destination.latitude).toFixed(4)}
                      °,{' '}
                      {Number(selectedDestinationItem.destination.longitude).toFixed(4)}°
                    </span>
                  </div>
                </div>

                <div className="map-destination-drawer-trip-card">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                    Part of Trip
                  </div>
                  <div className="font-bold text-stone-900 text-sm">
                    {selectedDestinationItem.trip.name}
                  </div>
                  {selectedDestinationItem.trip.startDate &&
                    selectedDestinationItem.trip.endDate && (
                      <div className="text-xs text-stone-500 mt-0.5">
                        {formatDateOnly(selectedDestinationItem.trip.startDate)} -{' '}
                        {formatDateOnly(selectedDestinationItem.trip.endDate)}
                      </div>
                    )}
                </div>

                <div className="map-destination-drawer-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setFocusView([
                        Number(selectedDestinationItem.destination.longitude),
                        Number(selectedDestinationItem.destination.latitude),
                      ]);
                    }}
                    className="flex-1 py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Navigation size={14} /> Center Map
                  </button>
                  <Link
                    to={`/trip/${selectedDestinationItem.trip.id}`}
                    className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors text-center"
                  >
                    <span>Workspace</span> <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real Trip Creation Modal */}
      <CreateTripModal
        isOpen={isCreateTripModalOpen}
        onClose={() => setIsCreateTripModalOpen(false)}
        onTripCreated={fetchTripsAndDestinations}
      />
    </div>
  );
}
