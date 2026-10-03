import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  MapPin,
} from 'lucide-react';
import routeIcon from '../assets/route.png';
import dayByDayIcon from '../assets/day-by-day.png';
import magnifierIcon from '../assets/magnifier.png';
import { CountryAutocomplete, GlobeMap } from '../components';
import { getCoordinatesForName } from '../constants/coordinates';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';
import type { Trip } from '../types/trip';
import { tripsApi } from '../services/api';
import { mergeTripWithExtras, saveTripExtras } from '../lib/tripExtras';
import { formatUserDateRange } from '../lib/formatters';
import {
  searchDestinations,
  type DestinationPlace,
  ACCOMMODATION_OPTIONS,
  ACTIVITIES_OPTIONS,
  TRANSPORTATION_OPTIONS,
} from '../lib/tripAutoFill';
import axios from 'axios';
import {
  getCountryId,
  getCountryName,
  getCountryOption,
  mergeCountryRoute,
  normalizeCountryRoute,
  orderDestinationsByCountryRoute,
  removeCountryFromRoute,
  type CountryId,
  type CountryRouteEntry,
} from '../lib/countries';

export interface WorkspaceDestination {
  id: string;
  name: string;
  countryId: CountryId;
  country?: string;
  order: number;
  days?: number;
  nights?: number;
  accommodation?: string;
  activities?: string;
  transportation?: string;
  latitude?: number;
  longitude?: number;
}

const workspaceGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns:
    '36px minmax(110px, 1.3fr) 46px minmax(105px, 1.1fr) minmax(100px, 1fr) minmax(105px, 1.1fr) 26px',
  gap: '0.4rem',
  alignItems: 'center',
};

