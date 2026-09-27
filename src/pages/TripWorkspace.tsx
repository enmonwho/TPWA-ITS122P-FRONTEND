import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import routeIcon from '../assets/route.png';
import dayByDayIcon from '../assets/day-by-day.png';
import magnifierIcon from '../assets/magnifier.png';
import { MapPin } from 'lucide-react';
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
import {
  ACCOMMODATION_OPTIONS,
  ACTIVITIES_OPTIONS,
  TRANSPORTATION_OPTIONS,
  searchDestinations,
  getAutoFillRecommendations,
} from '../lib/tripAutoFill';
import type { DestinationPlace } from '../lib/tripAutoFill';
import axios from 'axios';
import { getCachedTrip, setCachedTrip } from '../lib/tripCache';
import type { TripWorkspaceOutletContext } from '../layouts/TripWorkspaceLayout';

export interface WorkspaceDestination {
  id: string;
  name: string;
  country?: string;
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
    'minmax(130px, 1.4fr) 64px minmax(135px, 1.8fr) minmax(135px, 1.8fr) minmax(130px, 1.5fr) 60px',
  gap: '0.625rem',
  alignItems: 'center',
};

function getInitialDestinations(
  tripId?: string,
  cachedTrip?: Trip | null,
): WorkspaceDestination[] {
  if (!tripId) return [];
  const savedDestStr = localStorage.getItem(`lakbye_workspace_dests_${tripId}`);
  if (savedDestStr) {
    try {
      const parsed = JSON.parse(savedDestStr);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore
    }
  }
  if (cachedTrip) {
    const countries = cachedTrip.countries || [];
    if (countries.length > 0) {
      return countries.map((c, i) => {
        const rec = getAutoFillRecommendations(c, c);
        return {
          id: `dest-${i + 1}`,
          name: c,
          country: c,
          nights: Math.max(1, Math.floor(cachedTrip.nights / (countries.length || 1))),
          accommodation: rec.accommodation,
          activities: rec.activities,
          transportation: rec.transportation,
          latitude: rec.latitude,
          longitude: rec.longitude,
        };
      });
    }
  }
  return [];
}

