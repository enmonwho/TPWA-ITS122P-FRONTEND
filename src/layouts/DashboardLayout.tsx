import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, CalendarCheck, Compass, Map, Settings, LogOut } from 'lucide-react';
import lakbyeLogo from '../assets/lakbye-dashboard.svg';

export default function DashboardLayout() {
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: Home },
    { name: 'Bookings', path: '/dashboard/bookings', icon: CalendarCheck },
    { name: 'Explore', path: '/dashboard/explore', icon: Compass },
    { name: 'Map', path: '/dashboard/map', icon: Map },
  ];

  return (
    <div className="dashboard-layout-root">
      {/* Sidebar */}
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
                className={`dashboard-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span className="dashboard-nav-text">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="dashboard-divider dashboard-divider-margin"></div>

        <div className="dashboard-bottom-actions">
          <button className="dashboard-action-btn">
            <Settings size={20} />
            <span className="dashboard-nav-text">Settings</span>
          </button>
          <button className="dashboard-action-btn">
            <LogOut size={20} />
            <span className="dashboard-nav-text">Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main-content">
        <Outlet />
      </main>
    </div>
  );
}
