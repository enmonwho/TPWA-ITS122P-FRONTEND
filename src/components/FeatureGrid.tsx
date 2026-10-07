import React from 'react';
import CloudDoodle from './CloudDoodle';
import budgetIcon from '../assets/budget.png';
import builderIcon from '../assets/builder.png';
import journalIcon from '../assets/journal.png';
import mapIcon from '../assets/map.png';

const FeatureGrid: React.FC = () => {
  return (
    <section className="feature-section">
      <CloudDoodle id={1} top="5%" left="2%" width="140px" opacity={0.4} />
      <CloudDoodle id={2} bottom="5%" right="1%" width="200px" opacity={0.5} />
      <CloudDoodle id={3} top="35%" right="15%" width="110px" opacity={0.3} />
      <CloudDoodle id={5} bottom="30%" left="-2%" width="160px" opacity={0.4} />
      <CloudDoodle id={4} top="45%" left="20%" width="90px" opacity={0.3} />

      <div className="landing-services-header">
        <h2>
          <span className="text-gradient-brand"> LakBye </span> has you covered
        </h2>
        <p>
          From planning your next destination to organizing your activities, LakBye helps
          turn your travel ideas into unforgettable adventures.
        </p>
      </div>

      <div className="feature-cards-grid">
        <div
          className="feature-card"
          style={{ backgroundColor: 'var(--color-feature-gold)' }}
        >
          <div className="feature-card-heading">
            <img
              src={budgetIcon}
              alt=""
              aria-hidden="true"
              className="feature-card-icon"
            />
            <h3>Budget Tracker</h3>
          </div>
          <p className="feature-card-desc">
            Track expenses, manage travel funds, and stay comfortably within your budget
            limits.
          </p>
        </div>

        <div
          className="feature-card"
          style={{ backgroundColor: 'var(--color-feature-orange)' }}
        >
          <div className="feature-card-heading">
            <img
              src={builderIcon}
              alt=""
              aria-hidden="true"
              className="feature-card-icon"
            />
            <h3>Itinerary Builder</h3>
          </div>
          <p className="feature-card-desc">
            Organize daily routes, schedules, and must-visit spots seamlessly in one
            place.
          </p>
        </div>

        <div
          className="feature-card"
          style={{ backgroundColor: 'var(--color-feature-red)' }}
        >
          <div className="feature-card-heading">
            <img
              src={journalIcon}
              alt=""
              aria-hidden="true"
              className="feature-card-icon"
            />
            <h3>Trip Journal</h3>
          </div>
          <p className="feature-card-desc">
            Document your travel memories, milestones, and personal experiences along the
            way.
          </p>
        </div>

        <div
          className="feature-card"
          style={{ backgroundColor: 'var(--color-feature-blue)' }}
        >
          <div className="feature-card-heading">
            <img src={mapIcon} alt="" aria-hidden="true" className="feature-card-icon" />
            <h3>Interactive Travel Map</h3>
          </div>
          <p className="feature-card-desc">
            Visualize destinations, pinned places, and custom travel routes across the
            globe.
          </p>
        </div>
      </div>
    </section>
  );
};

export default FeatureGrid;
