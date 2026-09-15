import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, LogOut, ChevronDown } from 'lucide-react';
import lakByeImg from '../assets/lakbye-logo.png';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';

/**
 * Header — top-level landing page navigation bar.
 * Renders guest auth buttons (Log In / Sign Up) when unauthenticated,
 * and authenticated user greeting + clickable avatar dropdown when logged in.
 */
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  // Close mobile menu and dropdown on navigation
  const handleLinkClick = () => {
    setMenuOpen(false);
    setDropdownOpen(false);
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    setMenuOpen(false);
    await logout();
    navigate(ROUTES.HOME);
  };

  // Extract first name for "Hello, {firstName}"
  const firstName = user?.full_name ? user.full_name.trim().split(/\s+/)[0] : 'Traveler';

  // Compute initials
  const initials = user?.full_name
    ? user.full_name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  // Role-based dashboard route & label
  const role = user?.role?.toLowerCase() || '';
  const dashboardRoute =
    role === 'admin' ? ROUTES.ADMIN : role === 'staff' ? ROUTES.STAFF : ROUTES.DASHBOARD;

  const dashboardLabel =
    role === 'admin'
      ? 'Admin Dashboard'
      : role === 'staff'
        ? 'Staff Dashboard'
        : 'Dashboard';

  const roleDisplay =
    role === 'admin' ? 'Admin' : role === 'staff' ? 'Staff' : 'Customer';

  return (
    <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
      <nav className="nav-container" aria-label="Main navigation">
        <Link to="/" className="logo" onClick={handleLinkClick}>
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

        {/* Desktop & Mobile Navigation Links / Auth Controls */}
        <div className={`auth-links${menuOpen ? ' auth-links--open' : ''}`}>
          {isLoading ? (
            <div className="header-auth-skeleton" aria-hidden="true" />
          ) : user ? (
            <div className="header-user-menu-container" ref={dropdownRef}>
              {/* Authenticated Trigger: "Hello, {firstName}" + Clickable Icon */}
              <button
                type="button"
                className={`header-user-trigger${dropdownOpen ? ' active' : ''}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                id="header-user-menu-button"
              >
                <span className="header-greeting">
                  Hello, <span className="header-greeting-name">{firstName}</span>
                </span>
                <span className="header-avatar-circle" aria-hidden="true">
                  {initials}
                </span>
                <ChevronDown
                  size={16}
                  className={`header-chevron${dropdownOpen ? ' rotated' : ''}`}
                  aria-hidden="true"
                />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div
                  className="header-dropdown-menu"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="header-user-menu-button"
                >
                  <div className="header-dropdown-profile">
                    <div className="header-dropdown-avatar">{initials}</div>
                    <div className="header-dropdown-info">
                      <p className="header-dropdown-name">{user.full_name}</p>
                      <p className="header-dropdown-email">{user.email}</p>
                    </div>
                    <span className={`header-role-badge badge-${role}`}>
                      {roleDisplay}
                    </span>
                  </div>

                  <div className="header-dropdown-divider" />

                  <Link
                    to={dashboardRoute}
                    className="header-dropdown-item"
                    role="menuitem"
                    onClick={handleLinkClick}
                    id="header-nav-dashboard"
                  >
                    <LayoutDashboard size={18} className="header-dropdown-icon" />
                    <span>{dashboardLabel}</span>
                  </Link>

                  <Link
                    to={ROUTES.PROFILE_SETTINGS}
                    className="header-dropdown-item"
                    role="menuitem"
                    onClick={handleLinkClick}
                    id="header-nav-settings"
                  >
                    <Settings size={18} className="header-dropdown-icon" />
                    <span>Settings</span>
                  </Link>

                  <div className="header-dropdown-divider" />

                  <button
                    type="button"
                    className="header-dropdown-item header-dropdown-logout"
                    role="menuitem"
                    onClick={handleLogout}
                    id="header-nav-logout"
                  >
                    <LogOut size={18} className="header-dropdown-icon" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="btn-login hover-underline"
                onClick={handleLinkClick}
                id="header-btn-login"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="btn-signup hover-lift"
                onClick={handleLinkClick}
                id="header-btn-signup"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
