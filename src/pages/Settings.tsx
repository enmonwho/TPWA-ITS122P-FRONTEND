import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { STORAGE_KEYS, ROUTES } from '../lib/constants';
import type { Trip } from '../types/trip';
import { CountryAutocomplete, DateRangePicker } from '../components';
import addMembersIcon from '../assets/add-members.png';

type TravelType = 'Solo' | 'Couple' | 'Friends' | 'Family' | '';

export function Settings() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [prevUserId, setPrevUserId] = useState<number | undefined>(undefined);
  const [prevTripId, setPrevTripId] = useState<string | undefined>(undefined);
  const [trip, setTrip] = useState<Trip | null>(null);

  // Form states
  const [tripName, setTripName] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelType, setTravelType] = useState<TravelType>('');

  if (user?.id !== prevUserId || tripId !== prevTripId) {
    setPrevUserId(user?.id);
    setPrevTripId(tripId);
    if (user && tripId) {
      const tripKey = STORAGE_KEYS.TRIPS(user.id);
      const existingStr = localStorage.getItem(tripKey);
      if (existingStr) {
        const trips: Trip[] = JSON.parse(existingStr);
        const found = trips.find((t) => t.id === tripId);
        if (found) {
          setTrip(found);
          setTripName(found.name);
          setSelectedCountries(found.countries);
          setStartDate(found.startDate);
          setEndDate(found.endDate);
          setTravelType(found.travelType as TravelType);
        } else {
          setTrip(null);
        }
      }
    }
  }

  const saveChanges = (updates: Partial<Trip>) => {
    if (!user || !trip) return;
    const tripKey = STORAGE_KEYS.TRIPS(user.id);
    const existingStr = localStorage.getItem(tripKey);
    if (existingStr) {
      const trips: Trip[] = JSON.parse(existingStr);
      const updatedTrips = trips.map((t) =>
        t.id === trip.id ? { ...t, ...updates } : t,
      );
      localStorage.setItem(tripKey, JSON.stringify(updatedTrips));
      setTrip({ ...trip, ...updates });
    }
  };

  const handleDelete = () => {
    if (!user || !trip) return;
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this trip? This action cannot be undone.',
    );
    if (!confirmDelete) return;

    const tripKey = STORAGE_KEYS.TRIPS(user.id);
    const existingStr = localStorage.getItem(tripKey);
    if (existingStr) {
      const trips: Trip[] = JSON.parse(existingStr);
      const updatedTrips = trips.filter((t) => t.id !== trip.id);
      localStorage.setItem(tripKey, JSON.stringify(updatedTrips));

      // Also clean up budget data
      localStorage.removeItem(`lakbye_budget_${trip.id}`);

      navigate(ROUTES.DASHBOARD);
    }
  };

  if (!trip) {
    return (
      <div className="workspace-page">
        <div className="workspace-main-card">Loading settings...</div>
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

                // Recalculate nights
                const end = endDate ? new Date(endDate) : null;
                if (end && end < new Date(date)) {
                  setEndDate('');
                  saveChanges({ startDate: date, endDate: '', nights: 0 });
                } else if (end) {
                  const start = new Date(date);
                  const diffTime = Math.abs(end.getTime() - start.getTime());
                  const nights = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                  saveChanges({ startDate: date, nights });
                } else {
                  saveChanges({ startDate: date });
                }
              }}
              onEndDateChange={(date) => {
                setEndDate(date);

                if (startDate) {
                  const start = new Date(startDate);
                  const end = new Date(date);
                  const diffTime = Math.abs(end.getTime() - start.getTime());
                  const nights = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                  saveChanges({ endDate: date, nights });
                } else {
                  saveChanges({ endDate: date });
                }
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
