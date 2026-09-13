import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import addMembersIcon from '../assets/add-members.png';
import routeIcon from '../assets/route.png';
import dayByDayIcon from '../assets/day-by-day.png';
import magnifierIcon from '../assets/magnifier.png';
import { GlobeMap } from '../components';
import { getCoordinatesForName } from '../constants/coordinates';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';
import type { Trip } from '../types/trip';
import { tripsApi } from '../services/api';
import { mergeTripWithExtras, formatDateOnly } from '../lib/tripExtras';
import axios from 'axios';

export interface Destination {
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

export default function TripWorkspace() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('route');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Destinations state
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [newDestInput, setNewDestInput] = useState('');
  const [activeDestinationId, setActiveDestinationId] = useState<string | null>(null);

  // Fetch trip from backend
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

        // Initialize destinations from extras countries with coordinates
        const initialDests: Destination[] = (merged.countries || []).map((c, i) => {
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
        setDestinations(initialDests);
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

  const handleAddDestination = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDestInput.trim()) return;

    const name = newDestInput.trim();
    const coords = getCoordinatesForName(name);

    const newDest: Destination = {
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
    setActiveDestinationId(newDest.id);
    setNewDestInput('');
  };

  // Convert destinations to Mapbox globe markers
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

  const handleDeleteDestination = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = destinations.filter((d) => d.id !== id);
    setDestinations(updated);
    if (activeDestinationId === id) {
      setActiveDestinationId(updated.length > 0 ? updated[0].id : null);
    }
  };

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

  return (
    <div className="workspace-page">
      {/* Header Card */}
      <header className="workspace-header-card animate-slide-up">
        <h1 className="workspace-trip-title">{trip.name}</h1>

        <div className="workspace-header-actions">
          <button className="workspace-pill-members">
            <img src={addMembersIcon} alt="" className="workspace-add-members-icon" />
            Add Members
          </button>
          <button className="workspace-pill-date">
            {formatDateOnly(trip.startDate)} - {formatDateOnly(trip.endDate)}
          </button>
          <button className="workspace-share-btn">Share</button>
        </div>
      </header>

      {/* Main Workspace Card */}
      <div className="workspace-main-card">
        {/* Itinerary Zone (Left) */}
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
            <div className="workspace-table-header-row">
              <div className="workspace-col-destination">Destination</div>
              <div className="workspace-col-nights">Nights</div>
              <div className="workspace-col-accommodation">Accommodation</div>
              <div className="workspace-col-activities">Activities</div>
              <div className="workspace-col-transportation">Transportation</div>
            </div>

            {/* Destination Rows */}
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
                >
                  <div className="workspace-col-destination flex items-center gap-2">
                    <span className="dest-index-badge">{index + 1}</span>
                    <span className="font-semibold text-slate-800">{dest.name}</span>
                  </div>
                  <div className="workspace-col-nights text-slate-600">{dest.nights}</div>
                  <div className="workspace-col-accommodation text-slate-600 truncate">
                    {dest.accommodation}
                  </div>
                  <div className="workspace-col-activities text-slate-600 truncate">
                    {dest.activities}
                  </div>
                  <div className="workspace-col-transportation text-slate-600 truncate flex items-center justify-between">
                    <span>{dest.transportation}</span>
                    <button
                      onClick={(e) => handleDeleteDestination(dest.id, e)}
                      className="workspace-delete-dest-btn"
                      title="Remove Destination"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Destination Input Form */}
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

        {/* Vertical Divider */}
        <div className="workspace-vertical-divider"></div>

        {/* Map Zone (Right) */}
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
