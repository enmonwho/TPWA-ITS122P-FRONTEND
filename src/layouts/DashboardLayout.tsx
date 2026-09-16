import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import lakbyeLogo from '../assets/lakbye-dashboard.png';
import sidebarHome from '../assets/sidebar-home.png';
import sidebarBookings from '../assets/sidebar-bookings.png';
import sidebarExplore from '../assets/sidebar-explore.png';
import sidebarMap from '../assets/sidebar-map.png';
import sidebarSettings from '../assets/sidebar-settings.png';
import sidebarLogout from '../assets/sidebar-logout.png';
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
    { name: 'Home', path: '/dashboard', icon: sidebarHome },
    { name: 'Bookings', path: '/dashboard/bookings', icon: sidebarBookings },
    { name: 'Explore', path: '/dashboard/explore', icon: sidebarExplore },
    { name: 'Map', path: '/dashboard/map', icon: sidebarMap },
  ];

  return (
    <div className="dashboard-layout-root">
      {/* Mobile Top Header (≤768px) */}
      <header className="dashboard-mobile-header">
        <Link to="/dashboard" className="dashboard-mobile-logo-link">
          <img src={lakbyeLogo} alt="LakBye Logo" className="dashboard-mobile-logo" />
        </Link>
        <Link
          to={ROUTES.CUSTOMER_PROFILE}
          className="dashboard-mobile-avatar-btn"
          aria-label="View Profile"
        >
          <span className="dashboard-mobile-avatar-fallback">
            {(user?.full_name || 'U').charAt(0).toUpperCase()}
          </span>
        </Link>
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
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <img src={item.icon} alt={item.name} />
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
            <img src={sidebarSettings} alt="Settings" />
            <span className="sidebar-nav-text">Settings</span>
          </Link>
          <button className="sidebar-nav-item" onClick={handleLogout}>
            <img src={sidebarLogout} alt="Log out" />
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
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`dashboard-mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <img src={item.icon} alt={item.name} />
              <span className="dashboard-mobile-nav-label">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
