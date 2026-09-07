import { useState } from 'react';
import addMembersIcon from '../assets/add-members.png';
import routeIcon from '../assets/route.png';
import dayByDayIcon from '../assets/day-by-day.png';
import magnifierIcon from '../assets/magnifier.png';
import { MapPlaceholder } from '../components';

export default function TripWorkspace() {
  const [activeTab, setActiveTab] = useState('route');

  return (
    <div className="workspace-page">
      {/* Header Card */}
      <header className="workspace-header-card animate-slide-up">
        <h1 className="workspace-trip-title">Trip Name</h1>

        <div className="workspace-header-actions">
          <button className="workspace-pill-members">
            <img src={addMembersIcon} alt="" className="workspace-add-members-icon" />
            Add Members
          </button>
          <button className="workspace-pill-date">Date - Date</button>
          <button className="workspace-share-btn">Share</button>
        </div>
      </header>

      {/* Main Workspace Card */}
      <div className="workspace-main-card">
        {/* Itinerary Zone (Left) */}
        <div className="workspace-itinerary-zone animate-slide-up delay-150">
          <div className="workspace-tabs-container">
            <button
              className={`pill-tab ${activeTab === 'route' ? 'pill-tab--active' : ''}`}
              onClick={() => setActiveTab('route')}
            >
              <img src={routeIcon} alt="" className="workspace-tab-icon" />
              Route
            </button>
            <button
              className={`pill-tab ${activeTab === 'day' ? 'pill-tab--active' : ''}`}
              onClick={() => setActiveTab('day')}
            >
              <img src={dayByDayIcon} alt="" className="workspace-tab-icon" />
              Day by day
            </button>
          </div>

          <div className="workspace-itinerary-table">
            <div className="workspace-table-header-row">
              <div className="workspace-col-destination">Destination</div>
              <div className="workspace-col-nights">Nights</div>
              <div className="workspace-col-accommodation">Accommodation</div>
              <div className="workspace-col-activities">Activities</div>
              <div className="workspace-col-transportation">Transportation</div>
            </div>

            <div className="workspace-add-destination-row">
              <img src={magnifierIcon} alt="Search" className="workspace-search-icon" />
              <input
                type="text"
                placeholder="Add destination..."
                className="workspace-add-input"
              />
            </div>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="workspace-vertical-divider"></div>

        {/* Map Zone (Right) */}
        <div className="workspace-map-zone animate-slide-up delay-300">
          <MapPlaceholder />
        </div>
      </div>
    </div>
  );
}
