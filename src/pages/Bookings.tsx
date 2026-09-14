import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Plus,
  Compass,
  Calendar,
  ArrowUpRight,
  Ticket,
  CheckCircle2,
  Clock,
  XCircle,
  CloudOff,
  X,
  Sparkles,
} from 'lucide-react';
import magnifierIcon from '../assets/magnifier.png';
import CreateTripModal from '../components/CreateTripModal';
import {
  tripsApi,
  destinationsApi,
  budgetApi,
  activitiesApi,
  bookingsApi,
  type ExpenseApiResponse,
} from '../services/api';
import { mergeTripsWithExtras, formatDateOnly } from '../lib/tripExtras';
import type { Trip } from '../types/trip';
import type { Destination } from '../types/destination';
import type { Activity, Booking, BookingStatus } from '../types/booking';

interface BookingLedgerItem {
  id: string;
  date: string;
  destination: string;
  activities: string;
  accommodation: string;
  budget: string;
  status: BookingStatus;
}

/**
 * Executes an async network call with one automatic retry (~800ms delay) on failure.
 */
async function withRetry<T>(fn: () => Promise<T>, delayMs = 800): Promise<T> {
  try {
    return await fn();
  } catch (firstErr) {
    console.warn(`Initial request failed, retrying in ${delayMs}ms...`, firstErr);
    await new Promise((res) => setTimeout(res, delayMs));
    return await fn();
  }
}

/**
 * Renders an accessible status badge for all 4 seeded/API booking statuses:
 * 'pending' | 'confirmed' | 'completed' | 'cancelled'
 */
function renderStatusBadge(status: BookingStatus) {
  const norm = (status || 'pending').toLowerCase();
  switch (norm) {
    case 'confirmed':
      return (
        <span
          title="Confirmed"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Confirmed</span>
        </span>
      );
    case 'pending':
      return (
        <span
          title="Pending"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shrink-0"
        >
          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
          <span>Pending</span>
        </span>
      );
    case 'completed':
      return (
        <span
          title="Completed"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0"
        >
          <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" />
          <span>Completed</span>
        </span>
      );
    case 'cancelled':
      return (
        <span
          title="Cancelled"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shrink-0"
        >
          <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
          <span>Cancelled</span>
        </span>
      );
    default:
      return (
        <span
          title={status}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200 shrink-0"
        >
          <span>{status}</span>
        </span>
      );
  }
}

