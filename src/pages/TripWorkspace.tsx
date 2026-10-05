import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  MapPin,
  Trash2,
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

function generateCustomDestId(): string {
  return `dest-custom-${Date.now()}`;
}

export default function TripWorkspace() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const tabQuery = searchParams.get('tab');
  const activeTab = tabQuery === 'day' ? 'day' : 'route';

  const handleTabChange = (tab: 'route' | 'day') => {
    if (tab === 'day') {
      setSearchParams({ tab: 'day' });
    } else {
      setSearchParams({});
    }
  };

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isMobileAddDestOpen, setIsMobileAddDestOpen] = useState(false);
  const [mobileAddDestCountryId, setMobileAddDestCountryId] = useState<CountryId>('');
  const [mobileDestName, setMobileDestName] = useState('');

  const getDayDateString = (dayNum: number) => {
    if (!trip?.startDate) return '';
    const d = new Date(trip.startDate);
    d.setDate(d.getDate() + (dayNum - 1));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleOpenAddDestForCountry = (countryId: CountryId) => {
    setMobileAddDestCountryId(countryId);
    setMobileDestName('');
    setIsMobileAddDestOpen(true);
  };

  const handleMobileAddDestination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileDestName.trim()) return;

    const name = mobileDestName.trim();
    const finalCountryId = mobileAddDestCountryId;
    const finalCountry = getCountryName(finalCountryId);
    if (!finalCountryId || !finalCountry) {
      setIsMobileAddDestOpen(false);
      setIsAddCountryModalOpen(true);
      return;
    }

    const coords = getCoordinatesForName(name) || getCoordinatesForName(finalCountry);
    const remainingDays = Math.max(1, tripDurationDays - totalAllocatedDays);
    const initialDays = Math.min(1, remainingDays);

    const newDest: WorkspaceDestination = {
      id: generateCustomDestId(),
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
    setIsMobileAddDestOpen(false);
    setMobileDestName('');
  };

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
                  const country = getCountryOption(d.countryId || d.country || d.name);
                  return {
                    ...d,
                    countryId: country?.id || '',
                    country: country?.name || d.country || '',
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
        const normalizedRoute = initialRoute;
        const orderedDestinations = orderDestinationsByCountryRoute(
          initialDests,
          normalizedRoute,
        ).map((destination, order) => ({ ...destination, order }));

        setCountryRoute(normalizedRoute);
        setDestinations(orderedDestinations);
        saveTripExtras(tripId, { countryRoute: normalizedRoute });
        localStorage.removeItem(`lakbye_workspace_countries_${tripId}`);
        setSelectedCountryForNew(normalizedRoute[0]?.countryId || '');
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
    return countryRoute;
  }, [countryRoute]);

  const toggleCountryCollapse = (countryId: CountryId) => {
    setCollapsedCountries((prev) => ({
      ...prev,
      [countryId]: !prev[countryId],
    }));
  };

  const handleAddCountry = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCountrySelection.length === 0) return;

    const updatedRoute = mergeCountryRoute(countryRoute, newCountrySelection);
    setCountryRoute(updatedRoute);
    if (tripId) saveTripExtras(tripId, { countryRoute: updatedRoute });
    setSelectedCountryForNew(newCountrySelection[0]);
    setNewCountrySelection([]);
    setIsAddCountryModalOpen(false);

    setCollapsedCountries((prev) => {
      const next = { ...prev };
      newCountrySelection.forEach((countryId) => {
        next[countryId] = false;
      });
      return next;
    });

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
      setSelectedCountryForNew(updatedRoute[0]?.countryId || '');
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
    const finalCountryId = getCountryId(selectedCountryForNew);
    const finalCountry = finalCountryId ? getCountryName(finalCountryId) : '';
    if (!finalCountryId || !finalCountry) {
      setIsAddCountryModalOpen(true);
      return;
    }

    const coords = getCoordinatesForName(name) || getCoordinatesForName(finalCountry);

    // Initial days allocation respects trip date picker remaining days
    const remainingDays = Math.max(1, tripDurationDays - totalAllocatedDays);
    const initialDays = Math.min(1, remainingDays);

    const newDest: WorkspaceDestination = {
      id: generateCustomDestId(),
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
        finalValue = value === '' ? '' : Math.max(1, Number(value) || 1);
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

      <div className="workspace-main-card hidden md:flex">
        <div className="workspace-itinerary-zone animate-slide-up delay-150">
          <div className="workspace-tabs-container flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <button
                className={`pill-tab ${activeTab === 'route' ? 'pill-tab--active' : ''}`}
                onClick={() => handleTabChange('route')}
              >
                <img src={routeIcon} alt="" className="workspace-tab-icon" />
                Route Planner
              </button>
              <button
                className={`pill-tab ${activeTab === 'day' ? 'pill-tab--active' : ''}`}
                onClick={() => handleTabChange('day')}
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
                {groupedByCountry.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-xl border border-dashed border-amber-200/80 my-3 flex flex-col items-center justify-center">
                    <span className="text-2xl mb-2">🌍</span>
                    <h4 className="font-bold text-stone-800 text-sm">
                      No countries in this route
                    </h4>
                    <p className="text-xs text-stone-500 mt-1 max-w-xs">
                      Add a country to start organizing your destinations, accommodations,
                      and activities.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddCountryModalOpen(true)}
                      className="btn-lakbye-gradient text-xs py-2 px-4 mt-3 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} /> + Add Country
                    </button>
                  </div>
                ) : (
                  groupedByCountry.map((group) => {
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
                                        value={dest.days ?? ''}
                                        onChange={(e) =>
                                          handleUpdateDestination(
                                            dest.id,
                                            'days',
                                            e.target.value === ''
                                              ? ''
                                              : Number.parseInt(e.target.value, 10),
                                          )
                                        }
                                        onBlur={(e) => {
                                          const parsed = Number.parseInt(
                                            e.currentTarget.value,
                                            10,
                                          );
                                          const validated = Number.isFinite(parsed)
                                            ? Math.max(
                                                1,
                                                Math.min(parsed, maxDaysForThisDest),
                                              )
                                            : 1;
                                          handleUpdateDestination(
                                            dest.id,
                                            'days',
                                            validated,
                                          );
                                        }}
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
                                        onClick={(e) =>
                                          handleDeleteDestination(dest.id, e)
                                        }
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
                  })
                )}
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
              <div className="flex items-center justify-between px-1 pt-1.5 pb-2 mb-1 shrink-0 border-b border-[rgba(72,42,19,0.08)]">
                <span className="text-[11px] font-bold tracking-wider text-[#5A381E] uppercase">
                  {(
                    availableCountries
                      .map((c) => c.name)
                      .filter(Boolean)
                      .join(' + ') || 'TRIP'
                  ).toUpperCase()}{' '}
                  · DAYS 1–{tripDurationDays}
                </span>
                <span className="text-[10.5px] font-semibold text-[#E9724C] tracking-tight">
                  {daySchedule.filter((d) => d.destination !== null).length} planned ·{' '}
                  {daySchedule.filter((d) => d.destination === null).length} unplanned
                </span>
              </div>

              <div
                ref={dayScheduleListRef}
                className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-y-auto pr-4"
              >
                {daySchedule.map((item) => {
                  if (item.destination) {
                    return (
                      <div
                        key={`day-${item.dayNumber}`}
                        className="workspace-planned-day-card flex items-center min-h-[76px] bg-white rounded-xl border border-[rgba(72,42,19,0.14)] shadow-xs overflow-hidden shrink-0 transition-shadow hover:shadow-sm"
                      >
                        {/* Day Badge matching Figma #FFF5C2 and #994D00 */}
                        <div className="w-[72px] self-stretch bg-[#FFF5C2] flex flex-col items-center justify-center shrink-0 border-r border-[rgba(72,42,19,0.06)] py-2 select-none">
                          <span className="text-[8.5px] font-bold text-[#994D00] uppercase tracking-wider">
                            DAY
                          </span>
                          <span className="text-xl font-bold text-[#994D00] leading-none mt-1">
                            {item.dayNumber}
                          </span>
                        </div>

                        {/* Content grid: Desktop 5-part layout (Destination 1.2fr | Stay 1fr | Activity 1.15fr | Transit 1fr) with 24px column gap */}
                        <div className="flex-1 min-w-0 px-4 py-3 flex flex-col lg:grid lg:grid-cols-[1.2fr_1fr_1.15fr_1fr] lg:gap-x-6 lg:items-center gap-y-2.5">
                          {/* Destination info */}
                          <div className="min-w-0 pr-1 flex flex-col justify-center">
                            <div
                              className="font-bold text-[13px] text-[#2F1B0C] leading-snug truncate"
                              title={item.destination.name}
                            >
                              {item.destination.name}
                            </div>
                            <div className="text-[10px] text-[#74675D] font-medium leading-normal mt-0.5 truncate">
                              {item.destination.country ||
                                getCountryName(item.destination.countryId)}{' '}
                              · Day {item.dayOfDestination} of{' '}
                              {item.destination.days || 1}
                            </div>
                          </div>

                          {/* Metadata: Stay, Activity, Transit (3-col on tablet, stacked on mobile, contents on desktop) */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 lg:contents gap-2 sm:gap-4 lg:gap-0">
                            {/* Stay */}
                            <div className="min-w-0 flex flex-col justify-center">
                              <span className="text-[8.5px] font-bold text-[#8C7E74] uppercase tracking-wider mb-1">
                                Stay
                              </span>
                              <span
                                className="text-[11px] font-semibold text-[#2F1B0C] leading-snug line-clamp-2 break-words"
                                title={item.destination.accommodation || '—'}
                              >
                                {item.destination.accommodation || '—'}
                              </span>
                            </div>

                            {/* Activity */}
                            <div className="min-w-0 flex flex-col justify-center">
                              <span className="text-[8.5px] font-bold text-[#8C7E74] uppercase tracking-wider mb-1">
                                Activity
                              </span>
                              <span
                                className="text-[11px] font-semibold text-[#2F1B0C] leading-snug line-clamp-2 break-words"
                                title={item.destination.activities || '—'}
                              >
                                {item.destination.activities || '—'}
                              </span>
                            </div>

                            {/* Transit */}
                            <div className="min-w-0 flex flex-col justify-center">
                              <span className="text-[8.5px] font-bold text-[#8C7E74] uppercase tracking-wider mb-1">
                                Transit
                              </span>
                              <span
                                className="text-[11px] font-semibold text-[#2F1B0C] leading-snug line-clamp-2 break-words"
                                title={item.destination.transportation || '—'}
                              >
                                {item.destination.transportation || '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  /* Unplanned / Free Day */
                  return (
                    <div
                      key={`day-${item.dayNumber}`}
                      className="workspace-unplanned-day-card flex items-stretch min-h-[58px] bg-[#FEFCF9] rounded-xl border border-[rgba(72,42,19,0.14)] shadow-xs overflow-hidden shrink-0"
                    >
                      <div className="w-[72px] self-stretch bg-[#FFF5C2] flex flex-col items-center justify-center shrink-0 border-r border-[rgba(72,42,19,0.06)] py-2 select-none">
                        <span className="text-[8.5px] font-bold text-[#994D00] uppercase tracking-wider">
                          DAY
                        </span>
                        <span className="text-xl font-bold text-[#994D00] leading-none mt-1">
                          {item.dayNumber}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pl-4 pr-6 py-2.5 flex flex-col sm:grid sm:grid-cols-[minmax(0,1fr)_auto] items-start sm:items-center gap-2 sm:gap-6">
                        <span className="text-[10px] text-[#8091AB] font-normal leading-normal">
                          Unplanned / Free Day — add a destination to schedule this day.
                        </span>
                        <div className="flex items-center justify-end w-full sm:w-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              handleTabChange('route');
                              setTimeout(() => {
                                const el =
                                  document.getElementById('workspace-dest-input');
                                if (el) el.focus();
                              }, 100);
                            }}
                            className="group inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-blue hover:text-[#1A4562] transition-colors shrink-0 whitespace-nowrap cursor-pointer py-1 focus:outline-none focus-visible:underline"
                          >
                            <Plus
                              size={13}
                              strokeWidth={2.5}
                              className="shrink-0 text-brand-blue group-hover:text-[#1A4562] transition-colors"
                            />
                            <span className="group-hover:underline">Add destination</span>
                          </button>
                        </div>
                      </div>
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

      {/* Approved Mobile Workspace (Figma 829:172 and 829:226) */}
      <div className="workspace-mobile-view md:hidden flex flex-col gap-3 px-[18px] py-4 pb-20 bg-[#F9F4EE]">
        {/* Route / Day Mode Selector Row (Figma: y: 88, h: 32/38 pills) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTabChange('route')}
              className={`w-[108px] h-[32px] rounded-[16px] font-['Poppins'] font-semibold text-[10px] transition-all flex items-center justify-center ${
                activeTab === 'route'
                  ? 'mobile-active-pill-btn'
                  : 'bg-white border border-[rgba(71,43,20,0.14)] text-[#2F1B0C]'
              }`}
            >
              Route Planner
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('day')}
              className={`w-[102px] h-[32px] rounded-[16px] font-['Poppins'] font-semibold text-[10px] transition-all flex items-center justify-center ${
                activeTab === 'day'
                  ? 'mobile-active-pill-btn'
                  : 'bg-white border border-[rgba(71,43,20,0.14)] text-[#2F1B0C]'
              }`}
            >
              Day by Day
            </button>
          </div>

          {activeTab === 'route' ? (
            <button
              type="button"
              onClick={() => setIsAddCountryModalOpen(true)}
              className="w-[122px] h-[38px] rounded-[19px] bg-white border border-[rgba(71,43,20,0.14)] font-['Poppins'] font-semibold text-[10px] text-[#2F1B0C] flex items-center justify-center gap-1 shrink-0 hover:bg-stone-50 transition-colors"
            >
              + Add Country
            </button>
          ) : (
            <span className="font-['Poppins'] font-semibold text-[10px] text-[#73665C] truncate text-right">
              {groupedByCountry[0]?.country || 'Spain'} · Days 1–{tripDurationDays}
            </span>
          )}
        </div>

        {/* Mode Content */}
        {activeTab === 'route' ? (
          /* Route Planner Mobile (Figma 829:172) */
          <div className="flex flex-col gap-3">
            {groupedByCountry.map((countryGroup) => (
              <div
                key={countryGroup.countryId}
                className="w-full bg-white rounded-[16px] p-[16px] border border-[rgba(71,43,20,0.14)] shadow-xs flex flex-col gap-3"
              >
                {/* Country Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-['Poppins'] font-bold text-[16px] text-[#2F1B0C]">
                      {countryGroup.country}
                    </h3>
                    {availableCountries.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveCountry(countryGroup.countryId, e)}
                        className="text-stone-400 hover:text-rose-600 p-1"
                        title={`Remove ${countryGroup.country}`}
                        aria-label={`Remove ${countryGroup.country}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <span className="font-['Poppins'] font-semibold text-[10px] text-[#E9724C]">
                    Days 1–{countryGroup.totalDays || tripDurationDays}
                  </span>
                </div>

                {/* Destination Cards */}
                {countryGroup.items.map((dest, idx) => (
                  <div
                    key={dest.id}
                    className="flex flex-col gap-2 pt-2 border-t border-stone-100 first:border-t-0 first:pt-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-['Poppins'] font-semibold text-[13px] text-[#2F1B0C]">
                        {dest.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-['Poppins'] font-semibold text-[10px] text-[#73665C]">
                          Day {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteDestination(dest.id, e)}
                          className="text-stone-400 hover:text-rose-600 p-1"
                          title={`Delete ${dest.name}`}
                          aria-label={`Delete ${dest.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Stay Field */}
                    <div className="flex flex-col">
                      <label
                        htmlFor={`mobile-stay-${dest.id}`}
                        className="font-['Poppins'] font-semibold text-[9px] text-[#73665C] mb-1"
                      >
                        Stay
                      </label>
                      <select
                        id={`mobile-stay-${dest.id}`}
                        value={dest.accommodation || ''}
                        onChange={(e) =>
                          handleUpdateDestination(
                            dest.id,
                            'accommodation',
                            e.target.value,
                          )
                        }
                        className="w-full h-[34px] bg-[#FCF9F6] border border-[rgba(71,43,20,0.08)] rounded-[9px] px-3 font-['Poppins'] font-normal text-[10px] text-[#2F1B0C] appearance-none focus:outline-none focus:border-stone-400"
                      >
                        <option value="">Select accommodation</option>
                        {ACCOMMODATION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                        {dest.accommodation &&
                          !ACCOMMODATION_OPTIONS.includes(dest.accommodation) && (
                            <option value={dest.accommodation}>
                              {dest.accommodation}
                            </option>
                          )}
                      </select>
                    </div>

                    {/* Activity Field */}
                    <div className="flex flex-col">
                      <label
                        htmlFor={`mobile-act-${dest.id}`}
                        className="font-['Poppins'] font-semibold text-[9px] text-[#73665C] mb-1"
                      >
                        Activity
                      </label>
                      <select
                        id={`mobile-act-${dest.id}`}
                        value={dest.activities || ''}
                        onChange={(e) =>
                          handleUpdateDestination(dest.id, 'activities', e.target.value)
                        }
                        className="w-full h-[34px] bg-[#FCF9F6] border border-[rgba(71,43,20,0.08)] rounded-[9px] px-3 font-['Poppins'] font-normal text-[10px] text-[#2F1B0C] appearance-none focus:outline-none focus:border-stone-400"
                      >
                        <option value="">Select activity</option>
                        {ACTIVITIES_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                        {dest.activities &&
                          !ACTIVITIES_OPTIONS.includes(dest.activities) && (
                            <option value={dest.activities}>{dest.activities}</option>
                          )}
                      </select>
                    </div>

                    {/* Transit Field */}
                    <div className="flex flex-col">
                      <label
                        htmlFor={`mobile-transit-${dest.id}`}
                        className="font-['Poppins'] font-semibold text-[9px] text-[#73665C] mb-1"
                      >
                        Transit
                      </label>
                      <select
                        id={`mobile-transit-${dest.id}`}
                        value={dest.transportation || ''}
                        onChange={(e) =>
                          handleUpdateDestination(
                            dest.id,
                            'transportation',
                            e.target.value,
                          )
                        }
                        className="w-full h-[34px] bg-[#FCF9F6] border border-[rgba(71,43,20,0.08)] rounded-[9px] px-3 font-['Poppins'] font-normal text-[10px] text-[#2F1B0C] appearance-none focus:outline-none focus:border-stone-400"
                      >
                        <option value="">Select transit</option>
                        {TRANSPORTATION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                        {dest.transportation &&
                          !TRANSPORTATION_OPTIONS.includes(dest.transportation) && (
                            <option value={dest.transportation}>
                              {dest.transportation}
                            </option>
                          )}
                      </select>
                    </div>
                  </div>
                ))}

                {/* + Add Destination Button (Figma: 38px height, 19px radius) */}
                <button
                  type="button"
                  onClick={() => handleOpenAddDestForCountry(countryGroup.countryId)}
                  className="w-full h-[38px] rounded-[19px] bg-white border border-[rgba(71,43,20,0.14)] font-['Poppins'] font-semibold text-[10px] text-[#2F1B0C] mt-1 shadow-xs hover:bg-stone-50 transition-colors text-center"
                >
                  + Add Destination
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Day by Day Mobile (Figma 829:226) */
          <div className="flex flex-col gap-3">
            {daySchedule.map((entry) =>
              entry.destination ? (
                /* Planned Day Card (Figma: 176px min-height, 44px badge) */
                <div
                  key={entry.dayNumber}
                  className="w-full bg-white rounded-[16px] p-[16px] border border-[rgba(71,43,20,0.14)] shadow-xs flex gap-[14px] items-start"
                >
                  {/* Badge */}
                  <div className="w-[44px] h-[44px] rounded-[12px] bg-[#FFC857] flex items-center justify-center font-['Poppins'] font-bold text-[14px] text-[#2F1B0C] shrink-0">
                    {entry.dayNumber}
                  </div>

                  {/* Details */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-['Poppins'] font-bold text-[14px] text-[#2F1B0C] truncate">
                        {entry.destination.name}
                      </span>
                      <span className="font-['Poppins'] font-normal text-[9px] text-[#73665C] shrink-0">
                        {getDayDateString(entry.dayNumber)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-1">
                      <div className="flex items-baseline">
                        <span className="w-[60px] font-['Poppins'] font-semibold text-[9px] text-[#73665C]">
                          Stay
                        </span>
                        <span className="font-['Poppins'] font-normal text-[10px] text-[#2F1B0C] truncate flex-1">
                          {entry.destination.accommodation || '—'}
                        </span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="w-[60px] font-['Poppins'] font-semibold text-[9px] text-[#73665C]">
                          Activity
                        </span>
                        <span className="font-['Poppins'] font-normal text-[10px] text-[#2F1B0C] truncate flex-1">
                          {entry.destination.activities || '—'}
                        </span>
                      </div>
                      <div className="flex items-baseline">
                        <span className="w-[60px] font-['Poppins'] font-semibold text-[9px] text-[#73665C]">
                          Transit
                        </span>
                        <span className="font-['Poppins'] font-normal text-[10px] text-[#2F1B0C] truncate flex-1">
                          {entry.destination.transportation || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Free Day Card (Figma: 94px height, 44px badge) */
                <div
                  key={entry.dayNumber}
                  className="w-full bg-white rounded-[16px] p-[16px] border border-[rgba(71,43,20,0.14)] shadow-xs flex gap-[14px] items-center"
                >
                  <div className="w-[44px] h-[44px] rounded-[12px] bg-[#FCF9F6] border border-[rgba(71,43,20,0.08)] flex items-center justify-center font-['Poppins'] font-bold text-[14px] text-[#2F1B0C] shrink-0">
                    {entry.dayNumber}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <span className="font-['Poppins'] font-semibold text-[12px] text-[#2F1B0C]">
                      Free day
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const countryId = availableCountries[0]?.countryId;
                        if (countryId) handleOpenAddDestForCountry(countryId);
                        else setIsAddCountryModalOpen(true);
                      }}
                      className="h-[34px] px-3.5 rounded-[17px] bg-white border border-[rgba(71,43,20,0.14)] font-['Poppins'] font-semibold text-[10px] text-[#2F1B0C] flex items-center gap-1.5 w-fit hover:bg-stone-50 transition-colors"
                    >
                      {availableCountries.length > 0
                        ? '+ Add destination'
                        : '+ Add Country'}
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        {/* Mobile Map Section (Figma 829:172 and 829:226: 220px map shell) */}
        <div className="flex flex-col gap-1.5 mt-1">
          <h3 className="font-['Poppins'] font-bold text-[14px] text-[#2F1B0C]">Map</h3>
          <div className="w-full h-[220px] rounded-[16px] overflow-hidden border border-[rgba(71,43,20,0.14)] shadow-xs relative bg-[#E0E8E5]">
            <GlobeMap
              markers={globeMarkers}
              activeMarkerId={activeDestinationId}
              onMarkerClick={(id) => setActiveDestinationId(id)}
              showRouteLines={activeTab === 'route'}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>

      {/* Mobile Add Destination Modal */}
      {isMobileAddDestOpen && (
        <div className="staff-modal-backdrop" style={{ zIndex: 100 }}>
          <button
            type="button"
            className="staff-modal-backdrop-dismiss"
            aria-label="Close modal overlay"
            onClick={() => setIsMobileAddDestOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-add-dest-title"
            className="staff-modal-card"
            style={{ maxWidth: '400px' }}
          >
            <div className="flex justify-between items-center mb-3">
              <h2 id="mobile-add-dest-title" className="staff-modal-title">
                Add Destination
              </h2>
              <button
                type="button"
                onClick={() => setIsMobileAddDestOpen(false)}
                className="text-stone-500 hover:text-stone-800 p-1"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleMobileAddDestination} className="flex flex-col gap-3">
              <div>
                <label
                  htmlFor="mobile-dest-country-select"
                  className="block text-xs font-semibold text-[#401C02] mb-1"
                >
                  Country
                </label>
                <select
                  id="mobile-dest-country-select"
                  value={mobileAddDestCountryId}
                  onChange={(e) => setMobileAddDestCountryId(e.target.value as CountryId)}
                  className="w-full border border-stone-300 rounded-lg p-2 text-xs font-medium text-[#2F1B0C] bg-white"
                >
                  {availableCountries.map((c) => (
                    <option key={c.countryId} value={c.countryId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="mobile-dest-name-input"
                  className="block text-xs font-semibold text-[#401C02] mb-1"
                >
                  Destination Name
                </label>
                <input
                  id="mobile-dest-name-input"
                  type="text"
                  value={mobileDestName}
                  onChange={(e) => setMobileDestName(e.target.value)}
                  placeholder="e.g. Barcelona, Sagrada Família"
                  className="w-full border border-stone-300 rounded-lg p-2 text-xs text-[#2F1B0C] font-medium focus:outline-none focus:border-stone-500"
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsMobileAddDestOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-[#2F1B0C] bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!mobileDestName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-[#E9724C] text-xs font-semibold text-white disabled:opacity-50"
                >
                  Add Destination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  onChange={setNewCountrySelection}
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
