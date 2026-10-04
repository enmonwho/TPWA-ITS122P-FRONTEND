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
      {/* Approved Compact Mobile Header (Figma source of truth: 74px height) */}
      <header className="workspace-mobile-header-bar md:hidden flex items-center justify-between px-[18px] h-[74px] bg-white border-b border-[rgba(71,43,20,0.14)] sticky top-0 z-30 w-full shrink-0">
        <div className="flex items-center gap-[14px] min-w-0">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            aria-label="Back to dashboard"
            className="w-[18px] h-[18px] flex items-center justify-center text-[#2F1B0C] hover:opacity-75 transition-opacity shrink-0"
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="flex flex-col min-w-0 justify-center">
            <span className="font-['Poppins'] font-bold text-[#2F1B0C] text-[16px] leading-[22px] truncate">
              {trip?.name || 'Spain Adventure'}
            </span>
            <span className="font-['Poppins'] font-normal text-[#73665C] text-[10px] leading-[14px]">
              {viewSubtitle}
            </span>
          </div>
        </div>
        <div className="w-[36px] h-[36px] rounded-full border-2 border-[rgba(233,114,76,0.8)] bg-[#FCF9F6] flex items-center justify-center font-['Poppins'] font-bold text-[13px] text-[#2F1B0C] shrink-0 overflow-hidden">
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

      {/* Approved Mobile Bottom Workspace Navigation (Figma source of truth: 58px height) */}
      <nav
        aria-label="Trip workspace navigation"
        className="workspace-mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 h-[58px] bg-white border-t border-[rgba(71,43,20,0.14)] px-2 flex items-center justify-around z-30 shadow-md shrink-0"
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              className="flex flex-col items-center justify-center flex-1 h-full py-1"
            >
              <div
                className={`w-11 h-6 flex items-center justify-center transition-all ${
                  item.isActive ? 'mobile-nav-active-pill' : 'mobile-nav-inactive-pill'
                }`}
              >
                <Icon
                  size={20}
                  className={item.isActive ? 'text-[#255F85]' : 'text-[#73665C]'}
                  strokeWidth={item.isActive ? 2.3 : 1.8}
                />
              </div>
              <span
                className={`text-[9px] font-['Poppins'] leading-[12px] mt-0.5 ${
                  item.isActive
                    ? 'text-[#1A1A1A] font-semibold'
                    : 'text-[#73665C] font-normal'
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
