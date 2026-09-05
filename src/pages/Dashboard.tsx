import { useState } from 'react';
import type { Trip } from '../types/trip';
import { Globe, Ticket, Hourglass, Wallet, User } from 'lucide-react';
import StatCard from '../components/StatCard';
import CreateTripModal from '../components/CreateTripModal';
import planNowIcon from '../assets/plan-now.svg';
import tripSchedIcon from '../assets/trip-sched.svg';
import totalSpentIcon from '../assets/total-spent.svg';
import createTripBtnIcon from '../assets/create-trip-button.svg';
import browseDestIcon from '../assets/browse-destination.svg';

export default function Dashboard() {
  const [trips] = useState<Trip[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);

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
            title={
              <>
                Start
                <br />
                exploring
              </>
            }
            subtitle="Countries Explored"
          />
          <StatCard
            gradient="--gradient-stat-bookings"
            icon={
              <Ticket size={148} strokeWidth={1} className="dash-stat-icon-bookings" />
            }
            title={
              <>
                Plan one
                <br />
                now
              </>
            }
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
            title={
              <>
                None
                <br />
                scheduled
              </>
            }
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

            {trips.length === 0 && (
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
            )}
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
