import { Link } from 'react-router';
import fbIcon from '../assets/Facebook.png';
import igIcon from '../assets/Instagram.png';
import lakbyeFooterHighres from '../assets/lakbye-footer-highres.png';

export default function Footer() {
  return (
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
                  <Link to="#">Itinerary Builder</Link>
                </li>
                <li>
                  <Link to="#">Budget Tracker</Link>
                </li>
                <li>
                  <Link to="#">Other Services</Link>
                </li>
                <li>
                  <Link to="#">Other Services</Link>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">Resources</h4>
              <ul>
                <li>
                  <Link to="#">About Us</Link>
                </li>
                <li>
                  <Link to="#">Give Us Feedback</Link>
                </li>
                <li>
                  <Link to="#">Contact Us</Link>
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
  );
}
