import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronDown } from 'lucide-react';
import { COUNTRIES } from '../constants/countries';
import { CalendarPopover } from './';
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
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);

  const [endDate, setEndDate] = useState('');
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [travelType, setTravelType] = useState<TravelType>('');

  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Close country dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(e.target as Node)
      ) {
        setShowCountryDropdown(false);
      }
    };
    if (showCountryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCountryDropdown]);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setTripName('');
      setSelectedCountries([]);
      setCountrySearch('');
      setShowCountryDropdown(false);
      setStartDate('');
      setShowStartDatePicker(false);
      setEndDate('');
      setShowEndDatePicker(false);
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

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return COUNTRIES.filter((c) => !selectedCountries.includes(c));
    const lowerSearch = countrySearch.toLowerCase();
    return COUNTRIES.filter(
      (c) => c.toLowerCase().includes(lowerSearch) && !selectedCountries.includes(c),
    );
  }, [countrySearch, selectedCountries]);

  const handleCountrySelect = (country: string) => {
    setSelectedCountries((prev) => [...prev, country]);
    setCountrySearch('');
    setShowCountryDropdown(false);
  };

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
          <div
            className="input-gradient-border"
            style={{
              borderColor: errors.countries ? 'red' : undefined,
              position: 'relative',
            }}
            ref={countryDropdownRef}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
              {selectedCountries.length > 0 && (
                <span
                  style={{
                    color: 'var(--color-neutral-950)',
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '15px',
                    fontWeight: 500,
                    marginRight: '8px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '150px',
                  }}
                  title={selectedCountries.join(', ')}
                >
                  {selectedCountries.join(', ')}
                </span>
              )}
              <input
                id="countries"
                type="text"
                className="modal-input"
                placeholder={selectedCountries.length > 0 ? '' : 'Select countries'}
                value={countrySearch}
                onFocus={() => setShowCountryDropdown(true)}
                onChange={(e) => {
                  setCountrySearch(e.target.value);
                  setShowCountryDropdown(true);
                  if (errors.countries)
                    setErrors((prev) => ({ ...prev, countries: false }));
                }}
                style={{ flex: 1, minWidth: '50px' }}
              />
            </div>

            <div
              style={{
                width: '1px',
                height: '24px',
                backgroundColor: 'rgba(0,0,0,0.35)',
                margin: '0 12px',
              }}
            ></div>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
              }}
              onClick={() => setShowCountryDropdown((prev) => !prev)}
            >
              <ChevronDown size={14} color="var(--color-neutral-950)" />
            </button>

            {/* Autocomplete Dropdown */}
            {showCountryDropdown && (
              <div
                className="popover-container"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '8px',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  zIndex: 50,
                  padding: '8px 0',
                }}
              >
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((c) => (
                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                    <div
                      key={c}
                      className="country-suggestion-item"
                      onClick={() => handleCountrySelect(c)}
                    >
                      {c}
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      padding: '8px 12px',
                      color: 'var(--color-neutral-500)',
                      fontSize: '14px',
                    }}
                  >
                    No matching countries.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="startDate">
            Travel Dates
          </label>
          <div className="date-inputs-row">
            <div
              className="input-gradient-border"
              style={{
                flex: 1,
                borderColor: errors.startDate ? 'red' : undefined,
                position: 'relative',
              }}
            >
              <input
                id="startDate"
                type="text"
                readOnly
                className="modal-input"
                placeholder="Start Date"
                value={startDate}
                onClick={() => {
                  setShowStartDatePicker(true);
                  setShowEndDatePicker(false);
                }}
                style={{ cursor: 'pointer' }}
              />
              {showStartDatePicker && (
                <div className="popover-container">
                  <CalendarPopover
                    selectedDate={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      setShowStartDatePicker(false);
                      if (errors.startDate)
                        setErrors((prev) => ({ ...prev, startDate: false }));
                      // Reset end date if it's before new start date
                      if (endDate && new Date(endDate) < new Date(date)) {
                        setEndDate('');
                      }
                    }}
                    onClose={() => setShowStartDatePicker(false)}
                  />
                </div>
              )}
            </div>
            <span
              style={{
                fontFamily: 'SF Pro Rounded, sans-serif',
                fontWeight: 500,
                fontSize: '16px',
              }}
            >
              to
            </span>
            <div
              className="input-gradient-border"
              style={{
                flex: 1,
                borderColor: errors.endDate ? 'red' : undefined,
                position: 'relative',
              }}
            >
              <input
                type="text"
                readOnly
                aria-label="End Date"
                className="modal-input"
                placeholder="End Date"
                value={endDate}
                onClick={() => {
                  setShowEndDatePicker(true);
                  setShowStartDatePicker(false);
                }}
                style={{ cursor: 'pointer' }}
              />
              {showEndDatePicker && (
                <div className="popover-container">
                  <CalendarPopover
                    selectedDate={endDate}
                    minDate={startDate}
                    onSelect={(date) => {
                      setEndDate(date);
                      setShowEndDatePicker(false);
                      if (errors.endDate)
                        setErrors((prev) => ({ ...prev, endDate: false }));
                    }}
                    onClose={() => setShowEndDatePicker(false)}
                  />
                </div>
              )}
            </div>
          </div>
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
