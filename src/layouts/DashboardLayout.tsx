import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Ticket,
  Compass,
  Map as MapIcon,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowLeft,
} from 'lucide-react';
import lakbyeLogo from '../assets/lakbye-dashboard.png';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.LOGIN);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: Home },
    { name: 'Bookings', path: '/dashboard/bookings', icon: Ticket },
    { name: 'Explore', path: '/dashboard/explore', icon: Compass },
    { name: 'Map', path: '/dashboard/map', icon: MapIcon },
  ];

  return (
    <div className="dashboard-layout-root">
      {/* Mobile Top Header (≤768px) */}
      <header className="dashboard-mobile-header">
        <Link
          to="/"
          className="dashboard-mobile-logo-link"
          title="Return to LakBye Home"
          aria-label="LakBye Home"
        >
          <img src={lakbyeLogo} alt="LakBye Logo" className="dashboard-mobile-logo" />
        </Link>
        <div className="dashboard-mobile-header-actions">
          <button
            type="button"
            className="dashboard-mobile-menu-btn"
            onClick={() => setIsMobileDrawerOpen((prev) => !prev)}
            aria-label="Toggle navigation drawer"
            title="Menu"
          >
            {isMobileDrawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link
            to={ROUTES.CUSTOMER_PROFILE}
            className="dashboard-mobile-avatar-btn"
            aria-label="View Profile"
            title="Profile & Settings"
          >
            <span className="dashboard-mobile-avatar-fallback">
              {(user?.full_name || 'U').charAt(0).toUpperCase()}
            </span>
          </Link>
          <button
            type="button"
            className="dashboard-mobile-logout-btn"
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* Collapsible Mobile Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div
          className="dashboard-mobile-drawer-overlay"
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Collapsible Mobile Drawer */}
      <aside
        className={`dashboard-mobile-drawer ${isMobileDrawerOpen ? 'open' : ''}`}
        aria-label="Mobile Navigation Drawer"
      >
        <div className="dashboard-mobile-drawer-header">
          <Link
            to="/"
            className="dashboard-mobile-drawer-logo"
            onClick={() => setIsMobileDrawerOpen(false)}
            title="Return to LakBye Home"
          >
            <img src={lakbyeLogo} alt="LakBye Logo" className="dashboard-mobile-logo" />
          </Link>
          <button
            type="button"
            className="dashboard-mobile-drawer-close"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Card */}
        <div className="dashboard-mobile-drawer-user">
          <div className="dashboard-mobile-avatar-btn">
            <span className="dashboard-mobile-avatar-fallback">
              {(user?.full_name || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="dashboard-mobile-drawer-user-info">
            <span className="dashboard-mobile-drawer-user-name">
              {user?.full_name || 'Traveler'}
            </span>
            <span className="dashboard-mobile-drawer-user-email">
              {user?.email || 'Logged in traveler'}
            </span>
          </div>
        </div>

        <div className="dashboard-drawer-divider" />

        {/* Navigation Items */}
        <div className="dashboard-mobile-drawer-nav">
          {/* Explicit Exit to Home navigation item */}
          <Link
            to="/"
            className="dashboard-mobile-drawer-item exit-to-home"
            onClick={() => setIsMobileDrawerOpen(false)}
          >
            <ArrowLeft size={19} />
            <span>Exit to Home</span>
          </Link>

          <div className="dashboard-mobile-drawer-section-label">Main Menu</div>

          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (location.pathname === '/dashboard' && item.path === '/dashboard');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`dashboard-mobile-drawer-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsMobileDrawerOpen(false)}
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div className="dashboard-mobile-drawer-section-label">Account</div>

          <Link
            to={ROUTES.PROFILE_SETTINGS}
            className={`dashboard-mobile-drawer-item ${
              location.pathname === ROUTES.PROFILE_SETTINGS ? 'active' : ''
            }`}
            onClick={() => setIsMobileDrawerOpen(false)}
          >
            <Settings size={19} />
            <span>Profile & Settings</span>
          </Link>
        </div>

        <div className="dashboard-mobile-drawer-footer">
          <button
            type="button"
            className="dashboard-mobile-drawer-logout-btn"
            onClick={() => {
              setIsMobileDrawerOpen(false);
              handleLogout();
            }}
          >
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Sidebar (Desktop) */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo-container">
          <Link
            to="/"
            className="dashboard-logo-link"
            title="Return to LakBye Home"
            aria-label="LakBye Home"
          >
            <img src={lakbyeLogo} alt="LakBye Logo" className="dashboard-logo" />
          </Link>
        </div>
        <div className="dashboard-divider"></div>

        <nav className="dashboard-nav">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (location.pathname === '/dashboard' && item.path === '/dashboard');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} strokeWidth={2} />
                <span className="sidebar-nav-text">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="dashboard-divider dashboard-divider-margin"></div>

        <div className="dashboard-bottom-actions">
          <Link
            to={ROUTES.PROFILE_SETTINGS}
            className={`sidebar-nav-item ${location.pathname === ROUTES.PROFILE_SETTINGS ? 'active' : ''}`}
          >
            <Settings size={20} strokeWidth={2} />
            <span className="sidebar-nav-text">Settings</span>
          </Link>
          <button className="sidebar-nav-item" onClick={handleLogout}>
            <LogOut size={20} strokeWidth={2} />
            <span className="sidebar-nav-text">Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main-content">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation (≤768px) */}
      <nav className="dashboard-mobile-bottom-nav">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (location.pathname === '/dashboard' && item.path === '/dashboard');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`dashboard-mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={22} strokeWidth={2} />
              <span className="dashboard-mobile-nav-label">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
