import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import GlobeMap from '../components/GlobeMap';
import magnifierIcon from '../assets/magnifier.png';
import { tripsApi, destinationsApi } from '../services/api';
import type { Destination } from '../types/destination';
import '../styles/Explore.css';

export default function Explore() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [activeRegion, setActiveRegion] = useState('All');
  const [isStartTripOpen, setIsStartTripOpen] = useState(false);

  // Modal form states
  const [tripName, setTripName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelType, setTravelType] = useState('Solo');
  const [submitting, setSubmitting] = useState(false);

  const countryScrollRef = useRef<HTMLDivElement>(null);
  const islandScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadDestinations = async () => {
      const data = await destinationsApi.getAll();
      if (data && data.length > 0) {
        setDestinations(data);
        setSelectedLocation(data[0].location_name);
      } else {
        setDestinations([
          {
            id: 1,
            trip_id: null,
            location_name: 'Japan',
            latitude: 35.6895,
            longitude: 139.6917,
            order_sequence: 1,
          },
          {
            id: 2,
            trip_id: null,
            location_name: 'Palawan',
            latitude: 9.8349,
            longitude: 118.7384,
            order_sequence: 2,
          },
          {
            id: 3,
            trip_id: null,
            location_name: 'Boracay',
            latitude: 11.9674,
            longitude: 121.9248,
            order_sequence: 3,
          },
          {
            id: 4,
            trip_id: null,
            location_name: 'Italy',
            latitude: 41.9028,
            longitude: 12.4964,
            order_sequence: 4,
          },
          {
            id: 5,
            trip_id: null,
            location_name: 'Maldives',
            latitude: 3.2028,
            longitude: 73.2207,
            order_sequence: 5,
          },
        ]);
        setSelectedLocation('Japan');
      }
    };
    loadDestinations();
  }, []);

  const scrollContainer = (
    ref: React.RefObject<HTMLDivElement | null>,
    offset: number,
  ) => {
    if (ref.current) {
      ref.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const globeMarkers = destinations.map((d) => ({
    id: String(d.id),
    lng: Number(d.longitude),
    lat: Number(d.latitude),
    title: d.location_name,
  }));

  const filteredDestinations = destinations.filter((d) =>
    d.location_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleStartPlanning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripName.trim() || !startDate || !endDate) return;

    setSubmitting(true);
    try {
      const newTrip = await tripsApi.createTrip({
        title: tripName,
        start_date: startDate,
        end_date: endDate,
        total_budget: 15000,
        status: 'planning',
      });
      setIsStartTripOpen(false);
      navigate(`/trip/${newTrip.id}`);
    } catch (err) {
      console.error('Failed to create trip:', err);
      setIsStartTripOpen(false);
      navigate('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="explore-page-wrapper">
      <div className="explore-container-card">
        <div className="explore-scroll-pane">
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">
            Where to next?
          </h1>

          <div className="explore-search-input-box">
            <img src={magnifierIcon} alt="" className="w-5 h-5 opacity-50" />
            <input
              type="text"
              className="w-full bg-transparent outline-none text-sm font-medium text-stone-800 placeholder-stone-400"
              placeholder="Search..."
              value={searchQuery}
              aria-label="Search destinations"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-2">
              <h2 className="text-lg font-bold text-stone-900">Most Popular</h2>
              <span className="text-xs font-semibold text-stone-600">Month Year</span>
            </div>
            <div className="explore-popular-card" />
          </div>

          <div>
            <h2 className="text-base font-bold text-stone-900">
              Choose Your Companion, Find Your Destination
            </h2>
            <p className="text-xs text-stone-400 mb-3">
              Wherever you're going and whoever's coming along, find the ideal country for
              your next trip.
            </p>
            <div className="companion-grid">
              {['Solo', 'Couple', 'Friends', 'Family'].map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => {
                    setTravelType(type);
                    setIsStartTripOpen(true);
                  }}
                  className="companion-btn-card text-left"
                >
                  <span>
                    {type === 'Friends' ? 'Friend\nGetaway' : `${type}\nRetreat`}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-base font-bold text-stone-900">All Countries</h2>
            <p className="text-xs text-stone-400 mb-3">
              {filteredDestinations.length} destinations to travel to
            </p>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {['All', 'Europe', 'Asia', 'Americas', 'Africa', 'Oceania', 'Others'].map(
                (region) => (
                  <button
                    key={region}
                    type="button"
                    onClick={() => setActiveRegion(region)}
                    className={`region-chip-btn ${activeRegion === region ? 'active' : ''}`}
                  >
                    <span>{region}</span>
                  </button>
                ),
              )}
            </div>

            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() => scrollContainer(countryScrollRef, -240)}
                className="carousel-arrow-btn"
                aria-label="Scroll left"
              >
                ‹
              </button>
              <div
                ref={countryScrollRef}
                className="flex gap-4 overflow-x-auto py-2 no-scrollbar scroll-smooth flex-1"
              >
                {filteredDestinations.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className="carousel-card text-left"
                    onClick={() => {
                      setSelectedLocation(item.location_name);
                      setTripName(`Trip to ${item.location_name}`);
                      setIsStartTripOpen(true);
                    }}
                  >
                    <div className="carousel-thumb" />
                    <span className="carousel-label">{item.location_name}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => scrollContainer(countryScrollRef, 240)}
                className="carousel-arrow-btn"
                aria-label="Scroll right"
              >
                ›
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-base font-bold text-stone-900">Top Islands to Explore</h2>
            <p className="text-xs text-stone-400 mb-3">
              Discover breathtaking island getaways
            </p>

            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => scrollContainer(islandScrollRef, -240)}
                className="carousel-arrow-btn"
                aria-label="Scroll islands left"
              >
                ‹
              </button>
              <div
                ref={islandScrollRef}
                className="flex gap-4 overflow-x-auto py-2 no-scrollbar scroll-smooth flex-1"
              >
                {filteredDestinations.map((island) => (
                  <button
                    type="button"
                    key={`island-${island.id}`}
                    className="carousel-card text-left"
                    onClick={() => {
                      setSelectedLocation(island.location_name);
                      setTripName(`Escape to ${island.location_name}`);
                      setIsStartTripOpen(true);
                    }}
                  >
                    <div className="carousel-thumb" />
                    <span className="carousel-label">{island.location_name}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => scrollContainer(islandScrollRef, 240)}
                className="carousel-arrow-btn"
                aria-label="Scroll islands right"
              >
                ›
              </button>
            </div>
          </div>

          <div className="explore-cta-banner">
            <p className="explore-cta-text">
              Start a new adventure and LakBye will handle your itineraries, stays, and
              budget all in one place.
            </p>
            <button
              onClick={() => setIsStartTripOpen(true)}
              className="btn-lakbye-gradient"
            >
              <span>+</span>
              <span>Start a Trip</span>
            </button>
          </div>
        </div>

        <div className="explore-map-sticky-panel">
          <GlobeMap markers={globeMarkers} />
        </div>
      </div>

      {isStartTripOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-trip-title"
        >
          <button
            type="button"
            className="modal-backdrop-dismiss"
            aria-label="Close modal"
            onClick={() => setIsStartTripOpen(false)}
          />
          <div className="start-trip-modal-card">
            <button
              type="button"
              onClick={() => setIsStartTripOpen(false)}
              className="modal-close-btn"
              aria-label="Close modal"
            >
              ✕
            </button>
            <h2 id="start-trip-title" className="text-lg font-bold text-stone-900 mb-3">
              Start a Trip
            </h2>

            <form onSubmit={handleStartPlanning} className="flex flex-col gap-5">
              <div>
                <label htmlFor="explore-trip-name" className="modal-label">
                  Trip Name
                </label>
                <input
                  id="explore-trip-name"
                  type="text"
                  required
                  className="modal-input-gradient"
                  placeholder="Enter a trip name"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="explore-destination-country" className="modal-label">
                  Which countries are you going to?
                </label>
                <div className="relative">
                  <select
                    id="explore-destination-country"
                    className="modal-input-gradient appearance-none pr-10 cursor-pointer"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                  >
                    {destinations.map((d) => (
                      <option key={d.id} value={d.location_name}>
                        {d.location_name}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-700 text-xs">
                    ▼
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="explore-start-date" className="modal-label">
                  Travel Dates
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="explore-start-date"
                    type="date"
                    required
                    className="modal-input-gradient flex-1 text-sm"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span className="text-sm font-medium text-stone-900">to</span>
                  <input
                    id="explore-end-date"
                    type="date"
                    required
                    aria-label="End date"
                    className="modal-input-gradient flex-1 text-sm"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <span className="modal-label">Travel Type</span>
                <div className="travel-type-container">
                  {['Solo', 'Couple', 'Friends', 'Family'].map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setTravelType(type)}
                      className={`travel-type-pill ${travelType === type ? 'active' : ''}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center mt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-start-planning-modal"
                >
                  {submitting ? 'Starting...' : 'Start Planning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
