import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import lakbyeLogo from '../assets/lakbye-white-logo.png';
import sidebarPlanner from '../assets/sidebar-planner.png';
import sidebarBudget from '../assets/sidebar-budget.png';
import sidebarSettings from '../assets/sidebar-settings.png';
import leftArrow from '../assets/left-arrow.png';
import { Menu, X, Backpack, Download } from 'lucide-react';
import { ExportItineraryModal } from '../components';

export default function TripWorkspaceLayout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const match = location.pathname.match(/\/trip\/([^/]+)/);
  const tripId = match ? match[1] : '';

  const navItems = [
    { name: 'Planner', path: `/trip/${tripId}`, icon: sidebarPlanner },
    { name: 'Budget', path: `/trip/${tripId}/budget`, icon: sidebarBudget },
    { name: 'Packing', path: `/trip/${tripId}/packing`, isLucide: true, icon: Backpack },
    { name: 'Settings', path: `/trip/${tripId}/settings`, icon: sidebarSettings },
  ];

  return (
    <div className="workspace-layout-root">
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

      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close mobile menu"
          className="workspace-sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

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
            const IconComponent = item.isLucide ? (item.icon as React.ElementType) : null;

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`workspace-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {IconComponent ? (
                  <IconComponent
                    size={22}
                    color={
                      isActive
                        ? 'var(--color-brand-red)'
                        : 'var(--color-dash-sidebar-text)'
                    }
                    style={{ marginRight: '16px' }}
                  />
                ) : (
                  <img
                    src={item.icon as string}
                    alt={item.name}
                    className="workspace-nav-icon"
                  />
                )}
                <span className="workspace-nav-text">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Export PDF Button Docked at Bottom (#8) */}
        <div style={{ marginTop: 'auto', padding: '0 24px', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-amber-50 text-amber-700 font-semibold rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <Download size={16} /> Export PDF
          </button>
        </div>

        <div className="workspace-sidebar-bottom-divider"></div>

        <div className="workspace-logo-container">
          <Link to="/" title="Return to LakBye Home" className="dashboard-logo-link">
            <img src={lakbyeLogo} alt="LakBye Logo" className="workspace-logo" />
          </Link>
        </div>
      </aside>

      <main className="workspace-main-content">
        <Outlet />
      </main>

      <ExportItineraryModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        tripId={tripId}
      />
    </div>
  );
}
