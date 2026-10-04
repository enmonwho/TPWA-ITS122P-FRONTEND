import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Pencil, Camera, Lock, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';
import type { Trip } from '../types/trip';
import type { TripWorkspaceOutletContext } from '../layouts/TripWorkspaceLayout';
import { getCachedTrip, setCachedTrip } from '../lib/tripCache';
import { CountryAutocomplete, DateRangePicker } from '../components';
import { tripsApi } from '../services/api';
import {
  mergeTripWithExtras,
  saveTripExtras,
  deleteTripExtras,
  compressImage,
} from '../lib/tripExtras';
import { formatUserDateRange, toApiDate } from '../lib/formatters';
import {
  normalizeCountryRoute,
  type CountryId,
  type CountryRouteEntry,
} from '../lib/countries';
import { getPersistedCoverReference } from '../lib/coverPhoto';

type TravelType = 'Solo' | 'Couple' | 'Friends' | 'Family' | '';

export function Settings() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outlet = useOutletContext<TripWorkspaceOutletContext | undefined>();
  const cached = outlet?.trip || (tripId ? getCachedTrip(tripId) : null);

  const [trip, setTrip] = useState<Trip | null>(() => cached);
  const [loading, setLoading] = useState(() => !cached);

  // Form states
  const [tripName, setTripName] = useState(() => cached?.name || '');
  const [selectedCountries, setSelectedCountries] = useState<CountryId[]>(
    () => cached?.countryRoute?.map((country) => country.countryId) || [],
  );
  const [startDate, setStartDate] = useState(() =>
    cached ? toApiDate(cached.startDate) : '',
  );
  const [endDate, setEndDate] = useState(() => (cached ? toApiDate(cached.endDate) : ''));
  const [travelType, setTravelType] = useState<TravelType>(
    () => (cached?.travelType as TravelType) || '',
  );
  const [coverPhoto, setCoverPhoto] = useState(() => cached?.cover_photo || '');
  const [visibility, setVisibility] = useState(() => cached?.visibility || 'private');
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (!user || !tripId) return;
    let cancelled = false;

    const fetchTrip = async () => {
      if (!cached) {
        setLoading(true);
      }
      try {
        const apiTrip = await tripsApi.getTrip(tripId);
        if (cancelled) return;

        const merged = mergeTripWithExtras(apiTrip);
        setTrip(merged);
        setCachedTrip(tripId, merged);
        if (outlet?.setTrip) outlet.setTrip(merged);

        setTripName(merged.name);
        setSelectedCountries(merged.countryRoute.map((country) => country.countryId));
        setStartDate(toApiDate(merged.startDate));
        setEndDate(toApiDate(merged.endDate));
        setTravelType((merged.travelType as TravelType) || '');
        setCoverPhoto(merged.cover_photo || '');
        setVisibility(merged.visibility || 'private');
      } catch {
        /* ignore fetch cancellation or load errors */
        if (!cancelled && !cached) setTrip(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrip();
    return () => {
      cancelled = true;
    };
  }, [user, tripId, cached, outlet]);

  const saveChanges = async (
    updates: Partial<
      Trip & {
        coverPhoto?: string;
        visibility?: string;
        countryRoute?: CountryRouteEntry[];
      }
    >,
  ) => {
    if (!trip || !tripId) return false;
    setSaveStatus('Saving...');

    const apiPayload: Record<string, unknown> = {};
    if (updates.name !== undefined) apiPayload.title = updates.name;
    if (updates.startDate !== undefined) apiPayload.start_date = updates.startDate;
    if (updates.endDate !== undefined) apiPayload.end_date = updates.endDate;
    if (updates.status !== undefined) apiPayload.status = updates.status;
    if (updates.totalBudget !== undefined) apiPayload.total_budget = updates.totalBudget;
    if (updates.coverPhoto !== undefined) apiPayload.cover_photo = updates.coverPhoto;
    if (updates.visibility !== undefined) apiPayload.visibility = updates.visibility;

    if (
      updates.countries !== undefined ||
      updates.countryRoute !== undefined ||
      updates.travelType !== undefined
    ) {
      const extrasUpdate: Parameters<typeof saveTripExtras>[1] = {};
      if (updates.countryRoute !== undefined) {
        extrasUpdate.countryRoute = updates.countryRoute;
      } else if (updates.countries !== undefined) {
        extrasUpdate.countries = updates.countries;
      }
      if (updates.travelType !== undefined) extrasUpdate.travelType = updates.travelType;
      saveTripExtras(tripId, extrasUpdate);
    }

    if (Object.keys(apiPayload).length > 0) {
      try {
        const updatedTrip = await tripsApi.updateTrip(tripId, apiPayload);
        if (updates.coverPhoto !== undefined) {
          const persistedCover = getPersistedCoverReference(updatedTrip.cover_photo);
          if (!persistedCover) {
            throw new Error('The server did not persist the uploaded cover photo.');
          }
          saveTripExtras(tripId, { coverPhoto: persistedCover });
          setCoverPhoto(persistedCover);
        }
        const merged = mergeTripWithExtras(updatedTrip);
        setTrip(merged);
        setCachedTrip(tripId, merged);
        if (outlet?.setTrip) outlet.setTrip(merged);
        setSaveStatus('Saved!');
        setTimeout(() => setSaveStatus(''), 2000);
        return true;
      } catch (err) {
        console.warn('API update failed:', err);
        setSaveStatus('Error saving');
        setTimeout(() => setSaveStatus(''), 2000);
        return false;
      }
    } else {
      const nextTrip = { ...trip, ...updates } as Trip;
      setTrip(nextTrip);
      setCachedTrip(tripId, nextTrip);
      if (outlet?.setTrip) outlet.setTrip(nextTrip);
      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 2000);
      return true;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Image file must be smaller than 15MB.');
      return;
    }

    try {
      setSaveStatus('Optimizing image...');
      // Compress and resize image to web-optimized dimensions (< 120KB)
      const compressed = await compressImage(file, 1280, 720, 0.78);
      await saveChanges({ coverPhoto: compressed });
    } catch (err) {
      console.error('Failed to process cover photo:', err);
      setSaveStatus('Error saving');
      setTimeout(() => setSaveStatus(''), 2000);
    } finally {
      e.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!trip || !tripId) return;
    if (
      !window.confirm(
        'Are you sure you want to delete this trip? This action cannot be undone.',
      )
    )
      return;
    try {
      await tripsApi.deleteTrip(tripId);
      deleteTripExtras(tripId);
      localStorage.removeItem(`lakbye_budget_${tripId}`);
      navigate(ROUTES.DASHBOARD);
    } catch {
      alert('Failed to delete trip.');
    }
  };

  if (loading && !trip)
    return (
      <div className="workspace-page">
        <div className="workspace-main-card">Loading settings...</div>
      </div>
    );
  if (!trip)
    return (
      <div className="workspace-page">
        <div className="workspace-main-card">Trip not found.</div>
      </div>
    );

  const travelTypes: TravelType[] = ['Solo', 'Couple', 'Friends', 'Family'];

  return (
    <div className="workspace-page">
      <header className="workspace-header-card animate-slide-up">
        <h1 className="workspace-trip-title">{trip.name}</h1>
        <div className="workspace-header-actions">
          <div className="workspace-pill-date">
            {formatUserDateRange(trip.startDate, trip.endDate)}
          </div>
        </div>
      </header>

      <div
        className="workspace-main-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '48px 32px',
        }}
      >
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <div className="flex justify-between items-center mb-8">
            <h2
              style={{
                fontSize: '32px',
                fontWeight: 600,
                margin: 0,
                fontFamily: 'SF Pro Rounded, sans-serif',
              }}
            >
              Trip Settings
            </h2>
            {saveStatus && (
              <span className="text-sm font-medium text-emerald-600">{saveStatus}</span>
            )}
          </div>

          <div className="form-group mb-8">
            <div className="form-label">Trip Cover Photo</div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
              }}
              style={{
                width: '100%',
                height: '180px',
                borderRadius: '16px',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                cursor: 'pointer',
                overflow: 'hidden',
                border: '2px dashed #cbd5e1',
              }}
              title="Upload cover photo"
            >
              {coverPhoto ? (
                <img
                  src={coverPhoto}
                  alt="Trip Cover"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <Camera size={32} className="mb-2" />
                  <span className="text-sm font-medium">Click to upload cover</span>
                </div>
              )}
              {coverPhoto && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    width: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    padding: '8px 0',
                  }}
                >
                  <span className="text-xs text-white font-medium flex items-center gap-2">
                    <Camera size={14} /> Change Cover Photo
                  </span>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/webp"
              style={{ display: 'none' }}
            />
          </div>

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
                  if (tripName.trim() !== trip.name && tripName.trim() !== '')
                    saveChanges({ name: tripName.trim() });
                  else if (tripName.trim() === '') setTripName(trip.name);
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
            <div className="form-label">Privacy & Visibility</div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setVisibility('private');
                  saveChanges({ visibility: 'private' });
                }}
                className={`px-3 py-3 rounded-xl flex flex-col items-center gap-1 border transition-all ${visibility === 'private' ? 'bg-amber-50 border-amber-600 text-amber-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                <Lock size={18} />
                <span className="text-xs font-semibold">Private</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setVisibility('public');
                  saveChanges({ visibility: 'public' });
                }}
                className={`px-3 py-3 rounded-xl flex flex-col items-center gap-1 border transition-all ${visibility === 'public' ? 'bg-amber-50 border-amber-600 text-amber-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                <Globe size={18} />
                <span className="text-xs font-semibold">Public</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {visibility === 'private'
                ? 'Only you can see this trip.'
                : 'Anyone browsing destinations can see your public itinerary.'}
            </p>
          </div>

          <div className="form-group">
            <div className="form-label">Which countries are you going to?</div>
            <CountryAutocomplete
              value={selectedCountries}
              onChange={(countryIds) => {
                const countryRoute = normalizeCountryRoute(countryIds);
                setSelectedCountries(countryIds);
                saveChanges({
                  countries: countryRoute.map((country) => country.name),
                  countryRoute,
                });
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
                } else saveChanges({ startDate: date });
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
