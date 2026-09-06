import { useState } from 'react';
import type { Trip } from '../types/trip';
import { Globe, Ticket, Hourglass, Wallet, User, MoreVertical } from 'lucide-react';
import StatCard from '../components/StatCard';
import CreateTripModal from '../components/CreateTripModal';
import planNowIcon from '../assets/plan-now.svg';
import tripSchedIcon from '../assets/trip-sched.svg';
import totalSpentIcon from '../assets/total-spent.svg';
import createTripBtnIcon from '../assets/create-trip-button.svg';
import browseDestIcon from '../assets/browse-destination.svg';

export default function Dashboard() {
  const [trips] = useState<Trip[]>([
    {
      id: '1',
      name: 'Japan Trip',
      countries: ['Japan'],
      startDate: 'Oct 12',
      endDate: 'Oct 18',
      travelType: 'Leisure',
      status: 'upcoming',
      nights: 6,
      daysUntil: 2,
    },
    {
      id: '2',
      name: 'Seoul Getaway',
      countries: ['South Korea'],
      startDate: 'Nov 01',
      endDate: 'Nov 05',
      travelType: 'Leisure',
      status: 'upcoming',
      nights: 4,
      daysUntil: 22,
    },
    {
      id: '3',
      name: 'Bali Retreat',
      countries: ['Indonesia'],
      startDate: 'Aug 10',
      endDate: 'Aug 15',
      travelType: 'Leisure',
      status: 'completed',
      nights: 5,
    },
  ]);
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);

  const filteredTrips = trips.filter((trip) => {
    if (activeTab === 'all') return true;
    return trip.status === activeTab;
  });

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Greeting Header */}
        <div className="dashboard-greeting">
          <span>Greetings,</span>
          <span className="dashboard-greeting-name">Juan!</span>
        </div>

        {/* Stat Cards */}
        <div className="dashboard-stats-row">
          <StatCard
            gradient="--gradient-stat-countries"
            icon={
              <Globe size={175} strokeWidth={1} className="dash-stat-icon-countries" />
            }
            value="1"
            subtitle="Countries Explored"
          />
          <StatCard
            gradient="--gradient-stat-bookings"
            icon={
              <Ticket size={148} strokeWidth={1} className="dash-stat-icon-bookings" />
            }
            value="5"
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
            value="70h 39m 10s"
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
          <div className="dashboard-profile-section">
            <div className="dashboard-profile-header">
              <div className="dashboard-profile-avatar">
                <User size={32} color="#666" />
              </div>
              <div>
                <div className="dashboard-profile-name">Juan Dela Cruz</div>
                <div className="dashboard-profile-location">Philippines</div>
              </div>
            </div>
            <div className="dashboard-profile-stats">
              <div className="dashboard-profile-stat-item">
                <div className="dashboard-profile-stat-value">0</div>
                <div className="dashboard-profile-stat-label">Trips</div>
              </div>
              <div className="dashboard-profile-stat-divider"></div>
              <div className="dashboard-profile-stat-item">
                <div className="dashboard-profile-stat-value">0</div>
                <div className="dashboard-profile-stat-label">Journal Entry</div>
              </div>
            </div>
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
                      className="dashboard-btn-create"
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
                    <div key={trip.id} className="dashboard-trip-row">
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
                        onClick={() => console.log('Options clicked')}
                      >
                        <MoreVertical size={20} color="#000" />
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
