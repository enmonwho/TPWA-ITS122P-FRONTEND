import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import lakByeImg from '../assets/lakbye-logo.png';

/**
 * Header — top-level navigation bar.
 * Placeholder: add nav links, auth controls, etc. when features are built.
 */
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route navigation
  const handleLinkClick = () => setMenuOpen(false);

  return (
    <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
      <nav className="nav-container" aria-label="Main navigation">
        <Link to="/" className="logo">
          <img src={lakByeImg} alt="LakBye Logo" className="header-logo-img" />
        </Link>

        <button
          className="mobile-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          <span className={`hamburger-icon${menuOpen ? ' open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>

        <div className={`auth-links${menuOpen ? ' auth-links--open' : ''}`}>
          <Link to="/login" className="btn-login" onClick={handleLinkClick}>
            Log In
          </Link>
          <Link to="/signup" className="btn-signup" onClick={handleLinkClick}>
            Sign Up
          </Link>
        </div>
      </nav>
    </header>
  );
}