export default function Bookings() {
  const navigate = useNavigate();

  // Trips list state
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string | number | null>(null);
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);

  // Selected trip detailed backend state
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [tripDestinations, setTripDestinations] = useState<Destination[]>([]);
  const [allDestinations, setAllDestinations] = useState<Destination[]>([]);
  const [tripExpenses, setTripExpenses] = useState<ExpenseApiResponse[]>([]);
  const [catalogActivities, setCatalogActivities] = useState<Activity[]>([]);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);

  // Sync failure notice state (auto-dismiss after 6s)
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!syncNotice) return;
    const timer = setTimeout(() => {
      setSyncNotice(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [syncNotice]);

  // Booking modal state
  const [isBookActivityOpen, setIsBookActivityOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<number | ''>('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
  const [bookingErrorMsg, setBookingErrorMsg] = useState<string | null>(null);

  // Fetch all trips for authenticated user
  const loadTrips = useCallback(async () => {
    try {
      const data = await tripsApi.getTrips();
      const mergedTrips = mergeTripsWithExtras(data || []);
      setTrips(mergedTrips);
      if (mergedTrips.length > 0) {
        setSelectedTripId((prev) => (prev ? prev : mergedTrips[0].id));
      }
    } catch (err) {
      console.error('Failed to load trips for bookings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const data = await tripsApi.getTrips();
        if (cancelled) return;
        const mergedTrips = mergeTripsWithExtras(data || []);
        setTrips(mergedTrips);
        if (mergedTrips.length > 0) {
          setSelectedTripId((prev) => (prev ? prev : mergedTrips[0].id));
        }
      } catch (err) {
        if (!cancelled) console.error('Failed to load trips for bookings:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter trips by search query
  const filteredTrips = useMemo(() => {
    if (!searchQuery.trim()) return trips;
    const q = searchQuery.toLowerCase();
    return trips.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.countries && t.countries.some((c) => c.toLowerCase().includes(q))),
    );
  }, [trips, searchQuery]);

  // Active selected trip
  const selectedTrip = useMemo(() => {
    if (!selectedTripId) return filteredTrips[0] || null;
    return trips.find((t) => t.id === selectedTripId) || filteredTrips[0] || null;
  }, [trips, filteredTrips, selectedTripId]);

  // Load detailed backend data whenever selected trip changes
  useEffect(() => {
    if (!selectedTrip) return;

    let cancelled = false;

    const fetchTripDetails = async () => {
      setDetailsLoading(true);
      try {
        const [destData, budgetData, activitiesData, allDestData] = await Promise.all([
          destinationsApi.getByTripId(selectedTrip.id).catch(() => []),
          budgetApi
            .getBudget(selectedTrip.id)
            .catch(() => ({ balance: 0, expenses: [] })),
          activitiesApi.getAll().catch(() => []),
          destinationsApi.getAll().catch(() => []),
        ]);

        if (!cancelled) {
          setTripDestinations(destData);
          setTripExpenses(budgetData.expenses || []);
          setCatalogActivities(activitiesData);
          setAllDestinations(allDestData);
        }

        // Retry-then-notice pattern on bookings fetch
        try {
          const bookingsData = await withRetry(() => bookingsApi.getAll());
          if (!cancelled) {
            setUserBookings(bookingsData);
            setSyncNotice(null);
          }
        } catch (bErr) {
          console.error('Failed to sync bookings after retry:', bErr);
          if (!cancelled) {
            setSyncNotice('Unable to reach server — could not load latest bookings.');
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching trip booking details:', err);
        }
      } finally {
        if (!cancelled) {
          setDetailsLoading(false);
        }
      }
    };

    fetchTripDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedTrip]);

  // Synthesize ledger items from real backend data (destinations, expenses, bookings, catalog)
  const ledgerItems = useMemo<BookingLedgerItem[]>(() => {
    if (!selectedTrip) return [];

    // Identify user bookings matching this trip
    const tripBookings = userBookings.filter(
      (b) => b.trip_id === selectedTrip.id || !b.trip_id,
    );

    const bookingsToRender = tripBookings.length > 0 ? tripBookings : userBookings;

    const accommodationExpenses = tripExpenses.filter(
      (e) => e.category?.toLowerCase() === 'accommodation',
    );
    const activityExpenses = tripExpenses.filter(
      (e) => e.category?.toLowerCase() === 'activities',
    );

    // When real bookings exist, display each booking
    if (bookingsToRender.length > 0) {
      const destLookup = new Map<number, string>();
      allDestinations.forEach((d) => {
        if (d.id && d.location_name) {
          destLookup.set(Number(d.id), d.location_name);
        }
      });
      tripDestinations.forEach((d) => {
        if (d.id && d.location_name) {
          destLookup.set(Number(d.id), d.location_name);
        }
      });

      return bookingsToRender.map((b, idx) => {
        const activity = catalogActivities.find((a) => a.id === b.activity_id);
        const actTitle =
          b.activity_title || activity?.title || `Activity #${b.activity_id}`;

        const destName =
          (activity?.destination_id && destLookup.get(activity.destination_id)) ||
          (tripDestinations.length > 0 ? tripDestinations[0].location_name : null) ||
          (selectedTrip.countries && selectedTrip.countries[0]) ||
          selectedTrip.name;

        const matchedAccom =
          accommodationExpenses[idx % Math.max(accommodationExpenses.length, 1)];
        let accomLabel = b.vendor_name || 'Confirmed Stay / Boutique Hotel';
        if (matchedAccom && !b.vendor_name) {
          accomLabel = `${matchedAccom.name} (₱${Number(matchedAccom.cost).toLocaleString()})`;
        }

        let budgetStr = 'Included';
        if (b.total_price) {
          budgetStr = `₱${Number(b.total_price).toLocaleString()}`;
        } else if (activity?.cost) {
          budgetStr = `₱${Number(activity.cost).toLocaleString()}`;
        }

        const dateStr = b.booking_date
          ? formatDateOnly(b.booking_date)
          : b.created_at
            ? formatDateOnly(b.created_at)
            : formatDateOnly(selectedTrip.startDate) || 'Flexible';

        const rawStatus = (b.status || 'pending').toLowerCase();
        const itemStatus: BookingStatus =
          rawStatus === 'confirmed' ||
          rawStatus === 'completed' ||
          rawStatus === 'cancelled'
            ? (rawStatus as BookingStatus)
            : 'pending';

        return {
          id: String(b.id || `${selectedTrip.id}-booking-${idx}`),
          date: dateStr,
          destination: destName,
          activities: actTitle,
          accommodation: accomLabel,
          budget: budgetStr,
          status: itemStatus,
        };
      });
    }

    // Fallback when no real bookings exist yet: preview itinerary from trip destinations
    const destList: string[] =
      tripDestinations.length > 0
        ? tripDestinations.map((d) => d.location_name)
        : selectedTrip.countries && selectedTrip.countries.length > 0
          ? selectedTrip.countries
          : [selectedTrip.name];

    const totalBudget = selectedTrip.totalBudget || 0;
    const perStopBudget =
      destList.length > 0 ? Math.round(totalBudget / destList.length) : 0;

    return destList.map((destName, idx) => {
      const matchedActivityExp = activityExpenses[idx];
      const matchedAccomExp = accommodationExpenses[idx];

      let activityLabel = 'Local Exploration & Sightseeing';
      if (matchedActivityExp) {
        activityLabel = matchedActivityExp.name;
      } else if (catalogActivities.length > 0) {
        const catalogSample = catalogActivities[idx % catalogActivities.length];
        activityLabel = catalogSample
          ? `${catalogSample.title}`
          : 'Sightseeing & Culture Tour';
      }

      let accomLabel = 'Confirmed Stay / Boutique Hotel';
      if (matchedAccomExp) {
        accomLabel = `${matchedAccomExp.name} (₱${Number(matchedAccomExp.cost).toLocaleString()})`;
      }

      let itemBudgetStr =
        perStopBudget > 0 ? `₱${perStopBudget.toLocaleString()}` : 'Included';
      if (matchedActivityExp) {
        itemBudgetStr = `₱${Number(matchedActivityExp.cost).toLocaleString()}`;
      }

      let itemStatus: BookingStatus = 'confirmed';
      if (selectedTrip.status === 'completed') {
        itemStatus = 'completed';
      } else if (selectedTrip.status === 'planning') {
        itemStatus = 'pending';
      }

      return {
        id: `${selectedTrip.id}-stop-${idx + 1}`,
        date: formatDateOnly(selectedTrip.startDate) || 'Flexible',
        destination: destName,
        activities: activityLabel,
        accommodation: accomLabel,
        budget: itemBudgetStr,
        status: itemStatus,
      };
    });
  }, [
    selectedTrip,
    tripDestinations,
    tripExpenses,
    userBookings,
    catalogActivities,
    allDestinations,
  ]);

  const handleTripCreated = () => {
    loadTrips();
  };

  // Handle booking an activity for the selected trip
  const handleOpenBookModal = () => {
    if (!selectedTrip) return;
    setBookingDate(selectedTrip.startDate || new Date().toISOString().split('T')[0]);
    if (catalogActivities.length > 0 && selectedActivityId === '') {
      setSelectedActivityId(catalogActivities[0].id);
    }
    setBookingSuccessMsg(null);
    setBookingErrorMsg(null);
    setIsBookActivityOpen(true);
  };

  const handleBookActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || !selectedActivityId) return;

    setBookingSubmitting(true);
    setBookingSuccessMsg(null);
    setBookingErrorMsg(null);

    const activity = catalogActivities.find((a) => a.id === Number(selectedActivityId));
    const cost = activity ? Number(activity.cost) : 0;

    try {
      const newBooking = await withRetry(() =>
        bookingsApi.create({
          activity_id: Number(selectedActivityId),
          trip_id: Number(selectedTrip.id),
          booking_date: bookingDate,
          total_price: cost,
        }),
      );

      setUserBookings((prev) => [
        {
          ...newBooking,
          activity_title: activity ? activity.title : `Activity #${selectedActivityId}`,
        },
        ...prev,
      ]);
      setSyncNotice(null);
      setBookingErrorMsg(null);
      setBookingSuccessMsg(
        `Activity "${activity?.title || 'Selected Activity'}" booked successfully!`,
      );
      setTimeout(() => {
        setIsBookActivityOpen(false);
        setBookingSuccessMsg(null);
      }, 1500);
    } catch (err) {
      console.error('Failed to submit booking after retry:', err);
      const errMsg =
        'Unable to reach server — booking submission failed. Please try again.';
      setBookingErrorMsg(errMsg);
      setSyncNotice(errMsg);
      // Keep modal open so the user retains their selected activity & date input to retry
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <div className="bookings-page-wrapper">
      <div className="bookings-container-card">
        <h1 className="bookings-header-title">My Bookings</h1>

        {/* Sync Failure Notice Banner matching Budget.tsx */}
        {syncNotice && (
          <div
            role="status"
            aria-live="polite"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '10px 18px',
              backgroundColor: '#FFF9F2',
              border: '1px solid rgba(233, 114, 76, 0.35)',
              borderRadius: '12px',
              color: '#78350F',
              fontSize: '13px',
              fontFamily: "'SF Pro Rounded', var(--font-sans)",
              fontWeight: 500,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              marginBottom: '16px',
            }}
            className="animate-slide-up"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CloudOff size={16} style={{ color: '#E9724C', flexShrink: 0 }} />
              <span>{syncNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncNotice(null)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                color: '#92400E',
                opacity: 0.7,
              }}
              aria-label="Dismiss notice"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="bookings-content-grid">
          {/* =========================================================
              Left Column — Trip Selector Panel (Figma 402:15 & 422:298)
             ========================================================= */}
          <div className="bookings-trip-selector-card">
            {/* Search Input Box */}
            <div className="bookings-search-container">
              <div className="bookings-search-input-box">
                <img src={magnifierIcon} alt="Search" className="w-4 h-4 opacity-50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="bookings-search-input"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center p-8 text-stone-500 font-medium text-sm">
                Loading trips...
              </div>
            ) : trips.length === 0 ? (
              /* Empty State (Figma Frame 402:15) */
              <div className="bookings-empty-selector">
                <h3 className="bookings-empty-title">No trips yet?</h3>
                <p className="bookings-empty-desc">
                  Start a new adventure and LakBye will handle your itineraries, stays,
                  and budget all in one place.
                </p>
                <div className="bookings-empty-actions">
                  <button
                    type="button"
                    onClick={() => setIsCreateTripModalOpen(true)}
                    className="btn-bookings-create"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create a Trip</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/explore')}
                    className="btn-bookings-browse"
                  >
                    <Compass className="w-4 h-4 text-stone-600" />
                    <span>Browse Destinations</span>
                  </button>
                </div>
              </div>
            ) : filteredTrips.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-stone-500 text-sm">
                <p>No trips match "{searchQuery}"</p>
              </div>
            ) : (
              /* Populated Trip Rows List (Figma Frame 422:298) */
              <div className="bookings-trips-list">
                {filteredTrips.map((t) => {
                  const isSelected = selectedTrip?.id === t.id;
                  const dateStr =
                    t.startDate && t.endDate
                      ? `${formatDateOnly(t.startDate)} - ${formatDateOnly(t.endDate)}`
                      : 'Flexible Dates';

                  const nightsCount = t.nights > 0 ? t.nights : 1;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTripId(t.id)}
                      className={`bookings-trip-item ${isSelected ? 'active' : ''}`}
                    >
                      <div className="bookings-trip-item-info">
                        <span className="bookings-trip-item-title">{t.name}</span>
                        <div className="bookings-trip-item-badges">
                          <span className="badge-pill-date">{dateStr}</span>
                          <span className="badge-pill-nights">
                            {nightsCount} {nightsCount === 1 ? 'Night' : 'Nights'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="bookings-trip-item-chevron w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* =========================================================
              Right Column — Bookings Ledger Table (Figma 402:15 & 422:298)
             ========================================================= */}
          <div className="bookings-ledger-card">
            {selectedTrip ? (
              <>
                <div className="bookings-ledger-header">
                  <div className="bookings-ledger-trip-meta">
                    <h2 className="bookings-ledger-title">{selectedTrip.name}</h2>
                    <span className="badge-pill-daterange-gradient">
                      {selectedTrip.startDate && selectedTrip.endDate
                        ? `${formatDateOnly(selectedTrip.startDate)} - ${formatDateOnly(selectedTrip.endDate)}`
                        : 'Dates Pending'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleOpenBookModal}
                      className="bookings-open-workspace-btn"
                      style={{
                        color: '#e9724c',
                        borderColor: 'rgba(233, 114, 76, 0.3)',
                        background: 'rgba(233, 114, 76, 0.08)',
                      }}
                    >
                      <Ticket className="w-4 h-4" />
                      <span>Book Activity</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/trip/${selectedTrip.id}`)}
                      className="bookings-open-workspace-btn"
                    >
                      <span>Open in Workspace</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bookings-table-wrapper">
                  {detailsLoading ? (
                    <div className="flex flex-col items-center justify-center p-16 text-stone-500 gap-3">
                      <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium">
                        Syncing trip bookings from backend...
                      </span>
                    </div>
                  ) : (
                    <table className="bookings-table">
                      <thead>
                        <tr className="bookings-table-header-row">
                          <th>Date</th>
                          <th>Destination</th>
                          <th>Activities</th>
                          <th>Accommodation</th>
                          <th>Total Budget</th>
                        </tr>
                      </thead>
                      <tbody className="bookings-table-body">
                        {ledgerItems.map((item) => (
                          <tr key={item.id} className="bookings-table-row">
                            <td className="bookings-cell-date">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>{item.date}</span>
                                {renderStatusBadge(item.status)}
                              </div>
                            </td>
                            <td className="bookings-cell-destination">
                              <span className="bookings-dest-dot" />
                              <span>{item.destination}</span>
                            </td>
                            <td
                              className="bookings-cell-activities"
                              title={item.activities}
                            >
                              {item.activities}
                            </td>
                            <td
                              className="bookings-cell-accommodation"
                              title={item.accommodation}
                            >
                              {item.accommodation}
                            </td>
                            <td className="bookings-cell-budget">{item.budget}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            ) : (
              <div className="bookings-table-empty">
                <Calendar className="bookings-table-empty-icon" />
                <h3 className="bookings-table-empty-title">
                  Select a Trip to View Bookings
                </h3>
                <p className="bookings-table-empty-desc">
                  Choose a scheduled trip from the left sidebar or create a new trip to
                  view its reservations, activities, and budget allocations.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateTripModalOpen(true)}
                  className="btn-bookings-create mt-4"
                  style={{ maxWidth: '200px' }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Create a Trip</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Trip Modal */}
      <CreateTripModal
        isOpen={isCreateTripModalOpen}
        onClose={() => setIsCreateTripModalOpen(false)}
        onTripCreated={handleTripCreated}
      />

      {/* Book Activity Modal */}
      {isBookActivityOpen && selectedTrip && (
        <div className="modal-overlay">
          <button
            type="button"
            className="modal-backdrop-dismiss"
            onClick={() => !bookingSubmitting && setIsBookActivityOpen(false)}
            aria-label="Close modal backdrop"
          />
          <div className="start-trip-modal-card" style={{ maxWidth: '460px' }}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => !bookingSubmitting && setIsBookActivityOpen(false)}
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3
                className="font-bold text-xl text-stone-900"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Book an Activity
              </h3>
            </div>
            <p className="text-xs text-stone-600 mb-6">
              Reserve an experience for{' '}
              <span className="font-semibold text-stone-900">{selectedTrip.name}</span>{' '}
              directly through verified LakBye vendors.
            </p>

            {bookingSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{bookingSuccessMsg}</span>
              </div>
            ) : (
              <>
                {bookingErrorMsg && (
                  <div
                    role="status"
                    aria-live="polite"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '10px 14px',
                      backgroundColor: '#FFF9F2',
                      border: '1px solid rgba(233, 114, 76, 0.35)',
                      borderRadius: '12px',
                      color: '#78350F',
                      fontSize: '12px',
                      fontFamily: "'SF Pro Rounded', var(--font-sans)",
                      fontWeight: 500,
                      marginBottom: '16px',
                    }}
                    className="animate-slide-up"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CloudOff size={15} style={{ color: '#E9724C', flexShrink: 0 }} />
                      <span>{bookingErrorMsg}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBookingErrorMsg(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '2px',
                        cursor: 'pointer',
                        color: '#92400E',
                        opacity: 0.7,
                      }}
                      aria-label="Dismiss error"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                <form onSubmit={handleBookActivitySubmit} className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="activity-select" className="modal-label">
                      Select Activity
                    </label>
                    <select
                      id="activity-select"
                      className="modal-input-gradient"
                      value={selectedActivityId}
                      onChange={(e) => setSelectedActivityId(Number(e.target.value))}
                      required
                    >
                      <option value="" disabled>
                        Choose an activity...
                      </option>
                      {catalogActivities.map((act) => (
                        <option key={act.id} value={act.id}>
                          {act.title} — ₱{Number(act.cost).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="booking-date" className="modal-label">
                      Booking Date
                    </label>
                    <input
                      id="booking-date"
                      type="date"
                      className="modal-input-gradient"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs mt-1">
                    <span className="text-stone-600 font-medium">Estimated Cost:</span>
                    <span className="text-base font-bold text-emerald-700 font-mono">
                      {(() => {
                        const act = catalogActivities.find(
                          (a) => a.id === Number(selectedActivityId),
                        );
                        return act ? `₱${Number(act.cost).toLocaleString()}` : '—';
                      })()}
                    </span>
                  </div>

                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBookActivityOpen(false);
                        setBookingErrorMsg(null);
                      }}
                      className="px-5 py-2.5 rounded-full text-stone-600 text-sm font-semibold hover:bg-stone-100 transition"
                      disabled={bookingSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bookingSubmitting || !selectedActivityId}
                      className="btn-start-planning-modal"
                    >
                      {bookingSubmitting ? 'Confirming...' : 'Confirm Booking'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
