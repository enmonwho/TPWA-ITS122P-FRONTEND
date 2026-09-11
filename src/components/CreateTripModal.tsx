import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { CountryAutocomplete, DateRangePicker } from './';
import { useAuth } from '../context/AuthContext';
import { ROUTES, STORAGE_KEYS } from '../lib/constants';
import type { Trip } from '../types/trip';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TravelType = 'Solo' | 'Couple' | 'Friends' | 'Family' | '';

export default function CreateTripModal({ isOpen, onClose }: CreateTripModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tripName, setTripName] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelType, setTravelType] = useState<TravelType>('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setTripName('');
      setSelectedCountries([]);
      setStartDate('');
      setEndDate('');
      setTravelType('');
      setErrors({});
    }
  }

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  const handleStartPlanning = () => {
    const newErrors: Record<string, boolean> = {};
    if (!tripName.trim()) newErrors.tripName = true;
    if (selectedCountries.length === 0) newErrors.countries = true;
    if (!startDate) newErrors.startDate = true;
    if (!endDate) newErrors.endDate = true;
    if (!travelType) newErrors.travelType = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Calculate nights
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const nights = Math.max(0, diffDays);

    const newTrip: Trip = {
      id: Date.now().toString(),
      name: tripName.trim(),
      countries: selectedCountries,
      startDate,
      endDate,
      travelType,
      status: 'upcoming',
      nights,
    };

    if (user) {
      const tripKey = STORAGE_KEYS.TRIPS(user.id);
      const existingStr = localStorage.getItem(tripKey);
      const existingTrips: Trip[] = existingStr ? JSON.parse(existingStr) : [];
      existingTrips.push(newTrip);
      localStorage.setItem(tripKey, JSON.stringify(existingTrips));
    }

    onClose();
    navigate(ROUTES.TRIP(newTrip.id));
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const travelTypes: TravelType[] = ['Solo', 'Couple', 'Friends', 'Family'];

  if (!isOpen) return null;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <button className="modal-close-btn" onClick={onClose}>
          <X size={11} color="var(--color-neutral-950)" />
        </button>

        <div className="form-group">
          <label className="form-label" htmlFor="tripName">
            Trip Name
          </label>
          <div
            className="input-gradient-border"
            style={{ borderColor: errors.tripName ? 'red' : undefined }}
          >
            <input
              id="tripName"
              type="text"
              className="modal-input"
              placeholder="Enter a trip name"
              value={tripName}
              onChange={(e) => {
                setTripName(e.target.value);
                if (errors.tripName) setErrors((prev) => ({ ...prev, tripName: false }));
              }}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="countries">
            Which countries are you going to?
          </label>
          <CountryAutocomplete
            value={selectedCountries}
            onChange={(countries) => {
              setSelectedCountries(countries);
              if (errors.countries) setErrors((prev) => ({ ...prev, countries: false }));
            }}
            error={errors.countries}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="startDate">
            Travel Dates
          </label>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(date) => {
              setStartDate(date);
              if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: false }));
              if (endDate && new Date(endDate) < new Date(date)) {
                setEndDate('');
              }
            }}
            onEndDateChange={(date) => {
              setEndDate(date);
              if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: false }));
            }}
            errorStart={errors.startDate}
            errorEnd={errors.endDate}
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
            style={{
              border: errors.travelType ? '1px solid red' : 'none',
              padding: errors.travelType ? '4px' : '0',
              borderRadius: errors.travelType ? '67px' : '0',
            }}
          >
            {travelTypes.map((type) => (
              <button
                key={type}
                className={`chip-button ${travelType === type ? 'selected' : ''}`}
                onClick={() => {
                  setTravelType(type);
                  if (errors.travelType)
                    setErrors((prev) => ({ ...prev, travelType: false }));
                }}
                aria-pressed={travelType === type}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <button className="modal-cta-btn" onClick={handleStartPlanning}>
          Start Planning
        </button>
      </div>
    </div>
  );
}
