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
import { GlobeMap } from '../components';
import { getCoordinatesForName } from '../constants/coordinates';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';
import type { Trip } from '../types/trip';
import { tripsApi, destinationsApi } from '../services/api';
import {
  mergeTripWithExtras,
  saveTripExtras,
  formatTripDateRange,
} from '../lib/tripExtras';
import {
  searchDestinations,
  type DestinationPlace,
  ACCOMMODATION_OPTIONS,
  ACTIVITIES_OPTIONS,
  TRANSPORTATION_OPTIONS,
} from '../lib/tripAutoFill';
import axios from 'axios';

export interface WorkspaceDestination {
  id: string;
  name: string;
  country?: string;
  days?: number;
  nights?: number;
  accommodation?: string;
  activities?: string;
  transportation?: string;
  latitude?: number;
  longitude?: number;
}

// Rigid inline css grid enforces clean un-smudgeable column arrays globally
const workspaceGridStyle = {
  display: 'grid',
  gridTemplateColumns:
    '44px minmax(130px, 1.5fr) 72px minmax(120px, 1.8fr) minmax(120px, 1.8fr) minmax(120px, 1.5fr) 36px',
  gap: '0.75rem',
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
  const [extraCountries, setExtraCountries] = useState<string[]>([]);
  const [isAddCountryModalOpen, setIsAddCountryModalOpen] = useState(false);
  const [newCountryInput, setNewCountryInput] = useState('');
  const [newDestInput, setNewDestInput] = useState('');
  const [selectedCountryForNew, setSelectedCountryForNew] = useState<string>('');
  const [customCountryInput, setCustomCountryInput] = useState('');
  const [isAddingNewCountry, setIsAddingNewCountry] = useState(false);
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

  const suggestions = useMemo<DestinationPlace[]>(() => {
    if (!newDestInput.trim() || newDestInput.trim().length < 1) return [];
    return searchDestinations(newDestInput.trim(), 8);
  }, [newDestInput]);

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

        // Load extra countries from localStorage if any
        const savedCountriesStr = localStorage.getItem(
          `lakbye_workspace_countries_${tripId}`,
        );
        if (savedCountriesStr) {
          try {
            const parsedC = JSON.parse(savedCountriesStr);
            if (Array.isArray(parsedC)) setExtraCountries(parsedC);
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
                .map((d: any) => ({
                  ...d,
                  country: d.country || d.name || 'Philippines',
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
                }));
            }
          } catch {
            initialDests = [];
          }
        }

        // Fetch server destinations from canonical backend store to reconcile with MapView
        let serverDests: any[] = [];
        try {
          const allDests = await destinationsApi.getAll();
          serverDests = allDests.filter((d: any) => String(d.trip_id) === String(tripId));
        } catch (destErr) {
          console.warn('Could not fetch server destinations:', destErr);
        }

        // Reconcile server destinations with workspace custom metadata
        if (serverDests.length > 0) {
          const mergedList: WorkspaceDestination[] = [...initialDests];
          for (const sDest of serverDests) {
            const existingIdx = mergedList.findIndex(
              (d) =>
                d.id === String(sDest.id) ||
                d.name.toLowerCase() === sDest.location_name.toLowerCase(),
            );
            if (existingIdx >= 0) {
              mergedList[existingIdx] = {
                ...mergedList[existingIdx],
                id: String(sDest.id),
                name: sDest.location_name || mergedList[existingIdx].name,
                country: sDest.country || mergedList[existingIdx].country,
                latitude: sDest.latitude || mergedList[existingIdx].latitude,
                longitude: sDest.longitude || mergedList[existingIdx].longitude,
              };
            } else {
              mergedList.push({
                id: String(sDest.id),
                name: sDest.location_name,
                country: sDest.country || 'Philippines',
                days: 1,
                accommodation: '',
                activities: '',
                transportation: '',
                latitude: sDest.latitude,
                longitude: sDest.longitude,
              });
            }
          }
          initialDests = mergedList;
        }

        // Set loaded destinations (starts empty if none added yet)
        setDestinations(initialDests);

        const tripCountries =
          merged.countries && merged.countries.length > 0
            ? merged.countries
            : ['Philippines'];
        setSelectedCountryForNew(tripCountries[0]);
        if (initialDests.length > 0) {
          setActiveDestinationId(initialDests[0].id);
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

  const persistDestinations = (updated: WorkspaceDestination[]) => {
    if (!tripId) return;
    localStorage.setItem(`lakbye_workspace_dests_${tripId}`, JSON.stringify(updated));
    const countryNames = Array.from(
      new Set([
        ...(trip?.countries || []),
        ...extraCountries,
        ...updated.map((d) => d.country || d.name).filter(Boolean),
      ]),
    );
    if (countryNames.length > 0) {
      saveTripExtras(tripId, { countries: countryNames });
    }
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

  // Unique list of countries from trip, extra countries, and destinations
  const availableCountries = useMemo(() => {
    const list = new Set<string>();
    if (trip?.countries) {
      trip.countries.forEach((c) => c && list.add(c.trim()));
    }
    extraCountries.forEach((c) => c && list.add(c.trim()));
    destinations.forEach((d) => {
      if (d.country) list.add(d.country.trim());
    });
    if (list.size === 0) list.add('Philippines');
    return Array.from(list);
  }, [trip?.countries, extraCountries, destinations]);

  const toggleCountryCollapse = (country: string) => {
    setCollapsedCountries((prev) => ({
      ...prev,
      [country]: !prev[country],
    }));
  };

  const handleAddCountry = (e: React.FormEvent) => {
    e.preventDefault();
    const country = newCountryInput.trim();
    if (!country) return;

    const updatedExtra = Array.from(new Set([...extraCountries, country]));
    setExtraCountries(updatedExtra);
    if (tripId) {
      localStorage.setItem(
        `lakbye_workspace_countries_${tripId}`,
        JSON.stringify(updatedExtra),
      );
      const allCountries = Array.from(new Set([...availableCountries, country]));
      saveTripExtras(tripId, { countries: allCountries });
    }
    setSelectedCountryForNew(country);
    setNewCountryInput('');
    setIsAddCountryModalOpen(false);

    // Ensure this country is expanded
    setCollapsedCountries((prev) => ({ ...prev, [country]: false }));

    // Focus destination search bar
    setTimeout(() => {
      const el = document.getElementById('workspace-dest-input');
      if (el) el.focus();
    }, 100);
  };

  const handleRemoveCountry = (countryToRemove: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const itemsInCountry = destinations.filter(
      (d) => (d.country || 'Philippines') === countryToRemove,
    );

    if (itemsInCountry.length > 0) {
      const confirmed = window.confirm(
        `Are you sure you want to remove "${countryToRemove}" and its ${itemsInCountry.length} destination(s)?`,
      );
      if (!confirmed) return;
    }

    // 1. Remove destinations belonging to this country
    const updatedDests = destinations.filter(
      (d) => (d.country || 'Philippines') !== countryToRemove,
    );
    setDestinations(updatedDests);
    persistDestinations(updatedDests);

    // 2. Remove from extraCountries
    const updatedExtra = extraCountries.filter((c) => c !== countryToRemove);
    setExtraCountries(updatedExtra);
    if (tripId) {
      localStorage.setItem(
        `lakbye_workspace_countries_${tripId}`,
        JSON.stringify(updatedExtra),
      );
    }

    // 3. Remove from trip.countries
    const updatedTripCountries = (trip?.countries || []).filter(
      (c) => c !== countryToRemove,
    );
    if (trip) {
      setTrip({ ...trip, countries: updatedTripCountries });
    }

    // 4. Save to tripExtras
    const remaining = Array.from(
      new Set([
        ...updatedTripCountries,
        ...updatedExtra,
        ...updatedDests.map((d) => d.country || '').filter(Boolean),
      ]),
    );
    if (tripId) {
      saveTripExtras(tripId, { countries: remaining });
    }

    // 5. Update selectedCountryForNew if it was the removed one
    if (selectedCountryForNew === countryToRemove) {
      setSelectedCountryForNew(remaining[0] || 'Philippines');
    }

    // 6. Clean up collapsed state
    setCollapsedCountries((prev) => {
      const next = { ...prev };
      delete next[countryToRemove];
      return next;
    });
  };

  const handleSelectSuggestion = (place: DestinationPlace) => {
    setNewDestInput(place.name);
    setSelectedCountryForNew(place.country);
    setExtraCountries((prev) => Array.from(new Set([...prev, place.country])));
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setCollapsedCountries((prev) => ({ ...prev, [place.country]: false }));
  };

  const handleAddDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDestInput.trim()) return;

    setShowSuggestions(false);
    setHighlightedIndex(-1);

    const name = newDestInput.trim();
    const finalCountry = isAddingNewCountry
      ? customCountryInput.trim() || 'New Destination'
      : selectedCountryForNew || availableCountries[0] || 'Philippines';

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

    let assignedId = `dest-custom-${Date.now()}`;
    if (tripId) {
      try {
        const createdServer = await destinationsApi.create({
          trip_id: Number(tripId),
          location_name: name,
          country: finalCountry,
          latitude: coords ? coords[1] : 0,
          longitude: coords ? coords[0] : 0,
        });
        if (createdServer && createdServer.id) {
          assignedId = String(createdServer.id);
        }
      } catch (destErr) {
        console.warn('Failed to persist destination to server:', destErr);
      }
    }

    const newDest: WorkspaceDestination = {
      id: assignedId,
      name,
      country: finalCountry,
      days: initialDays,
      accommodation: '',
      activities: '',
      transportation: '',
      latitude: coords ? coords[1] : undefined,
      longitude: coords ? coords[0] : undefined,
    };

    const updated = [...destinations, newDest];
    setDestinations(updated);
    persistDestinations(updated);
    setActiveDestinationId(newDest.id);
    setNewDestInput('');
    if (isAddingNewCountry) {
      setIsAddingNewCountry(false);
      setCustomCountryInput('');
      setSelectedCountryForNew(finalCountry);
      setExtraCountries((prev) => Array.from(new Set([...prev, finalCountry])));
    }
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

  const handleDeleteDestination = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (/^\d+$/.test(id)) {
      try {
        await destinationsApi.delete(Number(id));
      } catch (delErr) {
        console.warn('Failed to delete destination from server:', delErr);
      }
    }
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
    setDestinations(next);
    persistDestinations(next);
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
      <div
        className="flex items-center gap-1 w-full"
        onClick={(e) => e.stopPropagation()}
      >
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
          className="flex-1 min-w-0 px-2 py-1 text-xs text-slate-800 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 rounded-md focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all cursor-pointer truncate shadow-xs font-normal"
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
        <button
          type="button"
          onClick={() =>
            setCustomInputActive((prev) => ({
              ...prev,
              [`${destId}-${field}`]: true,
            }))
          }
          className="shrink-0 p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded border border-slate-200 hover:border-amber-300 transition-colors"
          title={`Add or type custom ${field}`}
          aria-label={`Add or type custom ${field}`}
        >
          <Plus size={13} />
        </button>
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

  // Group destinations by country in order of appearance
  const groupedByCountry = useMemo(() => {
    const groups: {
      country: string;
      totalDays: number;
      items: WorkspaceDestination[];
    }[] = [];
    const countryMap = new Map<string, WorkspaceDestination[]>();

    // First ensure every available country has an entry
    availableCountries.forEach((c) => {
      countryMap.set(c, []);
    });

    // Populate destinations into their country
    destinations.forEach((dest) => {
      const c = dest.country || 'Philippines';
      if (!countryMap.has(c)) {
        countryMap.set(c, []);
      }
      countryMap.get(c)!.push(dest);
    });

    countryMap.forEach((items, country) => {
      const totalDays = items.reduce(
        (sum, item) => sum + (Number(item.days) || Number(item.nights) || 1),
        0,
      );
      groups.push({ country, totalDays, items });
    });

    return groups;
  }, [destinations, availableCountries]);

  // Day-by-day itinerary schedule breakdown
  const daySchedule = useMemo(() => {
    const schedule: {
      dayNumber: number;
      destination: WorkspaceDestination | null;
      dayOfDestination?: number;
    }[] = [];
    let currentDay = 1;

    destinations.forEach((dest) => {
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
  }, [destinations, tripDurationDays]);

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

  // Common Tailwind classes for the inline inputs (allow spaces, do not aggressively trim)
  const inputClasses =
    'w-full px-2 py-1 text-slate-700 bg-transparent border border-transparent rounded hover:border-slate-300 focus:border-amber-500 focus:bg-white focus:outline-none transition-colors text-sm';

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
                  {availableCountries.join(' • ')}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="workspace-header-actions">
          <div className="workspace-pill-date">
            {formatTripDateRange(trip.startDate, trip.endDate)}
          </div>
        </div>
      </header>

      <div className="workspace-main-card">
        <div className="workspace-itinerary-zone animate-slide-up delay-150">
          <div className="workspace-tabs-container flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
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
                Day by Day ({tripDurationDays} Days)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsAddCountryModalOpen(true)}
              className="pill-tab"
              style={{
                backgroundColor: '#FEF3C7',
                borderColor: '#F59E0B',
                color: '#92400E',
                gap: '6px',
                marginLeft: 'auto',
              }}
              title="Add another country to this trip"
            >
              <Plus size={14} />
              <span>Add Country</span>
            </button>
          </div>

          {activeTab === 'route' ? (
            <div className="workspace-itinerary-table">
              {/* Table Column Headers */}
              <div
                className="workspace-table-header-row bg-slate-50/80 rounded-t-lg"
                style={workspaceGridStyle}
              >
                <div className="text-center font-bold text-slate-400 text-xs">Order</div>
                <div className="workspace-col-destination font-bold text-slate-700 text-sm">
                  City / Destination
                </div>
                <div className="workspace-col-nights text-center font-bold text-slate-700 text-sm">
                  Days
                </div>
                <div className="workspace-col-accommodation font-bold text-slate-700 text-sm">
                  Accommodation
                </div>
                <div className="workspace-col-activities font-bold text-slate-700 text-sm">
                  Activities
                </div>
                <div className="workspace-col-transportation font-bold text-slate-700 text-sm">
                  Transportation
                </div>
                <div className="workspace-col-actions" />
              </div>

              {/* Grouped by Country Hierarchy */}
              <div className="workspace-destination-rows">
                {groupedByCountry.map((group) => {
                  const isCollapsed = collapsedCountries[group.country];
                  return (
                    <div
                      key={group.country}
                      className="border-b border-slate-200/80 last:border-b-0"
                    >
                      {/* Top-Level Country Row */}
                      <div className="flex items-center justify-between px-3 py-2.5 bg-amber-50/70 hover:bg-amber-100/50 border-t border-amber-200/50 transition-colors">
                        <div
                          className="flex items-center gap-2 cursor-pointer select-none"
                          onClick={() => toggleCountryCollapse(group.country)}
                        >
                          {isCollapsed ? (
                            <ChevronRight size={18} className="text-amber-800" />
                          ) : (
                            <ChevronDown size={18} className="text-amber-800" />
                          )}
                          <span className="font-bold text-amber-950 text-sm md:text-base">
                            {group.country}
                          </span>
                          <span className="text-xs font-medium text-amber-800">
                            ({group.totalDays} {group.totalDays === 1 ? 'day' : 'days'})
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleRemoveCountry(group.country, e)}
                          className="text-xs text-stone-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer font-medium border border-transparent hover:border-rose-200"
                          title={`Remove ${group.country} from trip`}
                          aria-label={`Remove ${group.country}`}
                        >
                          <X size={13} />
                          <span>Remove Country</span>
                        </button>
                      </div>

                      {/* Nested Cities / Destinations Rows */}
                      {!isCollapsed && (
                        <div className="bg-white">
                          {group.items.length === 0 ? (
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSelectedCountryForNew(group.country);
                                const el =
                                  document.getElementById('workspace-dest-input');
                                if (el) el.focus();
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedCountryForNew(group.country);
                                  const el =
                                    document.getElementById('workspace-dest-input');
                                  if (el) el.focus();
                                }
                              }}
                              className="px-6 py-5 text-center text-xs text-stone-500 border-t border-amber-100/60 flex flex-col items-center justify-center gap-1 bg-stone-50/40 hover:bg-amber-50/50 cursor-pointer transition-colors group"
                              title={`Click to add a destination to ${group.country}`}
                            >
                              <span className="font-semibold text-stone-700 text-sm group-hover:text-amber-800 transition-colors">
                                + Add a destination to {group.country}
                              </span>
                              <span className="text-slate-400">
                                Click here or use the search bar below to add cities,
                                islands, or places
                              </span>
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
                                  className={`workspace-destination-row pl-4 ${activeDestinationId === dest.id ? 'active' : ''}`}
                                  style={workspaceGridStyle}
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
                                      className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-20 disabled:cursor-not-allowed"
                                      title="Move Up"
                                    >
                                      <ArrowUp size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={globalIndex === destinations.length - 1}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveDestination(dest.id, 'down');
                                      }}
                                      className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-20 disabled:cursor-not-allowed"
                                      title="Move Down"
                                    >
                                      <ArrowDown size={13} />
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
                                      className={`${inputClasses} font-semibold text-slate-800`}
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
                                      className={`${inputClasses} w-16 text-center font-bold text-stone-800 bg-slate-100/70 border border-slate-200 rounded`}
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
                                      'Select accommodation',
                                    )}
                                  </div>

                                  {/* Activities Dropdown with Custom Add Button */}
                                  <div className="workspace-col-activities">
                                    {renderFieldSelector(
                                      dest.id,
                                      'activities',
                                      dest.activities,
                                      ACTIVITIES_OPTIONS,
                                      'Select activity',
                                    )}
                                  </div>

                                  {/* Transportation Dropdown with Custom Add Button */}
                                  <div className="workspace-col-transportation">
                                    {renderFieldSelector(
                                      dest.id,
                                      'transportation',
                                      dest.transportation,
                                      TRANSPORTATION_OPTIONS,
                                      'Select transportation',
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="workspace-col-actions flex justify-center">
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteDestination(dest.id, e)}
                                      className="workspace-delete-dest-btn shrink-0"
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
                className="workspace-add-destination-row mt-3 p-2 bg-slate-50 border border-slate-200 rounded-lg flex flex-nowrap items-center gap-3 overflow-visible"
              >
                <div className="flex items-center gap-1.5 pl-2 shrink-0">
                  <span className="text-xs font-semibold text-slate-500">Country:</span>
                  {!isAddingNewCountry ? (
                    <select
                      value={selectedCountryForNew}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsAddingNewCountry(true);
                        } else {
                          setSelectedCountryForNew(e.target.value);
                        }
                      }}
                      className="text-xs font-medium bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 outline-none"
                    >
                      {availableCountries.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="__NEW__">+ New Country...</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={customCountryInput}
                        onChange={(e) => setCustomCountryInput(e.target.value)}
                        placeholder="Country name"
                        className="text-xs px-2 py-1 bg-white border border-amber-400 rounded outline-none w-28"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCountry(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div
                  ref={searchContainerRef}
                  className="flex-1 relative flex items-center gap-2 min-w-40 border-l border-slate-200 pl-3"
                >
                  <img
                    src={magnifierIcon}
                    alt="Search"
                    className="workspace-search-icon"
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
                      if (!showSuggestions || suggestions.length === 0) return;
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setHighlightedIndex((prev) =>
                          prev < suggestions.length - 1 ? prev + 1 : 0,
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHighlightedIndex((prev) =>
                          prev > 0 ? prev - 1 : suggestions.length - 1,
                        );
                      } else if (e.key === 'Enter') {
                        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
                          e.preventDefault();
                          handleSelectSuggestion(suggestions[highlightedIndex]);
                        }
                      } else if (e.key === 'Escape') {
                        setShowSuggestions(false);
                      }
                    }}
                    placeholder="Enter city or destination (e.g. Kyoto, Cebu, Paris)..."
                    className="workspace-add-input flex-1 bg-transparent text-sm text-slate-800 outline-none"
                    autoComplete="off"
                  />

                  {showSuggestions && suggestions.length > 0 && (
                    <div
                      className="workspace-dest-dropdown min-w-95 overflow-x-hidden"
                      role="listbox"
                    >
                      {suggestions.map((place, idx) => (
                        <div
                          key={`${place.name}-${place.country}`}
                          role="option"
                          tabIndex={0}
                          aria-selected={idx === highlightedIndex}
                          className={`workspace-dest-option ${idx === highlightedIndex ? 'highlighted' : ''}`}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectSuggestion(place);
                          }}
                          onClick={() => handleSelectSuggestion(place)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectSuggestion(place);
                            }
                          }}
                        >
                          <div className="workspace-dest-option-main">
                            <div className="workspace-dest-option-icon">
                              <MapPin size={15} />
                            </div>
                            <span className="workspace-dest-option-name">
                              {place.name}
                            </span>
                            <span className="workspace-dest-option-country">
                              {place.country}
                            </span>
                          </div>
                          <span className="workspace-dest-option-action">Add +</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                  <span
                    className={`text-xs font-medium whitespace-nowrap shrink-0 ${
                      tripDurationDays - totalAllocatedDays > 0
                        ? 'text-amber-800'
                        : 'text-emerald-700'
                    }`}
                  >
                    {tripDurationDays - totalAllocatedDays > 0
                      ? `${tripDurationDays - totalAllocatedDays} of ${tripDurationDays} Days Available`
                      : `All ${tripDurationDays} Days Allocated`}
                  </span>

                  {newDestInput.trim() && (
                    <button
                      type="submit"
                      disabled={
                        totalAllocatedDays >= tripDurationDays && destinations.length > 0
                      }
                      className="workspace-add-btn text-xs font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-md shadow-sm transition-colors whitespace-nowrap shrink-0"
                      title={
                        totalAllocatedDays >= tripDurationDays && destinations.length > 0
                          ? 'All days from date picker are already allocated. Reduce days on existing destinations first.'
                          : 'Add this destination'
                      }
                    >
                      Add Destination +
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            /* Day by Day View */
            <div className="workspace-day-schedule p-4 flex flex-col gap-3">
              {daySchedule.map((item) => (
                <div
                  key={`day-${item.dayNumber}`}
                  className="flex items-start gap-4 p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-amber-400 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-amber-100 text-amber-900 shrink-0 font-bold">
                    <span className="text-xs uppercase tracking-wider text-amber-700">
                      Day
                    </span>
                    <span className="text-xl leading-none">{item.dayNumber}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.destination ? (
                      <>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-base">
                            {item.destination.name}
                          </h4>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {item.destination.country}
                          </span>
                          <span className="text-xs text-amber-700 font-medium ml-auto">
                            Day {item.dayOfDestination} of {item.destination.days || 1}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-xs text-slate-600">
                          <div>
                            <span className="font-semibold text-slate-700">Stay:</span>{' '}
                            {item.destination.accommodation || '—'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">
                              Activity:
                            </span>{' '}
                            {item.destination.activities || '—'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700">Transit:</span>{' '}
                            {item.destination.transportation || '—'}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-slate-400 text-xs italic py-2">
                        Unplanned / Free Day — Add a destination to your itinerary to
                        schedule this day.
                      </div>
                    )}
                  </div>
                </div>
              ))}
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
                  {availableCountries.map((c) => (
                    <span
                      key={c}
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
                      <span>{c}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCountry(c)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#B45309',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0',
                        }}
                        title={`Remove ${c}`}
                        aria-label={`Remove ${c}`}
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
                <label
                  htmlFor="newCountryInput"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#401C02',
                    marginBottom: '6px',
                  }}
                >
                  Country Name
                </label>
                <input
                  id="newCountryInput"
                  type="text"
                  required
                  placeholder="e.g. South Korea, France, Japan, Philippines..."
                  value={newCountryInput}
                  onChange={(e) => setNewCountryInput(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D9D9D9',
                    fontSize: '14px',
                    outline: 'none',
                  }}
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
