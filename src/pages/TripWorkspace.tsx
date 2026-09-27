import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, Plus, X } from 'lucide-react';
import routeIcon from '../assets/route.png';
import dayByDayIcon from '../assets/day-by-day.png';
import magnifierIcon from '../assets/magnifier.png';
import { GlobeMap } from '../components';
import { getCoordinatesForName } from '../constants/coordinates';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';
import type { Trip } from '../types/trip';
import { tripsApi } from '../services/api';
import {
  mergeTripWithExtras,
  saveTripExtras,
  formatTripDateRange,
} from '../lib/tripExtras';
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

  const handleAddDestination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDestInput.trim()) return;

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

    const newDest: WorkspaceDestination = {
      id: `dest-custom-${Date.now()}`,
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
    setDestinations(next);
    persistDestinations(next);
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
            <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
              {tripDurationDays} Total {tripDurationDays === 1 ? 'Day' : 'Days'}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                totalAllocatedDays === tripDurationDays
                  ? 'bg-emerald-100 text-emerald-800'
                  : totalAllocatedDays < tripDurationDays
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
              }`}
            >
              {totalAllocatedDays} of {tripDurationDays} Days Planned
              {tripDurationDays - totalAllocatedDays > 0
                ? ` (${tripDurationDays - totalAllocatedDays} remaining)`
                : ''}
            </span>
            <span className="text-xs text-slate-500">
              {availableCountries.join(' • ')}
            </span>
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
                      {/* Top-Level Country Row (without Add City button) */}
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
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-200/90 text-amber-900">
                            {group.totalDays} {group.totalDays === 1 ? 'Day' : 'Days'}
                          </span>
                        </div>
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
                                      className={`${inputClasses} w-16 text-center font-bold text-amber-700 bg-amber-50/50 rounded`}
                                      title={`Days (Max ${maxDaysForThisDest} based on trip date picker)`}
                                    />
                                  </div>

                                  {/* Accommodation (clean placeholder) */}
                                  <div className="workspace-col-accommodation">
                                    <input
                                      type="text"
                                      value={dest.accommodation || ''}
                                      onChange={(e) =>
                                        handleUpdateDestination(
                                          dest.id,
                                          'accommodation',
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Add hotel / stay"
                                      className={inputClasses}
                                    />
                                  </div>

                                  {/* Activities (clean placeholder) */}
                                  <div className="workspace-col-activities">
                                    <input
                                      type="text"
                                      value={dest.activities || ''}
                                      onChange={(e) =>
                                        handleUpdateDestination(
                                          dest.id,
                                          'activities',
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Add activities"
                                      className={inputClasses}
                                    />
                                  </div>

                                  {/* Transportation (clean placeholder) */}
                                  <div className="workspace-col-transportation">
                                    <input
                                      type="text"
                                      value={dest.transportation || ''}
                                      onChange={(e) =>
                                        handleUpdateDestination(
                                          dest.id,
                                          'transportation',
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Add transportation"
                                      className={inputClasses}
                                    />
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
                className="workspace-add-destination-row mt-3 p-2 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center gap-2"
              >
                <div className="flex items-center gap-1.5 pl-2">
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

                <div className="flex-1 flex items-center gap-2 min-w-[200px] border-l border-slate-200 pl-3">
                  <img
                    src={magnifierIcon}
                    alt="Search"
                    className="workspace-search-icon"
                  />
                  <input
                    id="workspace-dest-input"
                    type="text"
                    value={newDestInput}
                    onChange={(e) => setNewDestInput(e.target.value)}
                    placeholder="Enter city or destination (e.g. Kyoto, Cebu, Paris)..."
                    className="workspace-add-input flex-1 bg-transparent text-sm text-slate-800 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      tripDurationDays - totalAllocatedDays > 0
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
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
                      className="workspace-add-btn text-xs font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-md shadow-sm transition-colors"
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
