import React from 'react';
import { Link } from 'react-router-dom';
import CloudDoodle from './CloudDoodle';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';

const CTASection: React.FC = () => {
  const { user } = useAuth();
  const planTarget = user ? ROUTES.DASHBOARD : ROUTES.SIGN_UP;

  return (
    <section className="cta-section">
      <CloudDoodle id={3} top="15%" left="5%" width="130px" opacity={0.6} />
      <CloudDoodle id={4} bottom="10%" right="-2%" width="200px" opacity={0.5} />
      <CloudDoodle id={1} top="50%" left="-3%" width="150px" opacity={0.4} />
      <CloudDoodle id={2} bottom="25%" left="15%" width="110px" opacity={0.3} />
      <CloudDoodle id={5} top="5%" left="80%" width="100px" opacity={0.9} />
      <CloudDoodle id={1} top="30%" left="70%" width="150px" opacity={1} />
      <div className="cta-container">
        <h2 className="cta-heading">Join us now!</h2>
        <p className="cta-subheading">Start your travel journey</p>
        <div>
          <Link to={planTarget} className="btn-signup hover-lift">
            Start Planning
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
