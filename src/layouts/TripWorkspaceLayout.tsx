import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import lakbyeLogo from '../assets/lakbye-white-logo.png';
import sidebarPlanner from '../assets/sidebar-planner.png';
import sidebarBudget from '../assets/sidebar-budget.png';
import sidebarSettings from '../assets/sidebar-settings.png';
import leftArrow from '../assets/left-arrow.png';
import { Menu, X } from 'lucide-react';

export default function TripWorkspaceLayout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Parse out tripId to build relative active links
  const match = location.pathname.match(/\/trip\/([^/]+)/);
  const tripId = match ? match[1] : '';

  const navItems = [
    { name: 'Planner', path: `/trip/${tripId}`, icon: sidebarPlanner },
    { name: 'Budget', path: `/trip/${tripId}/budget`, icon: sidebarBudget },
    { name: 'Settings', path: `/trip/${tripId}/settings`, icon: sidebarSettings },
  ];

  return (
    <div className="workspace-layout-root">
      {/* Mobile Header for Hamburger (Visible only < 768px) */}
      <div className="workspace-mobile-header">
        <button
          className="workspace-mobile-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X size={24} color="var(--color-neutral-950)" />
          ) : (
            <Menu size={24} color="var(--color-neutral-950)" />
          )}
        </button>
        <span className="workspace-mobile-title">LakBye Workspace</span>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close mobile menu"
          className="workspace-sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`workspace-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="workspace-sidebar-top-divider"></div>

        <Link to="/dashboard" className="workspace-back-link">
          <img src={leftArrow} alt="Back" className="workspace-back-icon" />
          <div className="workspace-back-text-group">
            <span className="workspace-back-text-small">Back to</span>
            <span className="workspace-back-text-large">Home</span>
          </div>
        </Link>

        <div className="workspace-sidebar-mid-divider"></div>

        <nav className="workspace-nav">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`workspace-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <img src={item.icon} alt={item.name} className="workspace-nav-icon" />
                <span className="workspace-nav-text">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="workspace-sidebar-bottom-divider"></div>

        <div className="workspace-logo-container">
          <img src={lakbyeLogo} alt="LakBye Logo" className="workspace-logo" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="workspace-main-content">
        <Outlet />
      </main>
    </div>
  );
}
