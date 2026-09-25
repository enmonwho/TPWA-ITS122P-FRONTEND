import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fbIcon from '../assets/Facebook.png';
import igIcon from '../assets/Instagram.png';
import lakbyeFooterHighres from '../assets/lakbye-footer-highres.png';
import { useAuth } from '../context/AuthContext';
import AuthPromptModal from './AuthPromptModal';

export default function Footer() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalFeature, setAuthModalFeature] = useState('Budget Tracker');

  const handleServiceClick = (
    e: React.MouseEvent,
    targetPath: string,
    featureName: string,
  ) => {
    e.preventDefault();
    if (user) {
      navigate(targetPath);
    } else {
      setAuthModalFeature(featureName);
      setIsAuthModalOpen(true);
    }
  };

  return (
    <>
      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-top-row">
            <div className="footer-brand">
              <Link to="/">
                <img
                  src={lakbyeFooterHighres}
                  alt="LakBye Travel Planner"
                  className="footer-logo-img"
                />
              </Link>
              <span className="footer-tagline">Saan aabot ang LakBye mo?</span>
            </div>

            <div className="footer-links-grid">
              <div className="footer-col">
                <h4 className="footer-col-title">Services</h4>
                <ul>
                  <li>
                    <button
                      type="button"
                      onClick={(e) =>
                        handleServiceClick(e, '/dashboard', 'Budget Tracker')
                      }
                      className="hover-underline text-left bg-transparent border-0 p-0 text-inherit font-inherit cursor-pointer"
                    >
                      Budget Tracker
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={(e) =>
                        handleServiceClick(e, '/dashboard', 'Itinerary Builder')
                      }
                      className="hover-underline text-left bg-transparent border-0 p-0 text-inherit font-inherit cursor-pointer"
                    >
                      Itinerary Builder
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={(e) =>
                        handleServiceClick(e, '/dashboard/map', 'Trip Journal')
                      }
                      className="hover-underline text-left bg-transparent border-0 p-0 text-inherit font-inherit cursor-pointer"
                    >
                      Trip Journal
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={(e) =>
                        handleServiceClick(
                          e,
                          '/dashboard/explore',
                          'Interactive Travel Map',
                        )
                      }
                      className="hover-underline text-left bg-transparent border-0 p-0 text-inherit font-inherit cursor-pointer"
                    >
                      Interactive Travel Map
                    </button>
                  </li>
                </ul>
              </div>

              <div className="footer-col">
                <h4 className="footer-col-title">Resources</h4>
                <ul>
                  <li>
                    <Link to="#" className="hover-underline">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link to="#" className="hover-underline">
                      Give Us Feedback
                    </Link>
                  </li>
                  <li>
                    <Link to="#" className="hover-underline">
                      Contact Us
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="footer-col">
                <h4 className="footer-col-title">Find Us At</h4>
                <div className="footer-socials">
                  <Link to="#" className="footer-social-link">
                    <img src={fbIcon} alt="Facebook" />
                    <span>LakBye</span>
                  </Link>
                  <Link to="#" className="footer-social-link">
                    <img src={igIcon} alt="Instagram" />
                    <span>LakBye</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-bottom-row">
            <hr className="footer-divider" />
            <span className="footer-copyright">
              LakBye Travel Planner. Est. 2026. All Rights Reserved.
            </span>
          </div>
        </div>
      </footer>

      {/* Auth Prompt Modal for unauthenticated visitors */}
      <AuthPromptModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        featureName={authModalFeature}
      />
    </>
  );
}
