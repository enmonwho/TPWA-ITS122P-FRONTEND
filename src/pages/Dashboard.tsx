import { useState, useEffect } from 'react';
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
import { ROUTES } from '../lib/constants';
import { tripsApi } from '../services/api';
import { mergeTripsWithExtras } from '../lib/tripExtras';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);

  // Fetch trips from backend when user is available
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const fetchTrips = async () => {
      try {
        const apiTrips = await tripsApi.getTrips();
        if (!cancelled) {
          setTrips(mergeTripsWithExtras(apiTrips));
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load trips';
          setError(msg);
          setLoading(false);
          console.error('Failed to fetch trips:', err);
        }
      }
    };

    fetchTrips();
    return () => {
      cancelled = true;
    };
  }, [user]);

  /**
   * Map backend status to display categories.
   * planning/confirmed → 'upcoming', ongoing → 'ongoing', completed/cancelled → 'completed'
   */
  const getDisplayStatus = (trip: Trip): string => {
    switch (trip.status) {
      case 'planning':
      case 'confirmed':
        return 'upcoming';
      case 'ongoing':
        return 'ongoing';
      case 'completed':
      case 'cancelled':
        return 'completed';
      default:
        return 'upcoming';
    }
  };

  const filteredTrips = trips.filter((trip) => {
    if (activeTab === 'all') return true;
    return getDisplayStatus(trip) === activeTab;
  });

  const firstName = user?.full_name?.split(' ')[0] || 'Traveler';

  // Compute stats from real trip data
  const countriesExplored = Array.from(
    new Set(trips.flatMap((t) => t.countries || [])),
  ).length;
  const totalBookings = trips.length;
  const nextTrip = trips
    .filter((t) => getDisplayStatus(t) === 'upcoming')
    .sort((a, b) => (a.daysUntil || 9999) - (b.daysUntil || 9999))[0];
  const daysUntilNextTrip =
    nextTrip?.daysUntil !== undefined ? nextTrip.daysUntil.toString() : 'N/A';
  const totalSpent = trips.reduce((sum, t) => sum + (t.totalBudget || 0), 0);

  /** Called by CreateTripModal after successful API creation to refresh the list. */
  const handleTripCreated = () => {
    if (user) {
      tripsApi
        .getTrips()
        .then((apiTrips) => setTrips(mergeTripsWithExtras(apiTrips)))
        .catch(console.error);
    }
  };

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
            value={totalSpent > 0 ? totalSpent.toLocaleString() : '0.00'}
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
              {loading ? (
                <div className="dashboard-empty-state">
                  <p className="dashboard-empty-text">Loading trips...</p>
                </div>
              ) : error ? (
                <div className="dashboard-empty-state">
                  <h3 className="dashboard-empty-title">Something went wrong</h3>
                  <p className="dashboard-empty-text">{error}</p>
                </div>
              ) : filteredTrips.length === 0 ? (
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
                  {filteredTrips.map((trip) => {
                    const displayStatus = getDisplayStatus(trip);
                    return (
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

                        {displayStatus === 'upcoming' ? (
                          <>
                            <div className="trip-badge-container">
                              <div className="trip-badge trip-badge--upcoming">
                                UPCOMING
                              </div>
                            </div>
                            <div className="trip-badge-container">
                              <div className="trip-badge trip-badge--countdown">
                                {trip.daysUntil !== undefined
                                  ? `In ${trip.daysUntil} Day/s`
                                  : 'TBD'}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="trip-badge-container">
                              <div className="trip-badge trip-badge--completed">
                                {displayStatus === 'ongoing' ? 'ONGOING' : 'COMPLETED'}
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateTripModal
        isOpen={isCreateTripModalOpen}
        onClose={() => setIsCreateTripModalOpen(false)}
        onTripCreated={handleTripCreated}
      />
    </div>
  );
}
