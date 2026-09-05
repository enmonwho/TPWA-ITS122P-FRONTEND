import { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TravelType = 'Solo' | 'Couple' | 'Friends' | 'Family' | '';

export default function CreateTripModal({ isOpen, onClose }: CreateTripModalProps) {
  const [tripName, setTripName] = useState('');
  const [countries, setCountries] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelType, setTravelType] = useState<TravelType>('');

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleStartPlanning = () => {
    console.log({
      tripName,
      countries,
      startDate,
      endDate,
      travelType,
    });
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const travelTypes: TravelType[] = ['Solo', 'Couple', 'Friends', 'Family'];

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <button className="modal-close-btn" onClick={onClose}>
          <X size={11} color="#000" />
        </button>

        <div className="form-group">
          <label className="form-label" htmlFor="tripName">
            Trip Name
          </label>
          <div className="input-gradient-border">
            <input
              id="tripName"
              type="text"
              className="modal-input"
              placeholder="Enter a trip name"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="countries">
            Which countries are you going to?
          </label>
          <div className="input-gradient-border">
            <input
              id="countries"
              type="text"
              className="modal-input"
              placeholder="Select countries"
              value={countries}
              onChange={(e) => setCountries(e.target.value)}
            />
            <div
              style={{
                width: '1px',
                height: '24px',
                backgroundColor: 'rgba(0,0,0,0.35)',
                margin: '0 12px',
              }}
            ></div>
            <ChevronDown size={14} color="#000" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="startDate">
            Travel Dates
          </label>
          <div className="date-inputs-row">
            <div className="input-gradient-border" style={{ flex: 1 }}>
              <input
                id="startDate"
                type="text"
                className="modal-input"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
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
            <div className="input-gradient-border" style={{ flex: 1 }}>
              <input
                type="text"
                aria-label="End Date"
                className="modal-input"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
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
          >
            {travelTypes.map((type) => (
              <button
                key={type}
                className={`chip-button ${travelType === type ? 'selected' : ''}`}
                onClick={() => setTravelType(type)}
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
