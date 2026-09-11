import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';
import type { Trip } from '../types/trip';
import { CountryAutocomplete, DateRangePicker } from '../components';
import addMembersIcon from '../assets/add-members.png';
import { tripsApi } from '../services/api';
import { mergeTripWithExtras, saveTripExtras, deleteTripExtras } from '../lib/tripExtras';
import axios from 'axios';

type TravelType = 'Solo' | 'Couple' | 'Friends' | 'Family' | '';

export function Settings() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [tripName, setTripName] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelType, setTravelType] = useState<TravelType>('');

  // Fetch trip from backend
  useEffect(() => {
    if (!user || !tripId) return;

    let cancelled = false;

    const fetchTrip = async () => {
      setLoading(true);
      try {
        const apiTrip = await tripsApi.getTrip(tripId);
        if (cancelled) return;

        const merged = mergeTripWithExtras(apiTrip);
        setTrip(merged);
        setTripName(merged.name);
        setSelectedCountries(merged.countries);
        setStartDate(merged.startDate);
        setEndDate(merged.endDate);
        setTravelType((merged.travelType as TravelType) || '');
      } catch (err) {
        if (!cancelled) {
          setTrip(null);
          console.error('Failed to fetch trip for settings:', err);
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

  /**
   * Save changes — splits core fields (API) from local-only fields (side-table).
   */
  const saveChanges = async (updates: Partial<Trip>) => {
    if (!trip || !tripId) return;

    // Separate core backend fields from local-only extras
    const apiPayload: Record<string, unknown> = {};
    if (updates.name !== undefined) apiPayload.title = updates.name;
    if (updates.startDate !== undefined) apiPayload.start_date = updates.startDate;
    if (updates.endDate !== undefined) apiPayload.end_date = updates.endDate;
    if (updates.status !== undefined) apiPayload.status = updates.status;
    if (updates.totalBudget !== undefined) apiPayload.total_budget = updates.totalBudget;

    // Local-only extras
    if (updates.countries !== undefined || updates.travelType !== undefined) {
      const extrasUpdate: Record<string, unknown> = {};
      if (updates.countries !== undefined) extrasUpdate.countries = updates.countries;
      if (updates.travelType !== undefined) extrasUpdate.travelType = updates.travelType;
      saveTripExtras(tripId, extrasUpdate);
    }

    // Only call API if there are backend-relevant changes
    if (Object.keys(apiPayload).length > 0) {
      try {
        const updatedTrip = await tripsApi.updateTrip(tripId, apiPayload);
        const merged = mergeTripWithExtras(updatedTrip);
        setTrip(merged);
      } catch (err) {
        console.error('Failed to update trip:', err);
      }
    } else {
      // Update local state for extras-only changes
      setTrip({ ...trip, ...updates });
    }
  };

  const handleDelete = async () => {
    if (!trip || !tripId) return;
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this trip? This action cannot be undone.',
    );
    if (!confirmDelete) return;

    try {
      await tripsApi.deleteTrip(tripId);

      // Clean up localStorage side-tables
      deleteTripExtras(tripId);
      localStorage.removeItem(`lakbye_budget_${tripId}`);

      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string })?.message ||
          'Failed to delete trip.';
        alert(msg);
      } else {
        alert('An unexpected error occurred while deleting the trip.');
      }
    }
  };

  if (loading) {
    return (
      <div className="workspace-page">
        <div className="workspace-main-card">Loading settings...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="workspace-page">
        <div className="workspace-main-card">Trip not found.</div>
      </div>
    );
  }

  const travelTypes: TravelType[] = ['Solo', 'Couple', 'Friends', 'Family'];

  return (
    <div className="workspace-page">
      {/* Header Card (Reusing Planner shell) */}
      <header className="workspace-header-card animate-slide-up">
        <h1 className="workspace-trip-title">{trip.name}</h1>
        <div className="workspace-header-actions">
          <button className="workspace-pill-members">
            <img src={addMembersIcon} alt="" className="workspace-add-members-icon" />
            Add Members
          </button>
          <button className="workspace-pill-date">
            {trip.startDate} - {trip.endDate}
          </button>
          <button className="workspace-share-btn">Share</button>
        </div>
      </header>

      {/* Main Content Card */}
      <div
        className="workspace-main-card"
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '64px 32px',
          minHeight: '618px',
        }}
      >
        <div style={{ width: '100%', maxWidth: '428px' }}>
          <h2
            style={{
              fontSize: '32px',
              fontWeight: 600,
              margin: '0 0 32px 0',
              fontFamily: 'SF Pro Rounded, sans-serif',
            }}
          >
            Settings
          </h2>

          <div className="form-group">
            <label className="form-label" htmlFor="tripName">
              Trip Name
            </label>
            <div className="input-gradient-border" style={{ position: 'relative' }}>
              <input
                id="tripName"
                type="text"
                className="modal-input"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                onBlur={() => {
                  if (tripName.trim() !== trip.name && tripName.trim() !== '') {
                    saveChanges({ name: tripName.trim() });
                  } else if (tripName.trim() === '') {
                    setTripName(trip.name); // revert if empty
                  }
                }}
                style={{ paddingRight: '40px' }}
              />
              <Pencil
                size={16}
                color="var(--color-neutral-400)"
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <div className="form-label">Which countries are you going to?</div>
            <CountryAutocomplete
              value={selectedCountries}
              onChange={(countries) => {
                setSelectedCountries(countries);
                saveChanges({ countries });
              }}
            />
          </div>

          <div className="form-group">
            <div className="form-label">Travel Dates</div>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={(date) => {
                setStartDate(date);

                const end = endDate ? new Date(endDate) : null;
                if (end && end < new Date(date)) {
                  setEndDate('');
                  saveChanges({ startDate: date, endDate: '' });
                } else {
                  saveChanges({ startDate: date });
                }
              }}
              onEndDateChange={(date) => {
                setEndDate(date);
                saveChanges({ endDate: date });
              }}
            />
          </div>

          <div className="form-group">
            <div className="form-label" id="travelTypeLabel">
              Travel Type
            </div>
            <div
              className="chip-button-group"
              role="group"
              aria-labelledby="travelTypeLabel"
            >
              {travelTypes.map((type) => (
                <button
                  key={type}
                  className={`chip-button ${travelType === type ? 'selected' : ''}`}
                  onClick={() => {
                    setTravelType(type);
                    saveChanges({ travelType: type });
                  }}
                  aria-pressed={travelType === type}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: '48px',
              paddingTop: '32px',
              borderTop: '1px solid var(--color-neutral-200)',
            }}
          >
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--color-brand-red)',
                margin: '0 0 16px 0',
              }}
            >
              Danger Zone
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--color-neutral-500)',
                marginBottom: '16px',
              }}
            >
              Deleting a trip is permanent and cannot be undone. All budget and itinerary
              data will be lost.
            </p>
            <button
              onClick={handleDelete}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--color-brand-red)',
                color: 'white',
                border: 'none',
                borderRadius: '100px',
                fontWeight: 600,
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              Delete Trip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
