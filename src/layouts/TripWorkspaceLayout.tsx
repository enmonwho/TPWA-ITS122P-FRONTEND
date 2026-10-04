import React, { useState, useEffect } from 'react';
import {
  Outlet,
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import lakbyeLogo from '../assets/lakbye-white-logo.png';
import sidebarPlanner from '../assets/sidebar-planner.png';
import sidebarBudget from '../assets/sidebar-budget.png';
import sidebarSettings from '../assets/sidebar-settings.png';
import leftArrow from '../assets/left-arrow.png';
import {
  Menu,
  X,
  Backpack,
  ChevronLeft,
  Route as RouteIcon,
  CalendarDays,
  Wallet,
  ListChecks,
} from 'lucide-react';
import { tripsApi } from '../services/api';
import { mergeTripWithExtras } from '../lib/tripExtras';
import { getCachedTrip, setCachedTrip } from '../lib/tripCache';
import type { Trip } from '../types/trip';
import { useAuth } from '../context/AuthContext';

export interface TripWorkspaceOutletContext {
  trip: Trip | null;
  setTrip: React.Dispatch<React.SetStateAction<Trip | null>>;
  tripId: string;
}

export default function TripWorkspaceLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
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

  const isBudget = location.pathname.endsWith('/budget');
  const isPacking = location.pathname.endsWith('/packing');
  const isSettings = location.pathname.endsWith('/settings');
  const currentTab = searchParams.get('tab');

  let viewSubtitle = 'Route Planner';
  if (isBudget) {
    viewSubtitle = 'Budget';
  } else if (isPacking) {
    viewSubtitle = 'Packing';
  } else if (isSettings) {
    viewSubtitle = 'Settings';
  } else if (currentTab === 'day') {
    viewSubtitle = 'Day by Day';
  }

  const userInitial = (user?.full_name?.trim() || user?.username || 'J')
    .charAt(0)
    .toUpperCase();
  const userAvatar = (user as { avatar_url?: string } | null)?.avatar_url;

  const mobileNavItems = [
    {
      id: 'route',
      label: 'Route',
      path: `/trip/${tripId}`,
      isActive: !isBudget && !isPacking && !isSettings && currentTab !== 'day',
      icon: RouteIcon,
    },
    {
      id: 'days',
      label: 'Days',
      path: `/trip/${tripId}?tab=day`,
      isActive: !isBudget && !isPacking && !isSettings && currentTab === 'day',
      icon: CalendarDays,
    },
    {
      id: 'budget',
      label: 'Budget',
      path: `/trip/${tripId}/budget`,
      isActive: isBudget,
      icon: Wallet,
    },
    {
      id: 'packing',
      label: 'Packing',
      path: `/trip/${tripId}/packing`,
      isActive: isPacking,
      icon: ListChecks,
    },
  ];

  return (
    <div className="workspace-layout-root">
      {/* Approved Compact Mobile Header (Figma source of truth) */}
      <header className="workspace-mobile-header-bar md:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-stone-200/70 sticky top-0 z-30 shadow-xs w-full">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            aria-label="Back to dashboard"
            className="p-1 -ml-1 text-[#2F1B0C] hover:opacity-75 transition-opacity flex-shrink-0"
          >
            <ChevronLeft size={26} strokeWidth={2.5} />
          </button>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[#2F1B0C] text-[17px] leading-tight truncate">
              {trip?.name || 'Spain Adventure'}
            </span>
            <span className="text-xs text-stone-500 font-medium">{viewSubtitle}</span>
          </div>
        </div>
        <div className="w-9 h-9 rounded-full border-2 border-[#E9724C] bg-white flex items-center justify-center font-bold text-sm text-[#E9724C] shadow-sm flex-shrink-0 overflow-hidden ml-2">
          {userAvatar ? (
            <img src={userAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            userInitial
          )}
        </div>
      </header>

      {/* Legacy hamburger drawer overlay (hidden on modern mobile) */}
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

      {/* Desktop Sidebar (Preserved unchanged) */}
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

      {/* Approved Mobile Bottom Workspace Navigation (Figma source of truth) */}
      <nav
        aria-label="Trip workspace navigation"
        className="workspace-mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200/80 px-2 py-1 flex items-center justify-around z-30 shadow-lg"
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              className="flex flex-col items-center justify-center flex-1 py-1"
            >
              <div
                className={`w-11 h-7 flex items-center justify-center transition-all ${
                  item.isActive ? 'mobile-nav-active-pill' : 'mobile-nav-inactive-pill'
                }`}
              >
                <Icon
                  size={19}
                  className={item.isActive ? 'text-[#255F85]' : 'text-stone-500'}
                  strokeWidth={item.isActive ? 2.5 : 2}
                />
              </div>
              <span
                className={`text-[11px] mt-0.5 ${
                  item.isActive
                    ? 'text-[#2F1B0C] font-bold'
                    : 'text-stone-500 font-medium'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
