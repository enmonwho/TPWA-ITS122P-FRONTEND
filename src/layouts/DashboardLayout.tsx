import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Ticket, Compass, Map as MapIcon, Settings, LogOut } from 'lucide-react';
import lakbyeLogo from '../assets/lakbye-dashboard.png';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
        <Link to="/dashboard" className="dashboard-mobile-logo-link">
          <img src={lakbyeLogo} alt="LakBye Logo" className="dashboard-mobile-logo" />
        </Link>
        <div className="dashboard-mobile-header-actions">
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

      {/* Sidebar (Desktop) */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo-container">
          <img src={lakbyeLogo} alt="LakBye Logo" className="dashboard-logo" />
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
