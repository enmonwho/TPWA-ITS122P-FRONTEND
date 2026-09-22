import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import routeIcon from '../assets/route.png';
import dayByDayIcon from '../assets/day-by-day.png';
import magnifierIcon from '../assets/magnifier.png';
import { GlobeMap } from '../components';
import { getCoordinatesForName } from '../constants/coordinates';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';
import type { Trip } from '../types/trip';
import { tripsApi } from '../services/api';
import { mergeTripWithExtras, formatDateOnly, saveTripExtras } from '../lib/tripExtras';
import axios from 'axios';

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
    'minmax(130px, 1.5fr) 68px minmax(120px, 1.8fr) minmax(120px, 1.8fr) minmax(120px, 1.5fr) 36px',
  gap: '0.75rem',
  alignItems: 'center',
};

export default function TripWorkspace() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('route');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [destinations, setDestinations] = useState<WorkspaceDestination[]>([]);
  const [newDestInput, setNewDestInput] = useState('');
  const [activeDestinationId, setActiveDestinationId] = useState<string | null>(null);

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
          initialDests = (merged.countries || []).map((c, i) => {
            const coords = getCoordinatesForName(c);
            return {
              id: `dest-${i + 1}`,
              name: c,
              country: c,
              nights: Math.max(
                1,
                Math.floor(merged.nights / (merged.countries.length || 1)),
              ),
              accommodation: 'Selected Hotel',
              activities: 'Sightseeing & Culture',
              transportation: 'Flight / Express Train',
              latitude: coords ? coords[1] : undefined,
              longitude: coords ? coords[0] : undefined,
            };
          });
        }
        setDestinations(initialDests);
        if (initialDests.length > 0) setActiveDestinationId(initialDests[0].id);
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
    const countryNames = Array.from(new Set(updated.map((d) => d.country || d.name)));
    if (countryNames.length > 0) {
      saveTripExtras(tripId, { countries: countryNames });
    }
  };

  const handleAddDestination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDestInput.trim()) return;

    const name = newDestInput.trim();
    const coords = getCoordinatesForName(name);

    const newDest: WorkspaceDestination = {
      id: `dest-custom-${Date.now()}`,
      name,
      nights: 3,
      accommodation: 'TBD Hotel',
      activities: 'Local Exploration',
      transportation: 'Train / Taxi',
      latitude: coords ? coords[1] : undefined,
      longitude: coords ? coords[0] : undefined,
    };

    const updated = [...destinations, newDest];
    setDestinations(updated);
    persistDestinations(updated);
    setActiveDestinationId(newDest.id);
    setNewDestInput('');
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

  if (loading) {
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

  // Common Tailwind classes for the inline inputs
  const inputClasses =
    'w-full px-2 py-1 text-slate-600 bg-transparent border border-transparent rounded hover:border-slate-300 focus:border-amber-500 focus:bg-white focus:outline-none transition-colors';

  return (
    <div className="workspace-page">
      <header className="workspace-header-card animate-slide-up">
        <h1 className="workspace-trip-title">{trip.name}</h1>
        <div className="workspace-header-actions">
          <div className="workspace-pill-date">
            {formatDateOnly(trip.startDate)} - {formatDateOnly(trip.endDate)}
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
              <div className="workspace-col-destination">Destination</div>
              <div className="workspace-col-nights text-center">Nights</div>
              <div className="workspace-col-accommodation">Accommodation</div>
              <div className="workspace-col-activities">Activities</div>
              <div className="workspace-col-transportation">Transportation</div>
              <div className="workspace-col-actions" />
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
                  <div className="workspace-col-destination flex items-center gap-2">
                    <span className="dest-index-badge">{index + 1}</span>
                    <span
                      className="font-semibold text-slate-800 truncate"
                      title={dest.name}
                    >
                      {dest.name}
                    </span>
                  </div>
                  <div className="workspace-col-nights flex justify-center">
                    <input
                      type="number"
                      min="1"
                      value={dest.nights || 1}
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
                    <input
                      type="text"
                      value={dest.accommodation || ''}
                      onChange={(e) =>
                        handleUpdateDestination(dest.id, 'accommodation', e.target.value)
                      }
                      placeholder="e.g. Hotel Name"
                      className={inputClasses}
                    />
                  </div>
                  <div className="workspace-col-activities">
                    <input
                      type="text"
                      value={dest.activities || ''}
                      onChange={(e) =>
                        handleUpdateDestination(dest.id, 'activities', e.target.value)
                      }
                      placeholder="e.g. Sightseeing"
                      className={inputClasses}
                    />
                  </div>
                  <div className="workspace-col-transportation">
                    <input
                      type="text"
                      value={dest.transportation || ''}
                      onChange={(e) =>
                        handleUpdateDestination(dest.id, 'transportation', e.target.value)
                      }
                      placeholder="e.g. Flight / Train"
                      className={inputClasses}
                    />
                  </div>
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
              ))}
            </div>

            <form
              onSubmit={handleAddDestination}
              className="workspace-add-destination-row"
            >
              <img src={magnifierIcon} alt="Search" className="workspace-search-icon" />
              <input
                type="text"
                value={newDestInput}
                onChange={(e) => setNewDestInput(e.target.value)}
                placeholder="Add destination (e.g. Tokyo, Paris, Rome, Kyoto)..."
                className="workspace-add-input"
              />
              {newDestInput.trim() && (
                <button type="submit" className="workspace-add-btn">
                  Add +
                </button>
              )}
            </form>
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
