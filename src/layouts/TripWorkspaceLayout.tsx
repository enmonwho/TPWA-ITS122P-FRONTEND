import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import lakbyeLogo from '../assets/lakbye-logo.png';
import sidebarPlanner from '../assets/sidebar-planner.png';
import sidebarBudget from '../assets/sidebar-budget.png';
import sidebarSettings from '../assets/sidebar-settings.png';
import leftArrow from '../assets/left-arrow.png';
import { Menu, X, Backpack } from 'lucide-react';
import { tripsApi } from '../services/api';
import { mergeTripWithExtras } from '../lib/tripExtras';
import { getCachedTrip, setCachedTrip } from '../lib/tripCache';
import type { Trip } from '../types/trip';

export interface TripWorkspaceOutletContext {
  trip: Trip | null;
  setTrip: React.Dispatch<React.SetStateAction<Trip | null>>;
  tripId: string;
}

export default function TripWorkspaceLayout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const match = location.pathname.match(/\/trip\/([^/]+)/);
  const tripId = match ? match[1] : '';

  const [trip, setTrip] = useState<Trip | null>(() => getCachedTrip(tripId));

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;

    const loadTrip = async () => {
      try {
        const apiTrip = await tripsApi.getTrip(tripId);
        if (cancelled) return;
        const merged = mergeTripWithExtras(apiTrip);
        setCachedTrip(tripId, merged);
        setTrip(merged);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to pre-fetch trip in TripWorkspaceLayout:', err);
        }
      }
    };

    loadTrip();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

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
                    size={20}
                    color={
                      isActive
                        ? 'var(--color-brand-red)'
                        : 'var(--color-dash-sidebar-text)'
                    }
                    className="workspace-nav-icon shrink-0"
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

        <div className="workspace-sidebar-bottom-divider"></div>

        <div className="workspace-logo-container">
          <Link to="/" title="Return to LakBye Home" className="dashboard-logo-link">
            <img src={lakbyeLogo} alt="LakBye Logo" className="workspace-logo" />
          </Link>
        </div>
      </aside>

      <main className="workspace-main-content">
        <Outlet
          context={{ trip, setTrip, tripId } satisfies TripWorkspaceOutletContext}
        />
      </main>
    </div>
  );
}
