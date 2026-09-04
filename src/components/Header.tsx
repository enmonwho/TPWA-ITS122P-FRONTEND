import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import lakByeImg from '../assets/lakbye-logo.png';

/**
 * Header — top-level navigation bar.
 * Placeholder: add nav links, auth controls, etc. when features are built.
 */
export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
      <nav className="nav-container" aria-label="Main navigation">
        <Link to="/" className="logo">
          <img
            src={lakByeImg}
            alt="LakBye Logo"
            style={{ height: '65px', display: 'block' }}
          />
        </Link>

        <div className="auth-links">
          <Link to="/login" className="btn-login">
            Log In
          </Link>
          <Link to="/signup" className="btn-signup">
            Sign Up
          </Link>
        </div>
      </nav>
    </header>
  );
}