export default function TripWorkspace() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const outlet = useOutletContext<TripWorkspaceOutletContext | undefined>();
  const cached = outlet?.trip || (tripId ? getCachedTrip(tripId) : null);

  const [activeTab, setActiveTab] = useState('route');
  const [trip, setTrip] = useState<Trip | null>(() => cached);
  const [loading, setLoading] = useState(() => !cached);
  const [notFound, setNotFound] = useState(false);

  const [destinations, setDestinations] = useState<WorkspaceDestination[]>(() =>
    getInitialDestinations(tripId, cached),
  );
  const [newDestInput, setNewDestInput] = useState('');
  const [activeDestinationId, setActiveDestinationId] = useState<string | null>(() => {
    const init = getInitialDestinations(tripId, cached);
    return init[0]?.id || null;
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user || !tripId) return;
    let cancelled = false;

    const fetchTrip = async () => {
      if (!cached) {
        setLoading(true);
      }
      setNotFound(false);
      try {
        const apiTrip = await tripsApi.getTrip(tripId);
        if (cancelled) return;

        const merged = mergeTripWithExtras(apiTrip);
        setCachedTrip(tripId, merged);
        setTrip(merged);
        if (outlet?.setTrip) outlet.setTrip(merged);

        // Check if saved destinations exist in localStorage for this trip
        const savedDestStr = localStorage.getItem(`lakbye_workspace_dests_${tripId}`);
        let initialDests: WorkspaceDestination[] = [];
        if (savedDestStr) {
          try {
            initialDests = JSON.parse(savedDestStr);
          } catch {
            initialDests = [];
          }
        }

        if (!initialDests || initialDests.length === 0) {
          const countries = merged.countries || [];
          if (countries.length > 0) {
            initialDests = countries.map((c, i) => {
              const rec = getAutoFillRecommendations(c, c);
              return {
                id: `dest-${i + 1}`,
                name: c,
                country: c,
                nights: Math.max(1, Math.floor(merged.nights / (countries.length || 1))),
                accommodation: rec.accommodation,
                activities: rec.activities,
                transportation: rec.transportation,
                latitude: rec.latitude,
                longitude: rec.longitude,
              };
            });
          }
        }
        setDestinations((prev) => (prev.length > 0 ? prev : initialDests));
        setActiveDestinationId((prev) => prev || (initialDests[0]?.id ?? null));
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
  }, [user, tripId, cached, outlet]);

  const persistDestinations = (updated: WorkspaceDestination[]) => {
    if (!tripId) return;
    localStorage.setItem(`lakbye_workspace_dests_${tripId}`, JSON.stringify(updated));
    const countryNames = Array.from(new Set(updated.map((d) => d.country || d.name)));
    if (countryNames.length > 0) {
      saveTripExtras(tripId, { countries: countryNames });
    }
  };

  const handleAddDestination = (
    e?: React.FormEvent,
    customName?: string,
    customCountry?: string,
  ) => {
    if (e) e.preventDefault();
    const nameToAdd = (customName || newDestInput).trim();
    if (!nameToAdd) return;

    const primaryCountry = customCountry || trip?.countries?.[0];
    const rec = getAutoFillRecommendations(nameToAdd, primaryCountry);

    const newDest: WorkspaceDestination = {
      id: `dest-custom-${Date.now()}`,
      name: nameToAdd,
      country: customCountry || rec.country || primaryCountry || nameToAdd,
      nights: 3,
      accommodation: rec.accommodation,
      activities: rec.activities,
      transportation: rec.transportation,
      latitude: rec.latitude,
      longitude: rec.longitude,
    };

    const updated = [...destinations, newDest];
    setDestinations(updated);
    persistDestinations(updated);
    setActiveDestinationId(newDest.id);
    setNewDestInput('');
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleSelectPlace = (place: DestinationPlace) => {
    handleAddDestination(undefined, place.name, place.country);
  };

  const handleUpdateDestination = (
    id: string,
    field: keyof WorkspaceDestination,
    value: string | number,
  ) => {
    setDestinations((prev) => {
      const updated = prev.map((dest) =>
        dest.id === id ? { ...dest, [field]: value } : dest,
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

  const getCumulativeDayRange = (idx: number) => {
    let startDay = 1;
    for (let i = 0; i < idx; i++) {
      startDay += destinations[i].nights || 1;
    }
    const endDay = startDay + (destinations[idx].nights || 1) - 1;
    return startDay === endDay ? `Day ${startDay}` : `Days ${startDay}–${endDay}`;
  };

  const matchingPlaces = searchDestinations(newDestInput, 8);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || matchingPlaces.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddDestination(e);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < matchingPlaces.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : matchingPlaces.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && matchingPlaces[highlightedIndex]) {
        handleSelectPlace(matchingPlaces[highlightedIndex]);
      } else {
        handleAddDestination(e);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
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
        title: `${index + 1}. ${dest.name}`,
      };
    })
    .filter(
      (m): m is { id: string; lng: number; lat: number; title: string } => m !== null,
    );

  const renderDropdown = (
    destId: string,
    field: 'accommodation' | 'activities' | 'transportation',
    currentValue: string | undefined,
    options: string[],
    placeholder: string,
  ) => {
    const isCustomValue = currentValue && !options.includes(currentValue);

    return (
      <select
        value={currentValue || ''}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '__custom__') {
            const userVal = window.prompt(
              `Enter custom ${field} for this stop:`,
              currentValue || '',
            );
            if (userVal && userVal.trim()) {
              handleUpdateDestination(destId, field, userVal.trim());
            }
          } else {
            handleUpdateDestination(destId, field, val);
          }
        }}
        className="w-full px-2 py-1 text-xs text-slate-800 bg-white/90 hover:bg-white border border-slate-200/80 hover:border-slate-300 rounded-md focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all cursor-pointer truncate shadow-xs font-normal"
        title={currentValue || placeholder}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {isCustomValue && <option value={currentValue}>{currentValue} (Saved)</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value="__custom__" className="text-amber-600 font-semibold">
          + Enter custom...
        </option>
      </select>
    );
  };

  if (loading && !trip) {
    return (
      <div className="workspace-page">
        <div className="workspace-main-card">Loading...</div>
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

  const inputClasses =
    'w-full px-2 py-1 text-slate-600 bg-transparent border border-transparent rounded hover:border-slate-300 focus:border-amber-500 focus:bg-white focus:outline-none transition-colors';

  return (
    <div className="workspace-page">
      <header className="workspace-header-card animate-slide-up">
        <h1 className="workspace-trip-title">{trip.name}</h1>
        <div className="workspace-header-actions">
          <div className="workspace-pill-date">
            {formatTripDateRange(trip.startDate, trip.endDate)}
          </div>
        </div>
      </header>

      <div className="workspace-main-card">
        <div className="workspace-itinerary-zone animate-slide-up delay-150">
          <div className="workspace-tabs-container">
            <button
              className={`pill-tab ${activeTab === 'route' ? 'pill-tab--active' : ''}`}
              onClick={() => setActiveTab('route')}
            >
              <img src={routeIcon} alt="" className="workspace-tab-icon" />
              Route
            </button>
            <button
              className={`pill-tab ${activeTab === 'day' ? 'pill-tab--active' : ''}`}
              onClick={() => setActiveTab('day')}
            >
              <img src={dayByDayIcon} alt="" className="workspace-tab-icon" />
              Day by day
            </button>
          </div>

          <div className="workspace-itinerary-table">
            <div className="workspace-table-header-row" style={workspaceGridStyle}>
              <div className="workspace-col-destination">
                {activeTab === 'day' ? 'Schedule & Destination' : 'Destination'}
              </div>
              <div className="workspace-col-nights text-center">Nights</div>
              <div className="workspace-col-accommodation">Accommodation</div>
              <div className="workspace-col-activities">Activities</div>
              <div className="workspace-col-transportation">Transportation</div>
              <div className="workspace-col-actions text-center" />
            </div>

            <div className="workspace-destination-rows">
              {destinations.map((dest, index) => (
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
                  className={`workspace-destination-row ${activeDestinationId === dest.id ? 'active' : ''}`}
                  style={workspaceGridStyle}
                >
                  <div className="workspace-col-destination flex items-center gap-2.5">
                    <span className="dest-index-badge">{index + 1}</span>
                    <div className="flex flex-col min-w-0">
                      <span
                        className="font-semibold text-slate-800 truncate"
                        title={dest.name}
                      >
                        {dest.name}
                      </span>
                      {activeTab === 'day' && (
                        <span className="text-[11px] font-normal text-slate-400">
                          {getCumulativeDayRange(index)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="workspace-col-nights flex justify-center">
                    <input
                      type="number"
                      min="1"
                      value={dest.nights || 1}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        handleUpdateDestination(
                          dest.id,
                          'nights',
                          parseInt(e.target.value) || 1,
                        )
                      }
                      className={`${inputClasses} w-14 text-center`}
                      title="Nights"
                    />
                  </div>
                  <div className="workspace-col-accommodation">
                    {renderDropdown(
                      dest.id,
                      'accommodation',
                      dest.accommodation,
                      ACCOMMODATION_OPTIONS,
                      'Select Accommodation',
                    )}
                  </div>
                  <div className="workspace-col-activities">
                    {renderDropdown(
                      dest.id,
                      'activities',
                      dest.activities,
                      ACTIVITIES_OPTIONS,
                      'Select Activity',
                    )}
                  </div>
                  <div className="workspace-col-transportation">
                    {renderDropdown(
                      dest.id,
                      'transportation',
                      dest.transportation,
                      TRANSPORTATION_OPTIONS,
                      'Select Transportation',
                    )}
                  </div>
                  <div className="workspace-col-actions flex items-center justify-center">
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
              ))}
            </div>

            <div
              ref={searchContainerRef}
              className="workspace-add-destination-container flex flex-col"
            >
              <form
                onSubmit={(e) => handleAddDestination(e)}
                className="workspace-add-destination-row"
              >
                <img src={magnifierIcon} alt="Search" className="workspace-search-icon" />
                <input
                  type="text"
                  value={newDestInput}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setNewDestInput(e.target.value);
                    setIsDropdownOpen(true);
                    setHighlightedIndex(-1);
                  }}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Add destination (e.g. Tokyo, Paris, Rome, Kyoto)..."
                  className="workspace-add-input"
                  autoComplete="off"
                />
                {newDestInput.trim() && (
                  <button type="submit" className="workspace-add-btn">
                    Add +
                  </button>
                )}
              </form>

              {isDropdownOpen &&
                matchingPlaces.length > 0 &&
                newDestInput.trim().length > 0 && (
                  <div className="workspace-dest-dropdown" role="listbox">
                    {matchingPlaces.map((place, idx) => (
                      <div
                        key={`${place.name}-${place.country}`}
                        role="option"
                        tabIndex={0}
                        aria-selected={idx === highlightedIndex}
                        className={`workspace-dest-option ${idx === highlightedIndex ? 'highlighted' : ''}`}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onClick={() => handleSelectPlace(place)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleSelectPlace(place);
                          }
                        }}
                      >
                        <div className="workspace-dest-option-main">
                          <div className="workspace-dest-option-icon">
                            <MapPin size={15} />
                          </div>
                          <span className="workspace-dest-option-name">{place.name}</span>
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
          </div>
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
    </div>
  );
}
