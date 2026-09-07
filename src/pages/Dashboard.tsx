import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trip } from '../types/trip';
import { Globe, Ticket, Hourglass, Wallet, User, MoreVertical } from 'lucide-react';
import StatCard from '../components/StatCard';
import CreateTripModal from '../components/CreateTripModal';
import planNowIcon from '../assets/plan-now.svg';
import tripSchedIcon from '../assets/trip-sched.svg';
import totalSpentIcon from '../assets/total-spent.svg';
import createTripBtnIcon from '../assets/create-trip-button.svg';
import browseDestIcon from '../assets/browse-destination.svg';
import { useAuth } from '../context/AuthContext';
import { ROUTES, STORAGE_KEYS } from '../lib/constants';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [prevUserId, setPrevUserId] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);

  // Recommended React pattern: update state during render when derived from props/context
  if (user?.id !== prevUserId) {
    setPrevUserId(user?.id);
    if (user) {
      const tripKey = STORAGE_KEYS.TRIPS(user.id);
      const savedTrips = localStorage.getItem(tripKey);
      if (savedTrips) {
        setTrips(JSON.parse(savedTrips));
      } else {
        // Fallback to empty if no real trips yet
        setTrips([]);
      }
    } else {
      setTrips([]);
    }
  }

  const filteredTrips = trips.filter((trip) => {
    if (activeTab === 'all') return true;
    return trip.status === activeTab;
  });

  const firstName = user?.full_name?.split(' ')[0] || 'Traveler';

  // Compute stats from real trip data
  const countriesExplored = Array.from(
    new Set(trips.flatMap((t) => t.countries || [])),
  ).length;
  const totalBookings = trips.length;
  const nextTrip = trips
    .filter((t) => t.status === 'upcoming')
    .sort((a, b) => (a.daysUntil || 9999) - (b.daysUntil || 9999))[0];
  const daysUntilNextTrip =
    nextTrip?.daysUntil !== undefined ? nextTrip.daysUntil.toString() : 'N/A';

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Greeting Header */}
        <div className="dashboard-greeting">
          <span>Greetings,</span>
          <span
            className="dashboard-greeting-name"
            style={{ filter: "url('#text-inner-shadow')" }}
          >
            {firstName}!
          </span>
        </div>

        {/* Stat Cards */}
        <div className="dashboard-stats-row">
          <StatCard
            gradient="--gradient-stat-countries"
            icon={
              <Globe size={175} strokeWidth={1} className="dash-stat-icon-countries" />
            }
            value={countriesExplored.toString()}
            subtitle="Countries Explored"
          />
          <StatCard
            gradient="--gradient-stat-bookings"
            icon={
              <Ticket size={148} strokeWidth={1} className="dash-stat-icon-bookings" />
            }
            value={totalBookings.toString()}
            subtitle="Bookings"
            iconButton={planNowIcon}
          />
          <StatCard
            gradient="--gradient-stat-countdown"
            icon={
              <Hourglass
                size={148}
                strokeWidth={1}
                className="dash-stat-icon-countdown"
              />
            }
            value={daysUntilNextTrip}
            subtitle="Until Next Trip"
            iconButton={tripSchedIcon}
          />
          <StatCard
            gradient="--gradient-stat-spent"
            icon={<Wallet size={161} strokeWidth={1} className="dash-stat-icon-spent" />}
            value="0.00"
            subtitle="Total Spent"
            iconButton={totalSpentIcon}
          />
        </div>

        <div className="dashboard-bottom-row">
          {/* Profile Section */}
          <div className="dashboard-profile-column">
            <div className="dashboard-profile-section">
              <div className="dashboard-profile-header">
                <div className="dashboard-profile-avatar">
                  <User size={32} color="var(--color-neutral-500)" />
                </div>
                <div>
                  <div className="dashboard-profile-name">
                    {user?.full_name || 'Traveler'}
                  </div>
                  <div className="dashboard-profile-location">Not specified</div>
                </div>
              </div>
              <div className="dashboard-profile-stats">
                <div className="dashboard-profile-stat-item">
                  <div className="dashboard-profile-stat-value">{trips.length}</div>
                  <div className="dashboard-profile-stat-label">Trips</div>
                </div>
                <div className="dashboard-profile-stat-divider"></div>
                <div className="dashboard-profile-stat-item">
                  <div className="dashboard-profile-stat-value">{totalBookings}</div>
                  <div className="dashboard-profile-stat-label">Journal Entry</div>
                </div>
              </div>
            </div>
            {filteredTrips.length > 0 && (
              <button
                onClick={() => setIsCreateTripModalOpen(true)}
                className="btn-create-trip dashboard-profile-btn-create"
              >
                <img src={createTripBtnIcon} alt="" />
                Create a Trip
              </button>
            )}
          </div>

          {/* Trips Section */}
          <div className="dashboard-trips-section">
            <div className="dashboard-trips-filters">
              <button
                className={`dashboard-filter-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All Trips
              </button>
              <button
                className={`dashboard-filter-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                Upcoming
              </button>
              <button
                className={`dashboard-filter-btn ${activeTab === 'past' ? 'active' : ''}`}
                onClick={() => setActiveTab('past')}
              >
                Past
              </button>
            </div>

            <div className="dashboard-trips-card">
              {filteredTrips.length === 0 ? (
                <div className="dashboard-empty-state">
                  <h3 className="dashboard-empty-title">No trips yet?</h3>
                  <p className="dashboard-empty-text">
                    Start a new adventure and LakBye will handle your itineraries, stays,
                    and budget all in one place.
                  </p>
                  <div className="dashboard-empty-actions">
                    <button
                      onClick={() => setIsCreateTripModalOpen(true)}
                      className="btn-create-trip dashboard-btn-create"
                    >
                      <img src={createTripBtnIcon} alt="" />
                      Create a Trip
                    </button>
                    <button className="dashboard-btn-browse">
                      <img src={browseDestIcon} alt="" />
                      Browse Destinations
                    </button>
                  </div>
                </div>
              ) : (
                <div className="dashboard-trip-list">
                  {filteredTrips.map((trip) => (
                    <div
                      key={trip.id}
                      className="dashboard-trip-row"
                      onClick={() => navigate(ROUTES.TRIP(trip.id))}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          navigate(ROUTES.TRIP(trip.id));
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="trip-row-name">{trip.name}</div>

                      {trip.status === 'upcoming' ? (
                        <>
                          <div className="trip-badge-container">
                            <div className="trip-badge trip-badge--upcoming">
                              UPCOMING
                            </div>
                          </div>
                          <div className="trip-badge-container">
                            <div className="trip-badge trip-badge--countdown">
                              In {trip.daysUntil} Day/s
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="trip-badge-container">
                            <div className="trip-badge trip-badge--completed">
                              COMPLETED
                            </div>
                          </div>
                          <div className="trip-badge-spacer"></div>
                        </>
                      )}

                      <div className="trip-badge-container">
                        <div className="trip-badge trip-badge--date">
                          {trip.startDate} - {trip.endDate}
                        </div>
                      </div>
                      <div className="trip-badge-container">
                        <div className="trip-badge trip-badge--nights">
                          {trip.nights} Nights
                        </div>
                      </div>

                      <button
                        className="trip-row-options"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Options clicked');
                        }}
                      >
                        <MoreVertical size={20} color="var(--color-neutral-950)" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateTripModal
        isOpen={isCreateTripModalOpen}
        onClose={() => setIsCreateTripModalOpen(false)}
      />
    </div>
  );
}
