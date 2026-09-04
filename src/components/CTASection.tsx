import React from 'react';
import { Link } from 'react-router';
import CloudDoodle from './CloudDoodle';

const CTASection: React.FC = () => {
  return (
    <section className="cta-section">
      <CloudDoodle id={3} top="15%" left="5%" width="130px" opacity={0.6} />
      <CloudDoodle id={4} bottom="10%" right="-2%" width="200px" opacity={0.5} />
      <CloudDoodle id={1} top="50%" left="-3%" width="150px" opacity={0.4} />
      <CloudDoodle id={2} bottom="25%" left="15%" width="110px" opacity={0.3} />

      <div className="cta-container">
        <h2 className="cta-heading">Join us now!</h2>
        <p className="cta-subheading">Start your travel journey</p>
        <Link
          to="#"
          className="submit-button"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
        >
          Start Planning
        </Link>
      </div>
    </section>
  );
};

export default CTASection;
