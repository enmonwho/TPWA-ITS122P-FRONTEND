import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trip } from '../types/trip';
import {
  Globe,
  Ticket,
  Hourglass,
  Wallet,
  User,
  MoreVertical,
  ChevronRight,
  MapPin,
  Pencil,
  Trash2,
  Copy,
  Archive,
  X,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import CreateTripModal from '../components/CreateTripModal';
import planNowIcon from '../assets/plan-now.svg';
import tripSchedIcon from '../assets/trip-sched.svg';
import totalSpentIcon from '../assets/total-spent.svg';
import createTripBtnIcon from '../assets/create-trip-button.svg';
import browseDestIcon from '../assets/browse-destination.svg';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';
import { tripsApi, journalsApi, preferencesApi } from '../services/api';
import {
  mergeTripsWithExtras,
  mergeTripWithExtras,
  formatDateOnly,
} from '../lib/tripExtras';

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);
  const [journalCount, setJournalCount] = useState<number>(() => {
    if (!user?.id) return 0;
    try {
      const raw = localStorage.getItem(`lakbye_journals_${user.id}`);
      return raw ? JSON.parse(raw).length : 0;
    } catch {
      return 0;
    }
  });

  // Ensure username is loaded if session initialized before preferences were cached
  useEffect(() => {
    if (user?.id && !user.username) {
      preferencesApi.getPreferences(user.id).then((saved) => {
        if (saved?.username && setUser) {
          setUser((prev) => (prev ? { ...prev, username: saved.username } : null));
        }
      });
    }
  }, [user?.id, user?.username, setUser]);

  // Fetch true journal count from backend database and local cache
  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    journalsApi.getJournals(user.id).then((items) => {
      if (isMounted) {
        setJournalCount(items.length);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const fetchTrips = async () => {
      try {
        const apiTrips = await tripsApi.getTrips();
        if (!cancelled) {
          setTrips(mergeTripsWithExtras(apiTrips));
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const tripKey = `lakbye_local_trips_${user?.id ?? 'guest'}`;
          const localSaved = localStorage.getItem(tripKey);
          if (localSaved) {
            try {
              setTrips(JSON.parse(localSaved));
            } catch {
              setTrips([]);
            }
            setLoading(false);
          } else if (import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
            const sampleTrips: Trip[] = [
              {
                id: 1,
                name: 'Boracay White Beach Escapade',
                startDate: '2026-10-12',
                endDate: '2026-10-18',
                totalBudget: 45000,
                status: 'confirmed',
                cover_photo: '',
                visibility: 'public',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                countries: ['Philippines'],
                travelType: 'Solo',
                nights: 6,
              },
            ];
            setTrips(sampleTrips);
            localStorage.setItem(tripKey, JSON.stringify(sampleTrips));
            setLoading(false);
          } else {
            const msg = err instanceof Error ? err.message : 'Failed to load trips';
            setError(msg);
            setLoading(false);
            console.error('Failed to fetch trips:', err);
          }
        }
      }
    };

    fetchTrips();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const getDisplayStatus = (trip: Trip): string => {
    if (trip.status === 'cancelled') return 'past';

    // Check strict date boundaries to accurately mark past trips (FUN-07)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (trip.endDate) {
      const parts = trip.endDate.split(/[T ]/)[0].split('-');
      if (parts.length === 3) {
        const end = new Date(
          Number(parts[0]),
          Number(parts[1]) - 1,
          Number(parts[2]),
          23,
          59,
          59,
          999,
        );
        if (end < today) return 'past';
      }
    } else if (trip.startDate) {
      const parts = trip.startDate.split(/[T ]/)[0].split('-');
      if (parts.length === 3) {
        const start = new Date(
          Number(parts[0]),
          Number(parts[1]) - 1,
          Number(parts[2]),
          23,
          59,
          59,
          999,
        );
        if (start < today) return 'past';
      }
    }

    if (trip.status === 'completed') return 'past';
    if (trip.status === 'ongoing') return 'ongoing';
    return 'upcoming';
  };

  const filteredTrips = trips.filter((trip) => {
    if (activeTab === 'all') return true;
    return getDisplayStatus(trip) === activeTab;
  });

  // Display first name for dashboard greeting (REQ-01)
  const firstName = user?.full_name?.trim().split(/\s+/)[0] || 'Traveler';
  const greetingName = firstName;

  // Display full name for profile card with handle underneath (REQ-01)
  const profileDisplayName = user?.full_name?.trim() || 'Traveler';
  const profileHandle = user?.username ? `@${user.username}` : user?.email || '';

  const countriesExplored = Array.from(
    new Set(trips.flatMap((t) => t.countries || [])),
  ).length;

  const totalBookings = trips.length;

  const nextTrip = trips
    .filter((t) => getDisplayStatus(t) === 'upcoming')
    .sort((a, b) => (a.daysUntil || 9999) - (b.daysUntil || 9999))[0];

  // Actually aggregates spent items from budget local storage (Fix #10)
  const totalSpent = trips.reduce((sum, t) => {
    try {
      const stored = localStorage.getItem(`lakbye_budget_${t.id}`);
      if (stored) {
        const bd = JSON.parse(stored);
        const spent = bd.expenses.reduce(
          (s: number, e: { cost: string | number }) => s + (Number(e.cost) || 0),
          0,
        );
        return sum + spent;
      }
    } catch {
      console.warn('Failed to parse budget for trip', t.id);
    }
    return sum;
  }, 0);

  const handleTripCreated = () => {
    if (user) {
      tripsApi
        .getTrips()
        .then((apiTrips) => setTrips(mergeTripsWithExtras(apiTrips)))
        .catch(console.error);
    }
  };

  const [openMenuTripId, setOpenMenuTripId] = useState<string | number | null>(null);

  // Edit Modal State
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editBudget, setEditBudget] = useState<number | string>(0);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Confirmation Modal State
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Close 3-dots dropdown on outside click
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.trip-row-options-container')) {
        setOpenMenuTripId(null);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const handleOpenEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setEditTitle(trip.name);
    setEditStartDate(trip.startDate ? trip.startDate.split(/[T ]/)[0] : '');
    setEditEndDate(trip.endDate ? trip.endDate.split(/[T ]/)[0] : '');
    setEditBudget(trip.totalBudget ?? 0);
    setEditError('');
    setOpenMenuTripId(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip) return;
    if (!editTitle.trim()) {
      setEditError('Trip name cannot be empty.');
      return;
    }
    if (editStartDate && editEndDate && editEndDate < editStartDate) {
      setEditError('End date cannot precede start date.');
      return;
    }

    setIsSavingEdit(true);
    setEditError('');

    try {
      const budgetNum = Number(editBudget) || 0;
      await tripsApi.updateTrip(editingTrip.id, {
        title: editTitle.trim(),
        start_date: editStartDate,
        end_date: editEndDate,
        total_budget: budgetNum,
        status: editingTrip.status,
      });

      // Update local state with merged derived extras
      setTrips((prev) =>
        prev.map((t) =>
          t.id === editingTrip.id
            ? mergeTripWithExtras({
                ...t,
                name: editTitle.trim(),
                startDate: editStartDate,
                endDate: editEndDate,
                totalBudget: budgetNum,
              })
            : t,
        ),
      );

      // Also persist to local cache if present
      if (user?.id) {
        const tripKey = `lakbye_local_trips_${user.id}`;
        const raw = localStorage.getItem(tripKey);
        if (raw) {
          try {
            const list: Trip[] = JSON.parse(raw);
            const updatedList = list.map((t) =>
              t.id === editingTrip.id
                ? {
                    ...t,
                    name: editTitle.trim(),
                    startDate: editStartDate,
                    endDate: editEndDate,
                    totalBudget: budgetNum,
                  }
                : t,
            );
            localStorage.setItem(tripKey, JSON.stringify(updatedList));
          } catch {
            // ignore
          }
        }
      }

      setEditingTrip(null);
    } catch (err: unknown) {
      console.error('Failed to update trip:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update trip details';
      setEditError(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenDelete = (trip: Trip) => {
    setDeletingTrip(trip);
    setOpenMenuTripId(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTrip) return;
    setIsDeleting(true);

    try {
      await tripsApi.deleteTrip(deletingTrip.id);
    } catch (err) {
      console.warn('API deleteTrip warning (will still clean up locally):', err);
    }

    // Clean up local state
    setTrips((prev) => prev.filter((t) => t.id !== deletingTrip.id));

    // Clean up any local storage associated with this trip
    try {
      localStorage.removeItem(`lakbye_workspace_dests_${deletingTrip.id}`);
      localStorage.removeItem(`lakbye_trip_budget_${deletingTrip.id}`);
      if (user?.id) {
        const tripKey = `lakbye_local_trips_${user.id}`;
        const raw = localStorage.getItem(tripKey);
        if (raw) {
          const list: Trip[] = JSON.parse(raw);
          localStorage.setItem(
            tripKey,
            JSON.stringify(list.filter((t) => t.id !== deletingTrip.id)),
          );
        }
      }
    } catch {
      // ignore
    }

    setIsDeleting(false);
    setDeletingTrip(null);
  };

  const handleToggleStatus = async (trip: Trip) => {
    const isPast = getDisplayStatus(trip) === 'past' || trip.status === 'completed';
    const newStatus = isPast ? 'planning' : 'completed';

    try {
      await tripsApi.updateTrip(trip.id, {
        title: trip.name,
        start_date: trip.startDate,
        end_date: trip.endDate,
        total_budget: trip.totalBudget,
        status: newStatus,
      });
    } catch (err) {
      console.warn('Status update API warning:', err);
    }

    setTrips((prev) =>
      prev.map((t) => (t.id === trip.id ? { ...t, status: newStatus } : t)),
    );
    setOpenMenuTripId(null);
  };

  const handleDuplicateTrip = async (trip: Trip) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const duplicated = await tripsApi.createTrip({
        title: `${trip.name} (Copy)`,
        start_date: trip.startDate || today,
        end_date: trip.endDate || today,
        total_budget: trip.totalBudget || 0,
        status: 'planning',
      });
      setTrips((prev) => [mergeTripWithExtras(duplicated), ...prev]);
    } catch (err) {
      console.error('Failed to duplicate trip:', err);
    }
    setOpenMenuTripId(null);
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-greeting-wrapper">
          <div className="dashboard-greeting">
            <span>Greetings,</span>
            <span
              className="dashboard-greeting-name"
              style={{ filter: "url('#text-inner-shadow')" }}
            >
              {greetingName}!
            </span>
          </div>
          <p className="dashboard-greeting-sub">Where does your journey take you next?</p>
        </div>

        <div className="dashboard-stats-row">
          <StatCard
            gradient="--gradient-stat-countries"
            icon={
              <Globe size={175} strokeWidth={1} className="dash-stat-icon-countries" />
            }
            value={countriesExplored > 0 ? countriesExplored.toString() : undefined}
            title={countriesExplored === 0 ? 'Start exploring' : undefined}
            subtitle="Countries Explored"
          />
          <StatCard
            gradient="--gradient-stat-bookings"
            icon={
              <Ticket size={148} strokeWidth={1} className="dash-stat-icon-bookings" />
            }
            value={totalBookings > 0 ? totalBookings.toString() : undefined}
            title={totalBookings === 0 ? 'Plan now' : undefined}
            subtitle="Bookings"
            iconButton={planNowIcon}
            onClick={() => navigate('/dashboard/bookings')} // Route corrected (Fix #14)
          />
          <StatCard
            gradient="--gradient-stat-countdown"
            icon={
              <Hourglass
                size={148}
                strokeWidth={1}
                className="dash-stat-icon-countdown"
              />
            }
            value={
              nextTrip?.daysUntil !== undefined
                ? nextTrip.daysUntil.toString()
                : undefined
            }
            title={nextTrip?.daysUntil === undefined ? 'None scheduled' : undefined}
            subtitle="Until Next Trip"
            iconButton={tripSchedIcon}
            onClick={() => setIsCreateTripModalOpen(true)}
          />
          <StatCard
            gradient="--gradient-stat-spent"
            icon={<Wallet size={161} strokeWidth={1} className="dash-stat-icon-spent" />}
            value={
              totalSpent > 0
                ? totalSpent.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '0.00'
            }
            subtitle="Total Spent"
            iconButton={totalSpentIcon}
          />
        </div>

        <div className="dashboard-bottom-row">
          <div className="dashboard-profile-column">
            <div className="dashboard-profile-section">
              <button
                type="button"
                className="dashboard-profile-action-btn"
                onClick={() => navigate(ROUTES.CUSTOMER_PROFILE)}
                aria-label="View Profile and Journal"
                title="View Profile and Journal"
              >
                <ChevronRight size={22} color="#FFFFFF" strokeWidth={2.5} />
              </button>
              <div className="dashboard-profile-header">
                <div
                  className="dashboard-profile-avatar"
                  style={{
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  {(user as { avatar_url?: string } | null)?.avatar_url ? (
                    <img
                      src={(user as { avatar_url?: string }).avatar_url}
                      alt={user?.full_name || 'Traveler'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <User size={32} color="var(--color-neutral-500)" />
                  )}
                </div>
                <div>
                  <div className="dashboard-profile-name">{profileDisplayName}</div>
                  <div className="dashboard-profile-location">
                    {profileHandle || 'Not specified'}
                  </div>
                </div>
              </div>
              <div className="dashboard-profile-stats">
                <div className="dashboard-profile-stat-item">
                  <div className="dashboard-profile-stat-value">{trips.length}</div>
                  <div className="dashboard-profile-stat-label">Trips</div>
                </div>
                <div className="dashboard-profile-stat-divider"></div>
                <div className="dashboard-profile-stat-item">
                  <div className="dashboard-profile-stat-value">{journalCount}</div>
                  <div className="dashboard-profile-stat-label">
                    {journalCount === 1 ? 'Journal Entry' : 'Journal Entries'}
                  </div>
                </div>
              </div>
            </div>
            {filteredTrips.length > 0 && (
              <button
                onClick={() => setIsCreateTripModalOpen(true)}
                className="btn-create-trip dashboard-profile-btn-create"
              >
                <img src={createTripBtnIcon} alt="" />
                Create a Trip
              </button>
            )}
          </div>

          <div className="dashboard-trips-section">
            <div className="dashboard-trips-header-row">
              <h2 className="dashboard-trips-title">My Journeys</h2>
              <button
                type="button"
                className="dashboard-view-calendar-btn"
                onClick={() => navigate('/dashboard/bookings')}
              >
                View Calendar
              </button>
            </div>

            <div className="dashboard-trips-filters">
              <button
                className={`dashboard-filter-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All Trips
              </button>
              <button
                className={`dashboard-filter-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => setActiveTab('upcoming')}
              >
                Upcoming
              </button>
              <button
                className={`dashboard-filter-btn ${activeTab === 'past' ? 'active' : ''}`}
                onClick={() => setActiveTab('past')}
              >
                Past
              </button>
            </div>

            <div className="dashboard-trips-card">
              {loading ? (
                <div className="dashboard-empty-state">
                  <p className="dashboard-empty-text">Loading trips...</p>
                </div>
              ) : error ? (
                <div className="dashboard-empty-state">
                  <h3 className="dashboard-empty-title">Something went wrong</h3>
                  <p className="dashboard-empty-text">{error}</p>
                </div>
              ) : filteredTrips.length === 0 ? (
                <div className="dashboard-empty-state">
                  <h3 className="dashboard-empty-title">No trips yet?</h3>
                  <p className="dashboard-empty-text">
                    Start a new adventure and LakBye will handle your itineraries, stays,
                    and budget all in one place.
                  </p>
                  <div className="dashboard-empty-actions">
                    <button
                      onClick={() => setIsCreateTripModalOpen(true)}
                      className="btn-create-trip dashboard-btn-create"
                    >
                      <img src={createTripBtnIcon} alt="" />
                      Create a Trip
                    </button>
                    <button
                      className="dashboard-btn-browse"
                      onClick={() => navigate('/dashboard/explore')}
                    >
                      <img src={browseDestIcon} alt="" />
                      Browse Destinations
                    </button>
                  </div>
                </div>
              ) : (
                <div className="dashboard-trips-table">
                  <div className="dashboard-trips-table-header">
                    <div className="header-cell-name">Trip Name</div>
                    <div className="header-cell-status">Status</div>
                    <div className="header-cell-dates">Dates</div>
                    <div className="header-cell-duration">Duration</div>
                    <div className="header-cell-actions"></div>
                  </div>

                  <div className="dashboard-trips-table-divider" />

                  <div className="dashboard-trips-table-rows">
                    {filteredTrips.map((trip) => {
                      const displayStatus = getDisplayStatus(trip);
                      const tripLocation =
                        trip.countries && trip.countries.length > 0
                          ? trip.countries.join(', ')
                          : 'Philippines';

                      return (
                        <div
                          key={trip.id}
                          className="dashboard-trips-table-row"
                          onClick={() => navigate(ROUTES.TRIP(trip.id))}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              navigate(ROUTES.TRIP(trip.id));
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="trip-cell-name">
                            <span className="trip-row-name">{trip.name}</span>
                            {tripLocation && (
                              <div className="trip-row-location">
                                <MapPin size={12} className="trip-row-location-icon" />
                                <span>{tripLocation}</span>
                              </div>
                            )}
                          </div>

                          <div className="trip-badges-group">
                            <div className="trip-cell-status">
                              <div className="trip-status-badges-wrap">
                                <span
                                  className={`trip-badge trip-badge--${displayStatus === 'upcoming' ? 'upcoming' : 'completed'}`}
                                >
                                  {displayStatus === 'upcoming'
                                    ? 'UPCOMING'
                                    : displayStatus === 'ongoing'
                                      ? 'ONGOING'
                                      : 'COMPLETED'}
                                </span>
                                {displayStatus === 'upcoming' &&
                                  trip.daysUntil !== undefined && (
                                    <span className="trip-badge trip-badge--countdown">
                                      In {trip.daysUntil} Day/s
                                    </span>
                                  )}
                              </div>
                            </div>

                            <div className="trip-cell-dates">
                              <span className="trip-badge trip-badge--date">
                                {formatDateOnly(trip.startDate)} -{' '}
                                {formatDateOnly(trip.endDate)}
                              </span>
                            </div>

                            <div className="trip-cell-duration">
                              <span className="trip-badge trip-badge--nights">
                                {trip.nights} Nights
                              </span>
                            </div>
                          </div>

                          <div className="trip-cell-actions trip-row-options-container">
                            <button
                              type="button"
                              className="trip-row-options"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuTripId((prev) =>
                                  prev === trip.id ? null : trip.id,
                                );
                              }}
                              aria-label="Trip options"
                              aria-expanded={openMenuTripId === trip.id}
                            >
                              <MoreVertical
                                size={18}
                                color="var(--color-dash-sidebar-text)"
                              />
                            </button>

                            {openMenuTripId === trip.id && (
                              <div className="dashboard-trip-options-menu">
                                <button
                                  type="button"
                                  className="trip-options-menu-item"
                                  onClick={() => handleOpenEdit(trip)}
                                >
                                  <Pencil size={15} className="text-stone-500" />
                                  <span>Edit Details</span>
                                </button>

                                <button
                                  type="button"
                                  className="trip-options-menu-item"
                                  onClick={() => handleToggleStatus(trip)}
                                >
                                  <Archive size={15} className="text-stone-500" />
                                  <span>
                                    {getDisplayStatus(trip) === 'past'
                                      ? 'Mark as Upcoming'
                                      : 'Mark as Past'}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  className="trip-options-menu-item"
                                  onClick={() => handleDuplicateTrip(trip)}
                                >
                                  <Copy size={15} className="text-stone-500" />
                                  <span>Duplicate Trip</span>
                                </button>

                                <div className="trip-options-menu-divider" />

                                <button
                                  type="button"
                                  className="trip-options-menu-item danger"
                                  onClick={() => handleOpenDelete(trip)}
                                >
                                  <Trash2 size={15} />
                                  <span>Delete Trip</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateTripModal
        isOpen={isCreateTripModalOpen}
        onClose={() => setIsCreateTripModalOpen(false)}
        onTripCreated={handleTripCreated}
      />

      {/* Edit Trip Modal */}
      {editingTrip && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-trip-modal-title"
        >
          <button
            type="button"
            className="modal-backdrop-dismiss"
            aria-label="Close modal backdrop"
            onClick={() => setEditingTrip(null)}
          />

          <div className="edit-trip-modal-card animate-fade-in-up">
            <div className="flex items-center justify-between mb-4 border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-600" />
                <h3
                  id="edit-trip-modal-title"
                  className="text-lg font-bold text-stone-900"
                >
                  Edit Trip Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTrip(null)}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {editError && (
              <div className="p-3 mb-4 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="edit-trip-title" className="modal-label">
                  Trip Name
                </label>
                <input
                  id="edit-trip-title"
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="modal-input-gradient"
                  placeholder="e.g. Boracay Island Hopping"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-trip-start-date" className="modal-label">
                    Start Date
                  </label>
                  <input
                    id="edit-trip-start-date"
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => {
                      setEditStartDate(e.target.value);
                      if (editEndDate && editEndDate <= e.target.value) {
                        setEditEndDate('');
                      }
                    }}
                    className="modal-input-gradient text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="edit-trip-end-date" className="modal-label">
                    End Date
                  </label>
                  <input
                    id="edit-trip-end-date"
                    type="date"
                    required
                    min={editStartDate}
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="modal-input-gradient text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-trip-budget" className="modal-label">
                  Total Budget (PHP)
                </label>
                <input
                  id="edit-trip-budget"
                  type="number"
                  min="0"
                  step="any"
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  className="modal-input-gradient"
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingTrip(null)}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="btn-lakbye-gradient text-xs py-2 px-5 cursor-pointer"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTrip && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <button
            type="button"
            className="modal-backdrop-dismiss"
            aria-label="Close modal backdrop"
            onClick={() => setDeletingTrip(null)}
          />

          <div className="delete-trip-modal-card animate-fade-in-up">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <Trash2 size={22} />
            </div>

            <h3 id="delete-modal-title" className="text-lg font-bold text-stone-900 mb-1">
              Delete Trip?
            </h3>

            <p className="text-xs text-stone-500 leading-relaxed mb-5 max-w-sm">
              Are you sure you want to delete &ldquo;
              <span className="font-semibold text-stone-800">{deletingTrip.name}</span>
              &rdquo;? All associated itineraries, budget expenses, and packing checklists
              will be permanently removed.
            </p>

            <div className="flex items-center gap-3 w-full justify-center">
              <button
                type="button"
                onClick={() => setDeletingTrip(null)}
                className="flex-1 max-w-35 py-2.5 px-4 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 max-w-35 py-2.5 px-4 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
