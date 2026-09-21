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
  MapPin,
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

async function withRetry<T>(fn: () => Promise<T>, delayMs = 800): Promise<T> {
  try {
    return await fn();
  } catch (firstErr) {
    console.warn(`Initial request failed, retrying in ${delayMs}ms...`, firstErr);
    await new Promise((res) => setTimeout(res, delayMs));
    return await fn();
  }
}

function renderStatusBadge(status: BookingStatus) {
  const norm = (status || 'pending').toLowerCase();
  switch (norm) {
    case 'confirmed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Confirmed</span>
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shrink-0">
          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
          <span>Pending</span>
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0">
          <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" />
          <span>Completed</span>
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shrink-0">
          <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
          <span>Cancelled</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200 shrink-0">
          <span>{status}</span>
        </span>
      );
  }
}

export default function Bookings() {
  const navigate = useNavigate();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string | number | null>(null);
  const [isCreateTripModalOpen, setIsCreateTripModalOpen] = useState(false);

  const [detailsLoading, setDetailsLoading] = useState(false);
  const [tripDestinations, setTripDestinations] = useState<Destination[]>([]);
  const [allDestinations, setAllDestinations] = useState<Destination[]>([]);
  const [tripExpenses, setTripExpenses] = useState<ExpenseApiResponse[]>([]);
  const [catalogActivities, setCatalogActivities] = useState<Activity[]>([]);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);

  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!syncNotice) return;
    const timer = setTimeout(() => setSyncNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [syncNotice]);

  const [isBookActivityOpen, setIsBookActivityOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<number | ''>('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
  const [bookingErrorMsg, setBookingErrorMsg] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    try {
      const data = await tripsApi.getTrips();
      const mergedTrips = mergeTripsWithExtras(data || []);
      setTrips(mergedTrips);
      if (mergedTrips.length > 0) {
        setSelectedTripId((prev) => (prev ? prev : mergedTrips[0].id));
      }
    } catch {
      /* ignore error */
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
      } catch {
        /* ignore error */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'completed'>('all');

  const getTripDisplayStatus = useCallback(
    (trip: Trip): 'upcoming' | 'ongoing' | 'completed' => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!trip.startDate) return 'upcoming';
      const start = new Date(trip.startDate);
      start.setHours(0, 0, 0, 0);
      if (today < start) return 'upcoming';
      if (!trip.endDate) return 'ongoing';
      const end = new Date(trip.endDate);
      end.setHours(23, 59, 59, 999);
      if (today <= end) return 'ongoing';
      return 'completed';
    },
    [],
  );

  const filteredTrips = useMemo(() => {
    if (!searchQuery.trim()) return trips;
    const q = searchQuery.toLowerCase();
    return trips.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.countries && t.countries.some((c) => c.toLowerCase().includes(q))),
    );
  }, [trips, searchQuery]);

  const filteredTripsByTab = useMemo(() => {
    return filteredTrips.filter((trip) => {
      if (activeTab === 'all') return true;
      const status = getTripDisplayStatus(trip);
      if (activeTab === 'upcoming') return status === 'upcoming' || status === 'ongoing';
      if (activeTab === 'completed') return status === 'completed';
      return true;
    });
  }, [filteredTrips, activeTab, getTripDisplayStatus]);

  const getTripImage = useCallback((trip: Trip, idx: number): string => {
    const nameLower = (trip.name || '').toLowerCase();
    const countryLower = (trip.countries || []).join(' ').toLowerCase();
    if (
      nameLower.includes('boracay') ||
      countryLower.includes('boracay') ||
      nameLower.includes('beach')
    ) {
      return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';
    }
    if (
      nameLower.includes('baguio') ||
      nameLower.includes('pine') ||
      nameLower.includes('mountain')
    ) {
      return 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80';
    }
    if (
      nameLower.includes('palawan') ||
      nameLower.includes('nido') ||
      nameLower.includes('island')
    ) {
      return 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=600&q=80';
    }
    if (nameLower.includes('siargao') || nameLower.includes('surf')) {
      return 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=600&q=80';
    }
    const fallbackList = [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    ];
    return fallbackList[idx % fallbackList.length];
  }, []);

  const selectedTrip = useMemo(() => {
    if (!selectedTripId) return filteredTrips[0] || null;
    return trips.find((t) => t.id === selectedTripId) || filteredTrips[0] || null;
  }, [trips, filteredTrips, selectedTripId]);

  const scheduleDays = useMemo(() => {
    const baseDate = selectedTrip?.startDate
      ? new Date(selectedTrip.startDate)
      : new Date();
    const dayOfWeek = baseDate.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - distanceToMonday);

    const daysLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const monthName = baseDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateNum = d.getDate();

      const isHighlighted = trips.some((t) => {
        if (!t.startDate || !t.endDate) return false;
        const start = new Date(t.startDate);
        const end = new Date(t.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return d >= start && d <= end;
      });

      return { label: daysLabels[i], dateNum, isHighlighted };
    });

    return { monthName, days };
  }, [selectedTrip, trips]);

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

        try {
          const bookingsData = await withRetry(() => bookingsApi.getAll());
          if (!cancelled) {
            setUserBookings(bookingsData);
            setSyncNotice(null);
          }
        } catch {
          if (!cancelled)
            setSyncNotice('Unable to reach server — could not load latest bookings.');
        }
      } catch {
        /* ignore error */
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    };

    fetchTripDetails();
    return () => {
      cancelled = true;
    };
  }, [selectedTrip]);

  const ledgerItems = useMemo<BookingLedgerItem[]>(() => {
    if (!selectedTrip) return [];

    // Correctly enforces trip specificity so activities don't bleed across active trips (Fix #16)
    const tripBookings = userBookings.filter((b) => b.trip_id === selectedTrip.id);

    const bookingsToRender = tripBookings;

    const accommodationExpenses = tripExpenses.filter(
      (e) => e.category?.toLowerCase() === 'accommodation',
    );
    const activityExpenses = tripExpenses.filter(
      (e) => e.category?.toLowerCase() === 'activities',
    );

    if (bookingsToRender.length > 0) {
      const destLookup = new Map<number, string>();
      allDestinations.forEach((d) => {
        if (d.id && d.location_name) destLookup.set(Number(d.id), d.location_name);
      });
      tripDestinations.forEach((d) => {
        if (d.id && d.location_name) destLookup.set(Number(d.id), d.location_name);
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
      if (selectedTrip.status === 'completed') itemStatus = 'completed';
      else if (selectedTrip.status === 'planning') itemStatus = 'pending';

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

  const handleTripCreated = () => loadTrips();

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
    } catch {
      const errMsg =
        'Unable to reach server — booking submission failed. Please try again.';
      setBookingErrorMsg(errMsg);
      setSyncNotice(errMsg);
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <div className="bookings-page-wrapper">
      <div className="bookings-container-card">
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
            >
              <X size={15} />
            </button>
          </div>
        )}

        <div className="bookings-desktop-content">
          <h1 className="bookings-header-title">My Bookings</h1>
          <div className="bookings-content-grid">
            <div className="bookings-trip-selector-card">
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
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bookings-mobile-content">
          <div className="bookings-mobile-header-section">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="bookings-mobile-title">My Bookings</h1>
                <p className="bookings-mobile-subtitle">
                  Keep track of your itineraries and reservations
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateTripModalOpen(true)}
                className="btn-bookings-mobile-add"
                title="Create a Trip"
                aria-label="Create a Trip"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="bookings-mobile-search-box">
            <img src={magnifierIcon} alt="Search" className="w-4 h-4 opacity-50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search active reservations..."
              className="bookings-mobile-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-stone-400 text-xs px-2"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="bookings-mobile-filter-tabs">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`bookings-mobile-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            >
              All ({trips.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`bookings-mobile-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`bookings-mobile-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            >
              Completed
            </button>
          </div>

          {loading ? (
            <div className="bookings-mobile-loading">Loading bookings...</div>
          ) : filteredTripsByTab.length === 0 ? (
            <div className="bookings-mobile-empty">
              <h3 className="text-base font-bold text-stone-800">No bookings found</h3>
              <p className="text-xs text-stone-500 mt-1 mb-4">
                {searchQuery
                  ? `No reservations match "${searchQuery}"`
                  : 'Start a new adventure and LakBye will handle your plans!'}
              </p>
              <button
                type="button"
                onClick={() => setIsCreateTripModalOpen(true)}
                className="btn-bookings-create"
              >
                <Plus className="w-4 h-4" />
                <span>Create a Trip</span>
              </button>
            </div>
          ) : (
            <div className="bookings-mobile-cards-grid">
              {filteredTripsByTab.map((trip, idx) => {
                const displayStatus = getTripDisplayStatus(trip);
                const locationStr =
                  trip.countries && trip.countries.length > 0
                    ? trip.countries.join(', ')
                    : 'Philippines';
                const dateStr =
                  trip.startDate && trip.endDate
                    ? `${formatDateOnly(trip.startDate)} - ${formatDateOnly(trip.endDate)}`
                    : 'Flexible Dates';
                const isSelected = selectedTrip?.id === trip.id;

                return (
                  <div
                    key={trip.id}
                    className={`bookings-mobile-trip-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedTripId(trip.id);
                      navigate(`/trip/${trip.id}`);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setSelectedTripId(trip.id);
                        navigate(`/trip/${trip.id}`);
                      }
                    }}
                  >
                    <div
                      className="bookings-mobile-card-image"
                      style={{ backgroundImage: `url(${getTripImage(trip, idx)})` }}
                    />
                    <div className="bookings-mobile-card-details">
                      <div className="bookings-mobile-card-header">
                        <h3 className="bookings-mobile-card-title">{trip.name}</h3>
                        <div className="bookings-mobile-card-location">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{locationStr}</span>
                        </div>
                      </div>

                      <div className="bookings-mobile-card-badges">
                        {displayStatus === 'upcoming' ? (
                          <>
                            <span className="booking-badge booking-badge--upcoming">
                              UPCOMING
                            </span>
                            <span className="booking-badge booking-badge--countdown">
                              {trip.daysUntil !== undefined
                                ? `In ${trip.daysUntil} Day/s`
                                : 'In 4 Days'}
                            </span>
                          </>
                        ) : displayStatus === 'ongoing' ? (
                          <span className="booking-badge booking-badge--ongoing">
                            ONGOING
                          </span>
                        ) : (
                          <span className="booking-badge booking-badge--completed">
                            COMPLETED
                          </span>
                        )}
                        <span className="booking-badge booking-badge--date">
                          {dateStr}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="bookings-schedule-overview-card">
            <div className="bookings-schedule-header">
              <h3 className="bookings-schedule-title">Schedule Overview</h3>
              <span className="bookings-schedule-month">{scheduleDays.monthName}</span>
            </div>
            <div className="bookings-schedule-days-row">
              {scheduleDays.days.map((d, i) => (
                <div
                  key={i}
                  className={`bookings-schedule-day-chip ${d.isHighlighted ? 'highlighted' : ''}`}
                >
                  <span className="bookings-schedule-day-label">{d.label}</span>
                  <span className="bookings-schedule-day-number">{d.dateNum}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CreateTripModal
        isOpen={isCreateTripModalOpen}
        onClose={() => setIsCreateTripModalOpen(false)}
        onTripCreated={handleTripCreated}
      />

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