export default function TripWorkspace() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'route' | 'day'>('route');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [destinations, setDestinations] = useState<WorkspaceDestination[]>([]);
  const [countryRoute, setCountryRoute] = useState<CountryRouteEntry[]>([]);
  const [isAddCountryModalOpen, setIsAddCountryModalOpen] = useState(false);
  const [newCountrySelection, setNewCountrySelection] = useState<CountryId[]>([]);
  const [newDestInput, setNewDestInput] = useState('');
  const [selectedCountryForNew, setSelectedCountryForNew] = useState<CountryId>('');
  const [activeDestinationId, setActiveDestinationId] = useState<string | null>(null);
  const [collapsedCountries, setCollapsedCountries] = useState<Record<string, boolean>>(
    {},
  );
  const [customInputActive, setCustomInputActive] = useState<Record<string, boolean>>({});
  const [userCustomOptions, setUserCustomOptions] = useState<Record<string, string[]>>({
    accommodation: [],
    activities: [],
    transportation: [],
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const dayScheduleListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'day' && dayScheduleListRef.current) {
      dayScheduleListRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const { inCountrySuggestions, outOfCountrySuggestions } = useMemo(() => {
    if (!newDestInput.trim() || newDestInput.trim().length < 1) {
      return { inCountrySuggestions: [], outOfCountrySuggestions: [] };
    }
    const all = searchDestinations(newDestInput.trim(), 12);
    const inC: DestinationPlace[] = [];
    const outC: DestinationPlace[] = [];
    all.forEach((p) => {
      const pCountryId = getCountryId(p.country);
      if (pCountryId === selectedCountryForNew) {
        inC.push(p);
      } else {
        outC.push(p);
      }
    });
    return { inCountrySuggestions: inC.slice(0, 8), outOfCountrySuggestions: outC };
  }, [newDestInput, selectedCountryForNew]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user || !tripId) return;
    let cancelled = false;

    const fetchTrip = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const apiTrip = await tripsApi.getTrip(tripId);
        if (cancelled) return;

        const merged = mergeTripWithExtras(apiTrip);
        setTrip(merged);

        // Migrate the legacy workspace country list into the canonical route.
        let legacyWorkspaceCountries: string[] = [];
        const savedCountriesStr = localStorage.getItem(
          `lakbye_workspace_countries_${tripId}`,
        );
        if (savedCountriesStr) {
          try {
            const parsedC = JSON.parse(savedCountriesStr);
            if (Array.isArray(parsedC)) legacyWorkspaceCountries = parsedC;
          } catch {
            // ignore
          }
        }

        // Check if saved destinations exist in localStorage for this trip
        const savedDestStr = localStorage.getItem(`lakbye_workspace_dests_${tripId}`);
        let initialDests: WorkspaceDestination[] = [];
        if (savedDestStr) {
          try {
            const parsed = JSON.parse(savedDestStr);
            if (Array.isArray(parsed)) {
              initialDests = parsed
                .filter((d: any) => {
                  // Filter out legacy dummy country-as-destination rows
                  const isLegacyDummy =
                    d.name === d.country &&
                    (d.accommodation === 'Selected Hotel' ||
                      d.accommodation === 'TBD Hotel');
                  return !isLegacyDummy;
                })
                .map((d: any, index: number) => {
                  const country =
                    getCountryOption(d.countryId || d.country || d.name) ||
                    getCountryOption('Philippines')!;
                  return {
                    ...d,
                    countryId: country.id,
                    country: country.name,
                    order: Number.isFinite(Number(d.order)) ? Number(d.order) : index,
                    days: Number(d.days) || Number(d.nights) || 1,
                    accommodation:
                      d.accommodation === 'Selected Hotel' ||
                      d.accommodation === 'TBD Hotel'
                        ? ''
                        : d.accommodation || '',
                    activities:
                      d.activities === 'Sightseeing & Culture' ||
                      d.activities === 'Local Exploration'
                        ? ''
                        : d.activities || '',
                    transportation:
                      d.transportation === 'Flight / Express Train' ||
                      d.transportation === 'Train / Taxi'
                        ? ''
                        : d.transportation || '',
                  };
                });
            }
          } catch {
            initialDests = [];
          }
        }

        const initialRoute = mergeCountryRoute(merged.countryRoute, [
          ...legacyWorkspaceCountries,
          ...initialDests.map((destination) => destination.countryId),
        ]);
        const normalizedRoute = initialRoute.length
          ? initialRoute
          : normalizeCountryRoute(['Philippines']);
        const orderedDestinations = orderDestinationsByCountryRoute(
          initialDests,
          normalizedRoute,
        ).map((destination, order) => ({ ...destination, order }));

        setCountryRoute(normalizedRoute);
        setDestinations(orderedDestinations);
        saveTripExtras(tripId, { countryRoute: normalizedRoute });
        localStorage.removeItem(`lakbye_workspace_countries_${tripId}`);
        setSelectedCountryForNew(normalizedRoute[0].countryId);
        if (orderedDestinations.length > 0) {
          setActiveDestinationId(orderedDestinations[0].id);
        }
      } catch (err) {
        if (cancelled) return;
        if (
          axios.isAxiosError(err) &&
          (err.response?.status === 403 || err.response?.status === 404)
        ) {
          setNotFound(true);
        } else {
          setNotFound(true);
          console.error('Failed to fetch trip:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrip();
    return () => {
      cancelled = true;
    };
  }, [user, tripId]);

  const persistDestinations = (
    updated: WorkspaceDestination[],
    routeOverride: CountryRouteEntry[] = countryRoute,
  ) => {
    if (!tripId) return;
    const normalizedRoute = mergeCountryRoute(
      routeOverride,
      updated.map((destination) => destination.countryId || destination.country || ''),
    );
    const ordered = orderDestinationsByCountryRoute(updated, normalizedRoute).map(
      (destination, order) => ({ ...destination, order }),
    );
    localStorage.setItem(`lakbye_workspace_dests_${tripId}`, JSON.stringify(ordered));
    saveTripExtras(tripId, { countryRoute: normalizedRoute });
  };

  // Date picker duration in calendar days (inclusive start to end)
  const tripDurationDays = useMemo(() => {
    if (trip?.startDate && trip?.endDate) {
      const s = new Date(trip.startDate);
      const e = new Date(trip.endDate);
      s.setHours(0, 0, 0, 0);
      e.setHours(0, 0, 0, 0);
      const diffMs = e.getTime() - s.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 0) return diffDays;
    }
    if (trip?.nights) return trip.nights + 1;
    return 1;
  }, [trip?.startDate, trip?.endDate, trip?.nights]);

  // Total allocated days across all destinations
  const totalAllocatedDays = useMemo(() => {
    return destinations.reduce(
      (sum, d) => sum + (Number(d.days) || Number(d.nights) || 1),
      0,
    );
  }, [destinations]);

  // The configured route order is the single source of truth for countries.
  const availableCountries = useMemo(() => {
    return countryRoute.length ? countryRoute : normalizeCountryRoute(['Philippines']);
  }, [countryRoute]);

  const toggleCountryCollapse = (countryId: CountryId) => {
    setCollapsedCountries((prev) => ({
      ...prev,
      [countryId]: !prev[countryId],
    }));
  };

  const handleAddCountry = (e: React.FormEvent) => {
    e.preventDefault();
    const countryId = newCountrySelection[0];
    if (!countryId) return;

    const updatedRoute = mergeCountryRoute(countryRoute, [countryId]);
    setCountryRoute(updatedRoute);
    if (tripId) saveTripExtras(tripId, { countryRoute: updatedRoute });
    setSelectedCountryForNew(countryId);
    setNewCountrySelection([]);
    setIsAddCountryModalOpen(false);

    // Ensure this country is expanded
    setCollapsedCountries((prev) => ({ ...prev, [countryId]: false }));

    // Focus destination search bar
    setTimeout(() => {
      const el = document.getElementById('workspace-dest-input');
      if (el) el.focus();
    }, 100);
  };

  const handleRemoveCountry = (countryIdToRemove: CountryId, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const countryName = getCountryName(countryIdToRemove);

    const itemsInCountry = destinations.filter(
      (destination) => destination.countryId === countryIdToRemove,
    );

    if (itemsInCountry.length > 0) {
      const confirmed = window.confirm(
        `Are you sure you want to remove "${countryName}" and its ${itemsInCountry.length} destination(s)?`,
      );
      if (!confirmed) return;
    }

    // 1. Remove destinations belonging to this country
    const updatedDests = destinations.filter(
      (destination) => destination.countryId !== countryIdToRemove,
    );
    const updatedRoute = removeCountryFromRoute(countryRoute, countryIdToRemove);
    setDestinations(updatedDests);
    setCountryRoute(updatedRoute);
    persistDestinations(updatedDests, updatedRoute);

    if (trip) {
      setTrip({
        ...trip,
        countries: updatedRoute.map((country) => country.name),
        countryRoute: updatedRoute,
      });
    }

    if (selectedCountryForNew === countryIdToRemove) {
      setSelectedCountryForNew(updatedRoute[0]?.countryId || 'philippines');
    }

    // 6. Clean up collapsed state
    setCollapsedCountries((prev) => {
      const next = { ...prev };
      delete next[countryIdToRemove];
      return next;
    });
  };

  const handleSelectSuggestion = (place: DestinationPlace) => {
    const country = getCountryOption(place.country);
    if (!country) return;
    setNewDestInput(place.name);
    setSelectedCountryForNew(country.id);
    setCountryRoute((current) => mergeCountryRoute(current, [country.id]));
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setCollapsedCountries((prev) => ({ ...prev, [country.id]: false }));
  };

  const handleAddDestination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDestInput.trim()) return;

    setShowSuggestions(false);
    setHighlightedIndex(-1);

    const name = newDestInput.trim();
    const finalCountryId =
      getCountryId(selectedCountryForNew) ||
      availableCountries[0]?.countryId ||
      'philippines';
    const finalCountry = getCountryName(finalCountryId) || 'Philippines';

    // Prevent adding if all days from date picker are already allocated
    if (totalAllocatedDays >= tripDurationDays && destinations.length > 0) {
      alert(
        `All ${tripDurationDays} days from your trip date picker are already allocated. Please reduce days on an existing destination before adding another.`,
      );
      return;
    }

    const coords = getCoordinatesForName(name) || getCoordinatesForName(finalCountry);

    // Initial days allocation respects trip date picker remaining days
    const remainingDays = Math.max(1, tripDurationDays - totalAllocatedDays);
    const initialDays = Math.min(1, remainingDays);

    const newDest: WorkspaceDestination = {
      id: `dest-custom-${Date.now()}`,
      name,
      countryId: finalCountryId,
      country: finalCountry,
      order: destinations.length,
      days: initialDays,
      accommodation: '',
      activities: '',
      transportation: '',
      latitude: coords ? coords[1] : undefined,
      longitude: coords ? coords[0] : undefined,
    };

    const updatedRoute = mergeCountryRoute(countryRoute, [finalCountryId]);
    const updated = orderDestinationsByCountryRoute(
      [...destinations, newDest],
      updatedRoute,
    ).map((destination, order) => ({ ...destination, order }));
    setCountryRoute(updatedRoute);
    setDestinations(updated);
    persistDestinations(updated, updatedRoute);
    setActiveDestinationId(newDest.id);
    setNewDestInput('');
  };

  const handleUpdateDestination = (
    id: string,
    field: keyof WorkspaceDestination,
    value: string | number,
  ) => {
    setDestinations((prev) => {
      let finalValue = value;
      if (field === 'days') {
        const otherDays = prev.reduce((sum, d) => {
          if (d.id === id) return sum;
          return sum + (Number(d.days) || 1);
        }, 0);
        const maxForThis = Math.max(1, tripDurationDays - otherDays);
        finalValue = Math.min(Math.max(1, Number(value) || 1), maxForThis);
      }
      const updated = prev.map((dest) =>
        dest.id === id ? { ...dest, [field]: finalValue } : dest,
      );
      persistDestinations(updated);
      return updated;
    });
  };

  const handleDeleteDestination = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = destinations.filter((d) => d.id !== id);
    setDestinations(updated);
    persistDestinations(updated);
    if (activeDestinationId === id)
      setActiveDestinationId(updated.length > 0 ? updated[0].id : null);
  };

  const moveDestination = (id: string, direction: 'up' | 'down') => {
    const idx = destinations.findIndex((d) => d.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= destinations.length) return;

    const next = [...destinations];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    const reordered = next.map((destination, order) => ({ ...destination, order }));
    setDestinations(reordered);
    persistDestinations(reordered);
  };

  const renderFieldSelector = (
    destId: string,
    field: 'accommodation' | 'activities' | 'transportation',
    currentValue: string | undefined,
    baseOptions: string[],
    placeholder: string,
  ) => {
    const isInputActive = customInputActive[`${destId}-${field}`];
    const extraOptions = userCustomOptions[field] || [];
    const allOptions = Array.from(new Set([...baseOptions, ...extraOptions]));
    const isCustomValue = Boolean(currentValue && !allOptions.includes(currentValue));

    if (isInputActive) {
      return (
        <div
          className="flex items-center gap-1 w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={currentValue || ''}
            onChange={(e) => handleUpdateDestination(destId, field, e.target.value)}
            onBlur={() => {
              if (currentValue && currentValue.trim()) {
                const val = currentValue.trim();
                setUserCustomOptions((prev) => ({
                  ...prev,
                  [field]: Array.from(new Set([...(prev[field] || []), val])),
                }));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (currentValue && currentValue.trim()) {
                  const val = currentValue.trim();
                  setUserCustomOptions((prev) => ({
                    ...prev,
                    [field]: Array.from(new Set([...(prev[field] || []), val])),
                  }));
                }
                setCustomInputActive((prev) => ({
                  ...prev,
                  [`${destId}-${field}`]: false,
                }));
              } else if (e.key === 'Escape') {
                setCustomInputActive((prev) => ({
                  ...prev,
                  [`${destId}-${field}`]: false,
                }));
              }
            }}
            placeholder={`Type custom ${field}...`}
            className="flex-1 min-w-0 px-2 py-1 text-xs text-slate-800 bg-white border border-amber-400 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all shadow-xs"
          />
          <button
            type="button"
            onClick={() => {
              if (currentValue && currentValue.trim()) {
                const val = currentValue.trim();
                setUserCustomOptions((prev) => ({
                  ...prev,
                  [field]: Array.from(new Set([...(prev[field] || []), val])),
                }));
              }
              setCustomInputActive((prev) => ({
                ...prev,
                [`${destId}-${field}`]: false,
              }));
            }}
            className="shrink-0 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded border border-slate-200 hover:border-slate-300 transition-colors"
            title="Switch back to dropdown list"
            aria-label="Switch back to dropdown list"
          >
            <ChevronDown size={13} />
          </button>
        </div>
      );
    }

    return (
      <div className="w-full min-w-0" onClick={(e) => e.stopPropagation()}>
        <select
          value={currentValue || ''}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '__CUSTOM__') {
              setCustomInputActive((prev) => ({
                ...prev,
                [`${destId}-${field}`]: true,
              }));
            } else {
              handleUpdateDestination(destId, field, val);
            }
          }}
          className="w-full min-w-0 h-8 px-2 py-1 text-xs text-[#2F1B0C] bg-white hover:bg-slate-50 border border-[rgba(72,42,19,0.14)] hover:border-slate-300 rounded-lg focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all cursor-pointer truncate shadow-xs font-normal"
          title={currentValue || placeholder}
        >
          <option value="">{currentValue ? '-- Clear / None --' : placeholder}</option>
          {isCustomValue && <option value={currentValue}>{currentValue} (Custom)</option>}
          {allOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value="__CUSTOM__" className="text-amber-700 font-semibold">
            + Enter custom...
          </option>
        </select>
      </div>
    );
  };

  const globeMarkers = destinations
    .map((dest, index) => {
      const coords =
        dest.longitude != null && dest.latitude != null
          ? ([dest.longitude, dest.latitude] as [number, number])
          : getCoordinatesForName(dest.name) ||
            (dest.country ? getCoordinatesForName(dest.country) : null);

      if (!coords) return null;

      return {
        id: dest.id,
        lng: coords[0],
        lat: coords[1],
        title: `${index + 1}. ${dest.name} (${dest.country || ''})`,
      };
    })
    .filter(
      (m): m is { id: string; lng: number; lat: number; title: string } => m !== null,
    );

  const orderedDestinations = useMemo(
    () => orderDestinationsByCountryRoute(destinations, countryRoute),
    [destinations, countryRoute],
  );

  // Group destinations strictly by the persisted country route order.
  const groupedByCountry = useMemo(() => {
    const groups: {
      countryId: CountryId;
      country: string;
      totalDays: number;
      items: WorkspaceDestination[];
    }[] = [];
    const countryMap = new Map<string, WorkspaceDestination[]>();

    availableCountries.forEach((country) => {
      countryMap.set(country.countryId, []);
    });

    orderedDestinations.forEach((destination) => {
      if (!countryMap.has(destination.countryId)) {
        countryMap.set(destination.countryId, []);
      }
      countryMap.get(destination.countryId)!.push(destination);
    });

    countryMap.forEach((items, countryId) => {
      const totalDays = items.reduce(
        (sum, item) => sum + (Number(item.days) || Number(item.nights) || 1),
        0,
      );
      groups.push({
        countryId,
        country: getCountryName(countryId),
        totalDays,
        items,
      });
    });

    return groups;
  }, [orderedDestinations, availableCountries]);

  // Day-by-day itinerary schedule breakdown
  const daySchedule = useMemo(() => {
    const schedule: {
      dayNumber: number;
      destination: WorkspaceDestination | null;
      dayOfDestination?: number;
    }[] = [];
    let currentDay = 1;

    orderedDestinations.forEach((dest) => {
      const destDays = Math.max(1, Number(dest.days) || Number(dest.nights) || 1);
      for (let d = 1; d <= destDays && currentDay <= tripDurationDays; d++) {
        schedule.push({
          dayNumber: currentDay,
          destination: dest,
          dayOfDestination: d,
        });
        currentDay++;
      }
    });

    // Fill in remaining unallocated days up to tripDurationDays
    while (currentDay <= tripDurationDays) {
      schedule.push({
        dayNumber: currentDay,
        destination: null,
      });
      currentDay++;
    }

    return schedule;
  }, [orderedDestinations, tripDurationDays]);

  if (loading) {
    return (
      <div className="workspace-page">
        <div className="workspace-main-card">Loading itinerary workspace...</div>
      </div>
    );
  }

  if (!trip || notFound) {
    return (
      <div
        className="workspace-page"
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          display: 'flex',
          minHeight: '100vh',
        }}
      >
        <div className="dashboard-empty-state" style={{ margin: 'auto' }}>
          <h3 className="dashboard-empty-title">Trip not found</h3>
          <p className="dashboard-empty-text">
            We couldn't find the trip you're looking for. It might have been deleted or
            belongs to another user.
          </p>
          <div className="dashboard-empty-actions">
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              className="btn-create-trip dashboard-btn-create"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <header className="workspace-header-card animate-slide-up">
        <div>
          <h1 className="workspace-trip-title">{trip.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-semibold text-stone-600">
              {tripDurationDays} Total {tripDurationDays === 1 ? 'Day' : 'Days'}
            </span>
            <span className="text-xs text-stone-300">•</span>
            <span
              className={`text-xs font-semibold ${
                totalAllocatedDays === tripDurationDays
                  ? 'text-emerald-700'
                  : totalAllocatedDays < tripDurationDays
                    ? 'text-amber-800'
                    : 'text-rose-700'
              }`}
            >
              {totalAllocatedDays} of {tripDurationDays} Days Planned
              {tripDurationDays - totalAllocatedDays > 0
                ? ` (${tripDurationDays - totalAllocatedDays} remaining)`
                : ''}
            </span>
            {availableCountries.length > 0 && (
              <>
                <span className="text-xs text-stone-300">•</span>
                <span className="text-xs text-slate-500">
                  {availableCountries
                    .map((country) => country.name)
                    .filter(Boolean)
                    .join(' • ')}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="workspace-header-actions">
          <div className="workspace-pill-date">
            {formatUserDateRange(trip.startDate, trip.endDate)}
          </div>
        </div>
      </header>

      <div className="workspace-main-card">
        <div className="workspace-itinerary-zone animate-slide-up delay-150">
          <div className="workspace-tabs-container flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <button
                className={`pill-tab ${activeTab === 'route' ? 'pill-tab--active' : ''}`}
                onClick={() => setActiveTab('route')}
              >
                <img src={routeIcon} alt="" className="workspace-tab-icon" />
                Route Planner
              </button>
              <button
                className={`pill-tab ${activeTab === 'day' ? 'pill-tab--active' : ''}`}
                onClick={() => setActiveTab('day')}
              >
                <img src={dayByDayIcon} alt="" className="workspace-tab-icon" />
                Day by Day
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsAddCountryModalOpen(true)}
              className="pill-tab"
              style={{
                backgroundColor: '#FFF7DB',
                border: '1px solid rgba(72, 42, 19, 0.14)',
                color: '#8C4D00',
                gap: '6px',
                marginLeft: 'auto',
                fontWeight: 600,
                fontSize: '11px',
              }}
              title="Add another country to this trip"
            >
              <Plus size={14} />
              <span>Add Country</span>
            </button>
          </div>

          {activeTab === 'route' ? (
            <div className="workspace-itinerary-table flex-1 min-h-0 overflow-y-auto pr-1">
              {/* Table Column Headers */}
              <div
                className="workspace-table-header-row bg-[#FFFBEB]/40 border-b border-[rgba(72,42,19,0.18)] py-2 px-3"
                style={workspaceGridStyle}
              >
                <div className="text-center font-semibold text-[#74675D] text-[9.5px]">
                  Order
                </div>
                <div className="workspace-col-destination font-semibold text-[#74675D] text-[9.5px]">
                  City / Destination
                </div>
                <div className="workspace-col-nights text-center font-semibold text-[#74675D] text-[9.5px]">
                  Days
                </div>
                <div className="workspace-col-accommodation font-semibold text-[#74675D] text-[9.5px]">
                  Accommodation
                </div>
                <div className="workspace-col-activities font-semibold text-[#74675D] text-[9.5px]">
                  Activities
                </div>
                <div className="workspace-col-transportation font-semibold text-[#74675D] text-[9.5px]">
                  Transportation
                </div>
                <div className="workspace-col-actions" />
              </div>

              {/* Grouped by Country Hierarchy */}
              <div className="workspace-destination-rows">
                {groupedByCountry.map((group) => {
                  const isCollapsed = collapsedCountries[group.countryId];
                  return (
                    <div
                      key={group.countryId}
                      className="border-b border-slate-200/80 last:border-b-0"
                    >
                      {/* Top-Level Country Row */}
                      <div className="flex items-center justify-between px-3 py-2 bg-[#FFFBEB] border-t border-[rgba(72,42,19,0.14)] transition-colors">
                        <div
                          className="flex items-center gap-2 cursor-pointer select-none"
                          onClick={() => toggleCountryCollapse(group.countryId)}
                        >
                          {isCollapsed ? (
                            <ChevronRight size={16} className="text-[#8C4D00]" />
                          ) : (
                            <ChevronDown size={16} className="text-[#8C4D00]" />
                          )}
                          <span className="font-bold text-[#2F1B0C] text-[13px]">
                            {group.country}
                          </span>
                          <span className="text-[10px] font-semibold text-[#E9724C]">
                            ({group.totalDays} {group.totalDays === 1 ? 'day' : 'days'})
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleRemoveCountry(group.countryId, e)}
                          className="text-[9.5px] text-[#74675D] hover:text-[#C5283D] px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer font-medium"
                          title={`Remove ${group.country} from trip`}
                          aria-label={`Remove ${group.country}`}
                        >
                          <X size={12} />
                          <span>Remove Country</span>
                        </button>
                      </div>

                      {/* Nested Cities / Destinations Rows */}
                      {!isCollapsed && (
                        <div className="bg-white">
                          {group.items.length === 0 ? (
                            <div className="mx-3 my-2.5 p-4 bg-[#FEFCF9] border border-dashed border-[rgba(72,42,19,0.18)] rounded-xl flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#FFF5C2] flex items-center justify-center shrink-0">
                                  <MapPin size={16} className="text-[#994D00]" />
                                </div>
                                <div>
                                  <div className="font-semibold text-xs text-[#2F1B0C]">
                                    No destinations in {group.country} yet
                                  </div>
                                  <div className="text-[10px] text-[#74675D]">
                                    Use the search bar below to add a city, island, or
                                    place to {group.country}.
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCountryForNew(group.countryId);
                                  const el =
                                    document.getElementById('workspace-dest-input');
                                  if (el) el.focus();
                                }}
                                className="px-3 py-1.5 bg-[#FFF7DB] hover:bg-[#ffefc2] border border-[rgba(72,42,19,0.14)] text-[#8C4D00] text-[10px] font-semibold rounded-full transition-colors shrink-0 cursor-pointer"
                              >
                                + Add to {group.country}
                              </button>
                            </div>
                          ) : (
                            group.items.map((dest) => {
                              const globalIndex = destinations.findIndex(
                                (d) => d.id === dest.id,
                              );
                              const otherDays = destinations.reduce(
                                (sum, d) =>
                                  d.id === dest.id ? sum : sum + (Number(d.days) || 1),
                                0,
                              );
                              const maxDaysForThisDest = Math.max(
                                1,
                                tripDurationDays - otherDays,
                              );

                              return (
                                <div
                                  key={dest.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => setActiveDestinationId(dest.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setActiveDestinationId(dest.id);
                                    }
                                  }}
                                  className={`workspace-destination-row pl-2 pr-2 py-2 border-b border-[rgba(72,42,19,0.08)] relative ${activeDestinationId === dest.id ? 'active bg-[#FFF9F9]' : 'bg-white hover:bg-[#FFF9F9]/50'}`}
                                  style={{
                                    ...workspaceGridStyle,
                                    borderLeft:
                                      activeDestinationId === dest.id
                                        ? '3px solid #C5283D'
                                        : '3px solid transparent',
                                  }}
                                >
                                  {/* Ordering Up/Down buttons */}
                                  <div className="flex items-center justify-center gap-0.5">
                                    <button
                                      type="button"
                                      disabled={globalIndex === 0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveDestination(dest.id, 'up');
                                      }}
                                      className="p-0.5 rounded text-stone-400 hover:text-stone-700 disabled:opacity-20 disabled:cursor-not-allowed"
                                      title="Move Up"
                                    >
                                      <ArrowUp size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={globalIndex === destinations.length - 1}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveDestination(dest.id, 'down');
                                      }}
                                      className="p-0.5 rounded text-stone-400 hover:text-stone-700 disabled:opacity-20 disabled:cursor-not-allowed"
                                      title="Move Down"
                                    >
                                      <ArrowDown size={12} />
                                    </button>
                                  </div>

                                  {/* Destination Name Input */}
                                  <div className="workspace-col-destination flex items-center gap-1.5 min-w-0">
                                    <input
                                      type="text"
                                      value={dest.name || ''}
                                      onChange={(e) =>
                                        handleUpdateDestination(
                                          dest.id,
                                          'name',
                                          e.target.value,
                                        )
                                      }
                                      placeholder="City name"
                                      className="w-full text-xs font-bold text-[#2F1B0C] bg-transparent border-0 outline-none truncate"
                                      title={dest.name}
                                    />
                                  </div>

                                  {/* Days Input (Bounded by Date Picker duration) */}
                                  <div className="workspace-col-nights flex justify-center">
                                    <input
                                      type="number"
                                      min="1"
                                      max={maxDaysForThisDest}
                                      value={dest.days || 1}
                                      onChange={(e) =>
                                        handleUpdateDestination(
                                          dest.id,
                                          'days',
                                          parseInt(e.target.value) || 1,
                                        )
                                      }
                                      className="w-10 text-center font-bold text-xs text-[#2F1B0C] bg-stone-50 border border-[rgba(72,42,19,0.14)] rounded py-1"
                                      title={`Days (Max ${maxDaysForThisDest} based on trip date picker)`}
                                    />
                                  </div>

                                  {/* Accommodation Dropdown with Custom Add Button */}
                                  <div className="workspace-col-accommodation">
                                    {renderFieldSelector(
                                      dest.id,
                                      'accommodation',
                                      dest.accommodation,
                                      ACCOMMODATION_OPTIONS,
                                      'Select accom...',
                                    )}
                                  </div>

                                  {/* Activities Dropdown with Custom Add Button */}
                                  <div className="workspace-col-activities">
                                    {renderFieldSelector(
                                      dest.id,
                                      'activities',
                                      dest.activities,
                                      ACTIVITIES_OPTIONS,
                                      'Select activity...',
                                    )}
                                  </div>

                                  {/* Transportation Dropdown with Custom Add Button */}
                                  <div className="workspace-col-transportation">
                                    {renderFieldSelector(
                                      dest.id,
                                      'transportation',
                                      dest.transportation,
                                      TRANSPORTATION_OPTIONS,
                                      'Select trans...',
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="workspace-col-actions flex justify-center">
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteDestination(dest.id, e)}
                                      className="text-stone-400 hover:text-[#C5283D] text-xs font-bold p-1 cursor-pointer transition-colors"
                                      title="Remove Destination"
                                      aria-label="Remove Destination"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Destination / City Form with Country Selector */}
              <form
                onSubmit={handleAddDestination}
                className="workspace-add-destination-row mt-3 p-2 bg-white border border-[rgba(72,42,19,0.14)] rounded-xl flex flex-nowrap items-center gap-2 overflow-visible shadow-xs"
              >
                <div className="flex items-center gap-1.5 pl-1 shrink-0">
                  <span className="text-[9.5px] font-semibold text-[#255F85]">
                    Country:
                  </span>
                  <select
                    value={selectedCountryForNew}
                    onChange={(e) => setSelectedCountryForNew(e.target.value)}
                    className="text-xs font-medium bg-white border border-[rgba(72,42,19,0.14)] rounded-lg px-2.5 py-1 text-[#2F1B0C] outline-none cursor-pointer"
                  >
                    {availableCountries.map((country) => (
                      <option key={country.countryId} value={country.countryId}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  ref={searchContainerRef}
                  className="flex-1 relative flex items-center gap-2 min-w-36 border-l border-[rgba(72,42,19,0.14)] pl-2.5"
                >
                  <img
                    src={magnifierIcon}
                    alt="Search"
                    className="w-3.5 h-3.5 opacity-60 shrink-0"
                  />
                  <input
                    id="workspace-dest-input"
                    type="text"
                    value={newDestInput}
                    onChange={(e) => {
                      setNewDestInput(e.target.value);
                      setShowSuggestions(true);
                      setHighlightedIndex(-1);
                    }}
                    onFocus={() => {
                      if (newDestInput.trim()) setShowSuggestions(true);
                    }}
                    onKeyDown={(e) => {
                      if (!showSuggestions || inCountrySuggestions.length === 0) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setHighlightedIndex((prev) =>
                          prev < inCountrySuggestions.length - 1 ? prev + 1 : 0,
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHighlightedIndex((prev) =>
                          prev > 0 ? prev - 1 : inCountrySuggestions.length - 1,
                        );
                      } else if (e.key === 'Enter') {
                        if (
                          highlightedIndex >= 0 &&
                          inCountrySuggestions[highlightedIndex]
                        ) {
                          e.preventDefault();
                          handleSelectSuggestion(inCountrySuggestions[highlightedIndex]);
                        }
                      } else if (e.key === 'Escape') {
                        setShowSuggestions(false);
                      }
                    }}
                    placeholder={`Search city or destination in ${getCountryName(selectedCountryForNew) || 'selected country'}`}
                    className="workspace-add-input flex-1 bg-transparent text-xs text-[#2F1B0C] outline-none placeholder:text-[#74675D]/60"
                    autoComplete="off"
                  />

                  {showSuggestions && newDestInput.trim() && (
                    <div
                      className="workspace-dest-dropdown min-w-80 max-w-sm overflow-x-hidden absolute left-0 top-full mt-1 bg-white rounded-xl shadow-[0_12px_32px_rgba(47,27,12,0.15)] border border-[rgba(72,42,19,0.16)] z-50 p-1"
                      role="listbox"
                    >
                      {inCountrySuggestions.length > 0 ? (
                        inCountrySuggestions.map((place, idx) => (
                          <div
                            key={`${place.name}-${place.country}`}
                            role="option"
                            tabIndex={0}
                            aria-selected={idx === highlightedIndex}
                            className={`workspace-dest-option flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-amber-50 ${idx === highlightedIndex ? 'highlighted bg-amber-50' : ''}`}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectSuggestion(place);
                            }}
                            onClick={() => handleSelectSuggestion(place)}
                          >
                            <div className="workspace-dest-option-main flex items-center gap-2">
                              <MapPin size={13} className="text-[#255F85]" />
                              <span className="workspace-dest-option-name text-xs font-semibold text-[#2F1B0C]">
                                {place.name}
                              </span>
                              <span className="workspace-dest-option-country text-[10px] text-[#74675D]">
                                {place.country}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-[#C5283D]">
                              Add +
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center">
                          <div className="text-xs font-semibold text-[#2F1B0C] mb-1">
                            No places found in {getCountryName(selectedCountryForNew)}
                          </div>
                          {outOfCountrySuggestions.length > 0 && (
                            <>
                              <div className="text-[10px] text-[#74675D] mb-1">
                                {outOfCountrySuggestions[0].name} is in{' '}
                                {outOfCountrySuggestions[0].country}, so it is not shown
                                while {getCountryName(selectedCountryForNew)} is selected.
                              </div>
                              <button
                                type="button"
                                className="text-[10px] font-semibold text-brand-blue cursor-pointer hover:underline mb-2 bg-transparent border-0 p-0 inline-block text-left"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  const matchCountry = getCountryId(
                                    outOfCountrySuggestions[0].country,
                                  );
                                  if (matchCountry) {
                                    setSelectedCountryForNew(matchCountry);
                                    setCountryRoute((current) =>
                                      mergeCountryRoute(current, [matchCountry]),
                                    );
                                  }
                                }}
                              >
                                Change the selected country to search elsewhere.
                              </button>
                            </>
                          )}
                          <div className="text-[9px] text-[#74675D] border-t border-[rgba(72,42,19,0.1)] pt-1.5 mt-1.5">
                            Destinations are limited to the currently selected country.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0 ml-auto pr-1">
                  <span className="text-[9.5px] font-semibold text-[#994F00] whitespace-nowrap shrink-0">
                    {tripDurationDays - totalAllocatedDays > 0
                      ? `${tripDurationDays - totalAllocatedDays} of ${tripDurationDays} Days Available`
                      : `All ${tripDurationDays} Days Allocated`}
                  </span>

                  <button
                    type="submit"
                    disabled={
                      totalAllocatedDays >= tripDurationDays && destinations.length > 0
                    }
                    className="workspace-add-btn text-[10px] font-bold bg-[#C5283D] hover:bg-[#a82234] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-full shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="Add Destination"
                  >
                    Add +
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Day by Day View */
            <div className="workspace-day-schedule flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden p-1">
              <div className="flex items-center justify-between px-1 mb-1 shrink-0">
                <span className="text-[10px] font-semibold tracking-wider text-[#74675D] uppercase">
                  {(
                    availableCountries
                      .map((c) => c.name)
                      .filter(Boolean)
                      .join(' + ') || 'TRIP'
                  ).toUpperCase()}{' '}
                  · DAYS 1–{tripDurationDays}
                </span>
                <span className="text-[10px] font-semibold text-[#E9724C]">
                  {daySchedule.filter((d) => d.destination !== null).length} planned ·{' '}
                  {daySchedule.filter((d) => d.destination === null).length} unplanned
                </span>
              </div>

              <div
                ref={dayScheduleListRef}
                className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-y-auto pr-1"
              >
                {daySchedule.map((item) => {
                  if (item.destination) {
                    return (
                      <div
                        key={`day-${item.dayNumber}`}
                        className="flex items-center h-16 bg-white rounded-xl border border-[rgba(72,42,19,0.14)] shadow-xs overflow-hidden shrink-0"
                      >
                        {/* Day Badge matching Figma #FFF5C2 and #994D00 */}
                        <div className="w-[54px] self-stretch bg-[#FFF5C2] flex flex-col items-center justify-center shrink-0">
                          <span className="text-[8px] font-bold text-[#994D00] uppercase tracking-wide">
                            DAY
                          </span>
                          <span className="text-lg font-bold text-[#994D00] leading-tight">
                            {item.dayNumber}
                          </span>
                        </div>

                        {/* Destination info */}
                        <div className="w-40 pl-3.5 pr-2 shrink-0">
                          <div className="font-bold text-[13px] text-[#2F1B0C] truncate">
                            {item.destination.name}
                          </div>
                          <div className="text-[9.5px] text-[#74675D] truncate">
                            {item.destination.country ||
                              getCountryName(item.destination.countryId)}{' '}
                            · Day {item.dayOfDestination} of {item.destination.days || 1}
                          </div>
                        </div>

                        {/* Columns: Stay, Activity, Transit */}
                        <div className="flex-1 grid grid-cols-3 gap-2 px-2 text-left">
                          <div className="min-w-0">
                            <span className="block text-[8px] font-bold text-[#74675D] uppercase">
                              Stay
                            </span>
                            <span
                              className="block text-[11px] font-medium text-[#2F1B0C] truncate"
                              title={item.destination.accommodation || '—'}
                            >
                              {item.destination.accommodation || '—'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[8px] font-bold text-[#74675D] uppercase">
                              Activity
                            </span>
                            <span
                              className="block text-[11px] font-medium text-[#2F1B0C] truncate"
                              title={item.destination.activities || '—'}
                            >
                              {item.destination.activities || '—'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[8px] font-bold text-[#74675D] uppercase">
                              Transit
                            </span>
                            <span
                              className="block text-[11px] font-medium text-[#2F1B0C] truncate"
                              title={item.destination.transportation || '—'}
                            >
                              {item.destination.transportation || '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  /* Unplanned / Free Day */
                  return (
                    <div
                      key={`day-${item.dayNumber}`}
                      className="flex items-center min-h-[52px] bg-[#FEFCF9] rounded-xl border border-[rgba(72,42,19,0.14)] shadow-xs overflow-hidden shrink-0"
                    >
                      <div className="w-[54px] self-stretch min-h-[52px] bg-[#FFF5C2] flex flex-col items-center justify-center shrink-0">
                        <span className="text-[8px] font-bold text-[#994D00] uppercase tracking-wide">
                          DAY
                        </span>
                        <span className="text-base font-bold text-[#994D00] leading-tight">
                          {item.dayNumber}
                        </span>
                      </div>
                      <div className="flex-1 px-3 text-[9.5px] text-[#8091AB] font-normal">
                        Unplanned / Free Day — add a destination to schedule this day.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('route');
                          setTimeout(() => {
                            const el = document.getElementById('workspace-dest-input');
                            if (el) el.focus();
                          }, 100);
                        }}
                        className="mr-3 px-4 py-1.5 bg-[#F2F7FC] border border-[rgba(72,42,19,0.14)] text-[#255F85] text-[9.5px] font-semibold rounded-full hover:bg-sky-50 transition-colors shrink-0 whitespace-nowrap cursor-pointer"
                      >
                        Add destination
                      </button>
                    </div>
                  );
                })}

                {daySchedule.length > 8 && (
                  <div className="text-center text-[9px] text-[#74675D] py-2">
                    Scroll to continue to Days 9–{daySchedule.length}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="workspace-vertical-divider"></div>

        <div className="workspace-map-zone animate-slide-up delay-300">
          <GlobeMap
            markers={globeMarkers}
            activeMarkerId={activeDestinationId}
            onMarkerClick={(id) => setActiveDestinationId(id)}
            showRouteLines={activeTab === 'route'}
          />
        </div>
      </div>

      {/* Add Country Modal */}
      {isAddCountryModalOpen && (
        <div className="staff-modal-backdrop" style={{ zIndex: 100 }}>
          <button
            type="button"
            className="staff-modal-backdrop-dismiss"
            aria-label="Close modal overlay"
            onClick={() => setIsAddCountryModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-country-modal-title"
            className="staff-modal-card"
            style={{ maxWidth: '420px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2 id="add-country-modal-title" className="staff-modal-title">
                Add Country
              </h2>
              <button
                type="button"
                onClick={() => setIsAddCountryModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#7B6F68',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
              Add a new country section to your route planner. You can then add cities and
              destinations under it.
            </p>

            {availableCountries.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#8A7A70',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '8px',
                  }}
                >
                  Current Countries in this Trip
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {availableCountries.map((country) => (
                    <span
                      key={country.countryId}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#FEF3C7',
                        color: '#92400E',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <span>{country.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCountry(country.countryId)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#B45309',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0',
                        }}
                        title={`Remove ${country.name}`}
                        aria-label={`Remove ${country.name}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleAddCountry}>
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#401C02',
                    marginBottom: '6px',
                  }}
                >
                  Country Name
                </div>
                <CountryAutocomplete
                  value={newCountrySelection}
                  onChange={(countryIds) => setNewCountrySelection(countryIds.slice(-1))}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddCountryModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #D9D9D9',
                    background: '#FFFFFF',
                    color: '#401C02',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newCountrySelection.length === 0}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#E9724C',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Add Country
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
