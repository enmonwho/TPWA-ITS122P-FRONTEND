import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Plus,
  Calendar,
  ArrowUpRight,
  Ticket,
  Bed,
  CheckCircle2,
  CloudOff,
  X,
  MapPin,
} from 'lucide-react';
import magnifierIcon from '../assets/magnifier.png';
import browseDestIcon from '../assets/browse-destination.svg';
import CreateTripModal from '../components/CreateTripModal';
import {
  tripsApi,
  destinationsApi,
  budgetApi,
  activitiesApi,
  bookingsApi,
  type ExpenseApiResponse,
} from '../services/api';
import { mergeTripsWithExtras } from '../lib/tripExtras';
import {
  reconcileTripBookings,
  saveBookingExtra,
  saveTripCustomBooking,
} from '../lib/bookingExtras';
import { formatUserDate, formatUserDateRange } from '../lib/formatters';
import type { Trip } from '../types/trip';
import type { Destination } from '../types/destination';
import type { Activity, Booking, BookingStatus } from '../types/booking';
import {
  countBookingStatuses,
  countBookingTypes,
  filterBookings,
  normalizeBookingStatus,
  type BookingStatusFilter,
} from '../lib/bookingFilters';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface BookingLedgerItem {
  id: string;
  date: string;
  destination: string;
  activities: string;
  accommodation: string;
  budget: string;
  status: BookingStatus;
  type: 'hotel' | 'activity';
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
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 shrink-0">
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
            aria-hidden="true"
          />
          <span>Confirmed</span>
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-orange-600 shrink-0">
          <span
            className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"
            aria-hidden="true"
          />
          <span>Pending</span>
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 shrink-0">
          <span
            className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0"
            aria-hidden="true"
          />
          <span>Completed</span>
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 shrink-0">
          <span
            className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"
            aria-hidden="true"
          />
          <span>Cancelled</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 shrink-0">
          <span
            className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0"
            aria-hidden="true"
          />
          <span className="capitalize">{status}</span>
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

  // Booking filters & modes
  const [bookingTypeFilter, setBookingTypeFilter] = useState<
    'all' | 'activity' | 'hotel'
  >('all');
  const [bookingStatusFilter, setBookingStatusFilter] =
    useState<BookingStatusFilter>('all');
  const [isBookActivityOpen, setIsBookActivityOpen] = useState(false);
  const [bookingMode, setBookingMode] = useState<'catalog' | 'custom'>('catalog');
  const [customType, setCustomType] = useState<'activity' | 'hotel'>('activity');
  const [customTitle, setCustomTitle] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [selectedPlannedDestinationId, setSelectedPlannedDestinationId] = useState('');
  const [customCost, setCustomCost] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState<number | ''>('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('09:00 AM');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
  const [bookingErrorMsg, setBookingErrorMsg] = useState<string | null>(null);
  const bookingSubmitLockRef = useRef(false);

  useModalBehavior(
    isBookActivityOpen,
    () => setIsBookActivityOpen(false),
    bookingSubmitting,
  );

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

  const tripTabCounts = useMemo(
    () =>
      filteredTrips.reduce(
        (counts, trip) => {
          const status = getTripDisplayStatus(trip);
          counts.all += 1;
          if (status === 'completed') counts.completed += 1;
          else counts.upcoming += 1;
          return counts;
        },
        { all: 0, upcoming: 0, completed: 0 },
      ),
    [filteredTrips, getTripDisplayStatus],
  );

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
    return filteredTrips.find((t) => t.id === selectedTripId) || filteredTrips[0] || null;
  }, [filteredTrips, selectedTripId]);

  const tripCatalogActivities = useMemo(() => {
    const destinationIds = new Set(
      tripDestinations.map((destination) => String(destination.id)),
    );
    return catalogActivities.filter(
      (activity) =>
        activity.destination_id != null &&
        destinationIds.has(String(activity.destination_id)),
    );
  }, [catalogActivities, tripDestinations]);

  const plannedActivities = useMemo(
    () =>
      tripDestinations
        .filter((destination) => destination.activities?.trim())
        .map((destination) => ({
          destinationId: String(destination.id),
          destinationName: destination.location_name,
          activity: destination.activities!.trim(),
        })),
    [tripDestinations],
  );

  const plannedAccommodations = useMemo(
    () => tripDestinations.filter((destination) => destination.accommodation?.trim()),
    [tripDestinations],
  );

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
    if (!selectedTrip) {
      setTripDestinations([]);
      setTripExpenses([]);
      setCatalogActivities([]);
      setAllDestinations([]);
      setUserBookings([]);
      return;
    }

    let cancelled = false;

    const fetchTripDetails = async () => {
      setDetailsLoading(true);
      setTripDestinations([]);
      setTripExpenses([]);
      setCatalogActivities([]);
      setAllDestinations([]);
      setUserBookings([]);
      try {
        const [destData, budgetData, allDestData] = await Promise.all([
          destinationsApi.getByTripId(selectedTrip.id).catch(() => []),
          budgetApi
            .getBudget(selectedTrip.id)
            .catch(() => ({ balance: 0, expenses: [] })),
          destinationsApi.getAll().catch(() => []),
        ]);

        const activityLists = await Promise.all(
          destData.map((destination) =>
            activitiesApi.getAll({ destination_id: destination.id }).catch(() => []),
          ),
        );
        const activitiesData = Array.from(
          new Map(
            activityLists.flat().map((activity) => [activity.id, activity]),
          ).values(),
        );

        if (!cancelled) {
          setTripDestinations(destData);
          setTripExpenses(budgetData.expenses || []);
          setCatalogActivities(activitiesData);
          setAllDestinations(allDestData);
        }

        try {
          const bookingsData = await withRetry(() =>
            bookingsApi.getAll(undefined, selectedTrip.id),
          );
          if (!cancelled) {
            const merged = reconcileTripBookings(bookingsData, selectedTrip.id);
            setUserBookings(merged);
            setSyncNotice(null);
          }
        } catch {
          if (!cancelled) {
            const fallback = reconcileTripBookings([], selectedTrip.id);
            setUserBookings(fallback);
            setSyncNotice('Unable to reach server — could not load latest bookings.');
          }
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

    // Strictly enforce trip isolation so activities do not bleed across trips (BUG-02 / SEC-06)
    const tripBookings = userBookings.filter(
      (b) => String(b.trip_id) === String(selectedTrip.id),
    );

    if (tripBookings.length > 0) {
      const destLookup = new Map<number, string>();
      allDestinations.forEach((d) => {
        if (d.id && d.location_name) destLookup.set(Number(d.id), d.location_name);
      });
      tripDestinations.forEach((d) => {
        if (d.id && d.location_name) destLookup.set(Number(d.id), d.location_name);
      });

      const accommodationExpenses = tripExpenses.filter(
        (e) => e.category?.toLowerCase() === 'accommodation',
      );

      return tripBookings.map((b, idx) => {
        const activity = catalogActivities.find((a) => a.id === b.activity_id);
        const isHotel =
          b.custom_type?.toLowerCase() === 'hotel' ||
          (!b.activity_id &&
            (b.custom_title?.toLowerCase().includes('hotel') ||
              b.custom_title?.toLowerCase().includes('stay') ||
              b.custom_title?.toLowerCase().includes('resort')));

        const actTitle = isHotel
          ? '—'
          : b.custom_title ||
            b.activity_title ||
            activity?.title ||
            `Activity #${b.activity_id}`;

        const destName =
          b.custom_location ||
          (activity?.destination_id && destLookup.get(activity.destination_id)) ||
          (tripDestinations.length > 0 ? tripDestinations[0].location_name : null) ||
          (selectedTrip.countries && selectedTrip.countries[0]) ||
          selectedTrip.name;

        const matchedAccom =
          accommodationExpenses[idx % Math.max(accommodationExpenses.length, 1)];
        let accomLabel = 'Confirmed Stay / Boutique Hotel';
        if (isHotel) {
          accomLabel = b.custom_title || 'Boutique Hotel / Stay';
        } else if (matchedAccom) {
          accomLabel = `${matchedAccom.name} (₱${Number(matchedAccom.cost).toLocaleString()})`;
        }

        let budgetStr = 'Included';
        const costVal = b.total_price ?? b.cost ?? activity?.cost;
        if (costVal !== undefined && costVal !== null && costVal !== '') {
          budgetStr = `₱${Number(costVal).toLocaleString()}`;
        }

        const dateStr = b.booking_date
          ? formatUserDate(b.booking_date)
          : b.created_at
            ? formatUserDate(b.created_at)
            : formatUserDate(selectedTrip.startDate) || 'Flexible';

        const itemStatus = normalizeBookingStatus(b.status);

        return {
          id: String(b.id || `${selectedTrip.id}-booking-${idx}`),
          date: dateStr,
          destination: destName,
          activities: actTitle,
          accommodation: accomLabel,
          budget: budgetStr,
          status: itemStatus,
          type: (isHotel ? 'hotel' : 'activity') as 'hotel' | 'activity',
        };
      });
    }

    return [];
  }, [
    selectedTrip,
    tripDestinations,
    tripExpenses,
    userBookings,
    catalogActivities,
    allDestinations,
  ]);

  const filteredLedgerItems = useMemo(() => {
    return filterBookings(ledgerItems, bookingTypeFilter, bookingStatusFilter);
  }, [ledgerItems, bookingTypeFilter, bookingStatusFilter]);

  const bookingTypeCounts = useMemo(
    () =>
      countBookingTypes(
        bookingStatusFilter === 'all'
          ? ledgerItems
          : ledgerItems.filter((item) => item.status === bookingStatusFilter),
      ),
    [ledgerItems, bookingStatusFilter],
  );

  const bookingStatusCounts = useMemo(
    () =>
      countBookingStatuses(
        bookingTypeFilter === 'all'
          ? ledgerItems
          : ledgerItems.filter((item) => item.type === bookingTypeFilter),
      ),
    [ledgerItems, bookingTypeFilter],
  );

  const handleTripCreated = () => loadTrips();

  const handleOpenBookModal = () => {
    if (!selectedTrip) return;
    setBookingDate(selectedTrip.startDate || new Date().toISOString().split('T')[0]);
    setBookingTime('09:00 AM');
    setBookingMode('catalog');
    setCustomType('activity');
    setSelectedActivityId(tripCatalogActivities[0]?.id ?? '');
    setCustomTitle('');
    setCustomLocation(selectedTrip.countries?.[0] || '');
    setSelectedPlannedDestinationId('');
    setCustomCost('');
    setCustomNotes('');
    setBookingSuccessMsg(null);
    setBookingErrorMsg(null);
    setIsBookActivityOpen(true);
  };

  const handleBookActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || bookingSubmitLockRef.current) return;

    const isCustom = bookingMode === 'custom';
    if (isCustom && !customTitle.trim()) {
      setBookingErrorMsg('Please enter a title or hotel/activity name.');
      return;
    }
    if (!isCustom && !selectedActivityId) {
      setBookingErrorMsg('Please select an activity from the catalog.');
      return;
    }

    setBookingSubmitting(true);
    bookingSubmitLockRef.current = true;
    setBookingSuccessMsg(null);
    setBookingErrorMsg(null);

    const activity = !isCustom
      ? catalogActivities.find((a) => a.id === Number(selectedActivityId))
      : null;
    const costNum = isCustom
      ? customCost
        ? parseFloat(customCost)
        : undefined
      : activity
        ? Number(activity.cost)
        : 0;

    try {
      if (isCustom) {
        const customBooking: Booking = {
          id: Date.now(),
          user_id: 0,
          trip_id: Number(selectedTrip.id),
          status: 'confirmed',
          custom_title: customTitle.trim(),
          custom_type: customType,
          custom_location: customLocation.trim() || undefined,
          ...(selectedPlannedDestinationId &&
          Number.isFinite(Number(selectedPlannedDestinationId))
            ? { destination_id: Number(selectedPlannedDestinationId) }
            : {}),
          cost: costNum,
          total_price: costNum,
          booking_date: bookingDate || undefined,
          notes: customNotes.trim() || undefined,
          created_at: new Date().toISOString(),
        };

        saveTripCustomBooking(selectedTrip.id, customBooking);

        setUserBookings((prev) => [customBooking, ...prev]);
        setSyncNotice(null);
        setBookingErrorMsg(null);
        setBookingSuccessMsg(
          `${customType === 'hotel' ? 'Stay reservation' : 'Activity'} "${customTitle}" booked successfully!`,
        );
        setTimeout(() => {
          setIsBookActivityOpen(false);
          setBookingSuccessMsg(null);
        }, 1500);
      } else {
        const payload = {
          activity_id: Number(selectedActivityId),
          trip_id: Number(selectedTrip.id),
          booking_date: bookingDate || undefined,
          total_price: costNum,
          cost: costNum,
        };

        const newBooking = await withRetry(() => bookingsApi.create(payload));

        saveBookingExtra(newBooking.id, {
          trip_id: Number(selectedTrip.id),
          booking_date: bookingDate || undefined,
          booking_time: bookingTime || undefined,
          activity_id: Number(selectedActivityId),
          activity_title: activity?.title || `Activity #${selectedActivityId}`,
          cost: costNum,
          total_price: costNum,
        });

        const fullBooking: Booking = {
          ...newBooking,
          trip_id: Number(selectedTrip.id),
          activity_id: Number(selectedActivityId),
          activity_title: activity?.title || `Activity #${selectedActivityId}`,
          custom_type: 'activity',
          cost: costNum,
          total_price: costNum,
          booking_date: bookingDate || undefined,
        };

        setUserBookings((prev) => [fullBooking, ...prev]);
        setSyncNotice(null);
        setBookingErrorMsg(null);
        setBookingSuccessMsg(
          `Activity "${activity?.title || 'Selected Activity'}" booked successfully!`,
        );
        setTimeout(() => {
          setIsBookActivityOpen(false);
          setBookingSuccessMsg(null);
        }, 1500);
      }
    } catch (err) {
      console.error('[DEBUG_BOOKINGS] booking submission FAILED:', err);
      const errMsg =
        'Unable to reach server — booking submission failed. Please try again.';
      setBookingErrorMsg(errMsg);
      setSyncNotice(errMsg);
    } finally {
      bookingSubmitLockRef.current = false;
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
                  <div className="bookings-empty-actions dashboard-empty-actions">
                    <button
                      type="button"
                      onClick={() => setIsCreateTripModalOpen(true)}
                      className="btn-create-trip dashboard-btn-create"
                    >
                      <Plus size={16} strokeWidth={2.5} className="text-white shrink-0" />
                      <span>Create a Trip</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard/explore')}
                      className="dashboard-btn-browse"
                    >
                      <img src={browseDestIcon} alt="" />
                      Browse Destinations
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
                        ? formatUserDateRange(t.startDate, t.endDate)
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
                          ? formatUserDateRange(
                              selectedTrip.startDate,
                              selectedTrip.endDate,
                            )
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
                        <span>Book Activity / Stay</span>
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

                  {/* Filter Section: Reservation Statuses & Types */}
                  <div className="bookings-filter-section">
                    {/* Row 1: Reservation Statuses */}
                    <div
                      className="bookings-reservation-status-tabs"
                      aria-label="Reservation status filters"
                    >
                      {(['all', 'pending', 'confirmed', 'completed'] as const).map(
                        (status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setBookingStatusFilter(status)}
                            className={`bookings-reservation-status-btn ${bookingStatusFilter === status ? 'active' : ''}`}
                          >
                            {status === 'all'
                              ? `All statuses (${bookingStatusCounts.all})`
                              : status === 'confirmed'
                                ? `Confirmed / processed (${bookingStatusCounts.confirmed})`
                                : status === 'completed'
                                  ? `Used / completed (${bookingStatusCounts.completed})`
                                  : `Pending (${bookingStatusCounts.pending})`}
                          </button>
                        ),
                      )}
                    </div>

                    {/* Row 2: Reservation Types */}
                    <div
                      className="bookings-type-tabs"
                      aria-label="Reservation type filters"
                    >
                      {(['all', 'activity', 'hotel'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setBookingTypeFilter(t)}
                          className={`bookings-type-tab-btn ${bookingTypeFilter === t ? 'active' : ''}`}
                        >
                          {t === 'all'
                            ? `All Reservations (${bookingTypeCounts.all})`
                            : t === 'activity'
                              ? `Activities (${bookingTypeCounts.activity})`
                              : `Hotels & Stays (${bookingTypeCounts.hotel})`}
                        </button>
                      ))}
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
                    ) : filteredLedgerItems.length > 0 ? (
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
                          {filteredLedgerItems.map((item) => (
                            <tr key={item.id} className="bookings-table-row">
                              <td className="bookings-cell-date">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span>{item.date}</span>
                                  {renderStatusBadge(item.status)}
                                </div>
                              </td>
                              <td className="bookings-cell-destination">
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
                    ) : (
                      <div
                        className="bookings-table-empty"
                        style={{ padding: '48px 24px' }}
                      >
                        <Ticket className="bookings-table-empty-icon" />
                        <h3 className="bookings-table-empty-title">
                          {ledgerItems.length === 0
                            ? 'No Booked Activities Yet'
                            : 'No reservations match this filter'}
                        </h3>
                        <p className="bookings-table-empty-desc">
                          {ledgerItems.length === 0
                            ? `You haven't booked any activities for ${selectedTrip.name} yet. Click "Book Activity" above to add reservations!`
                            : 'Choose another reservation type or status to see matching records.'}
                        </p>
                      </div>
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
              All ({tripTabCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`bookings-mobile-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            >
              Upcoming ({tripTabCounts.upcoming})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`bookings-mobile-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            >
              Completed ({tripTabCounts.completed})
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
                className="btn-create-trip mx-auto"
                style={{ width: '220px', height: '42px', fontSize: '14px' }}
              >
                <Plus size={16} strokeWidth={2.5} className="text-white shrink-0" />
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
                    ? formatUserDateRange(trip.startDate, trip.endDate)
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
        <div
          className="booking-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="book-activity-title"
        >
          <button
            type="button"
            className="modal-backdrop-dismiss"
            onClick={() => !bookingSubmitting && setIsBookActivityOpen(false)}
            aria-label="Close modal backdrop"
          />
          <div className="booking-modal-card">
            {/* Close Button (Figma #808:177, #808:207) */}
            <button
              type="button"
              className="booking-modal-close-btn"
              onClick={() => !bookingSubmitting && setIsBookActivityOpen(false)}
              aria-label="Close modal"
            >
              ×
            </button>

            {/* Header (Figma #808:175, #808:176 & #808:205, #808:206) */}
            <div className="booking-modal-header">
              <h3 id="book-activity-title" className="booking-modal-title">
                Book an Activity
              </h3>
              <p className="booking-modal-subtitle">
                {bookingMode === 'catalog'
                  ? 'Choose an activity from the catalog and reserve it for this trip.'
                  : 'Add your own reservation or hotel stay to this trip.'}
              </p>
            </div>

            {/* Success Feedback */}
            {bookingSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 my-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{bookingSuccessMsg}</span>
              </div>
            )}

            {/* Error Feedback */}
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
                  fontSize: '11px',
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 500,
                  margin: '12px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CloudOff size={14} style={{ color: '#E9724C', flexShrink: 0 }} />
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
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Tabs Switcher (Figma #808:179 - #808:183 & #808:209 - #808:213) */}
            <div className="booking-modal-tabs-wrapper">
              <div
                className="booking-modal-tabs"
                role="tablist"
                aria-label="Booking mode tabs"
              >
                <div
                  className={`booking-modal-slider-pill ${bookingMode === 'custom' ? 'slide-right' : 'slide-left'}`}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  role="tab"
                  aria-selected={bookingMode === 'catalog'}
                  onClick={() => {
                    setBookingMode('catalog');
                    setBookingErrorMsg(null);
                  }}
                  className={`booking-modal-tab-btn ${bookingMode === 'catalog' ? 'active' : ''}`}
                >
                  <Ticket size={14} className="shrink-0" />
                  <span>Catalog Activity</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={bookingMode === 'custom'}
                  onClick={() => {
                    setBookingMode('custom');
                    setBookingErrorMsg(null);
                  }}
                  className={`booking-modal-tab-btn ${bookingMode === 'custom' ? 'active' : ''}`}
                >
                  <Bed size={14} className="shrink-0" />
                  <span>Custom Reservation / Hotel</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleBookActivitySubmit} className="booking-modal-form">
              {bookingMode === 'catalog' ? (
                <>
                  {/* Select Activity (Figma #808:184, #808:185, #808:186) */}
                  <div className="booking-modal-field">
                    <label htmlFor="activity-select" className="booking-modal-label">
                      Select Activity
                    </label>
                    <select
                      id="activity-select"
                      className="booking-modal-select"
                      value={selectedActivityId}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.startsWith('planned:')) {
                          const planItem = plannedActivities.find(
                            (item) =>
                              item.destinationId === value.slice('planned:'.length),
                          );
                          if (planItem) {
                            setBookingMode('custom');
                            setCustomType('activity');
                            setCustomTitle(planItem.activity);
                            setCustomLocation(planItem.destinationName);
                            setSelectedPlannedDestinationId(planItem.destinationId);
                            setCustomCost('');
                            setSelectedActivityId('');
                          }
                          return;
                        }
                        setSelectedActivityId(value ? Number(value) : '');
                      }}
                      required={bookingMode === 'catalog'}
                    >
                      <option value="" disabled>
                        Select activity...
                      </option>
                      {plannedActivities.length > 0 && (
                        <optgroup label="Planned in this trip">
                          {plannedActivities.map((item) => (
                            <option
                              key={`planned-${item.destinationId}`}
                              value={`planned:${item.destinationId}`}
                            >
                              {item.destinationName} — {item.activity}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {tripCatalogActivities.map((act) => {
                        const destination = tripDestinations.find(
                          (item) => String(item.id) === String(act.destination_id),
                        );
                        return (
                          <option key={act.id} value={act.id}>
                            {destination?.location_name
                              ? `${destination.location_name} — `
                              : ''}
                            {act.title} — ₱{Number(act.cost).toLocaleString()}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Booking Date (Figma #808:187, #808:188, #808:189) */}
                  <div className="booking-modal-field">
                    <label htmlFor="booking-date" className="booking-modal-label">
                      Booking Date
                    </label>
                    <input
                      id="booking-date"
                      type="date"
                      className="booking-modal-input"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      required
                    />
                  </div>

                  {/* Booking Time (Figma #808:190, #808:191, #808:192) */}
                  <div className="booking-modal-field">
                    <label htmlFor="booking-time" className="booking-modal-label">
                      Booking Time
                    </label>
                    <select
                      id="booking-time"
                      className="booking-modal-select"
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                    >
                      <option value="" disabled>
                        Select time
                      </option>
                      <option value="09:00 AM">09:00 AM (Morning)</option>
                      <option value="10:30 AM">10:30 AM (Morning)</option>
                      <option value="01:30 PM">01:30 PM (Afternoon)</option>
                      <option value="03:00 PM">03:00 PM (Afternoon)</option>
                      <option value="06:00 PM">06:00 PM (Evening)</option>
                      <option value="Flexible / Anytime">Flexible / Anytime</option>
                    </select>
                  </div>

                  {/* Helper text (Figma #808:193) */}
                  <p className="booking-modal-helper-text">
                    Reservation details will be added to the selected trip.
                  </p>

                  {/* Selected Trip Info Card (Figma #808:194 - #808:197) */}
                  <div className="booking-modal-trip-card">
                    <span className="booking-modal-trip-tag">Selected trip</span>
                    <span className="booking-modal-trip-name">{selectedTrip.name}</span>
                    <span className="booking-modal-trip-meta">
                      {selectedTrip.countries && selectedTrip.countries.length > 0
                        ? selectedTrip.countries.join(', ')
                        : selectedTrip.name}{' '}
                      · booking dates follow your preferred display format
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {customType === 'hotel' && plannedAccommodations.length > 0 && (
                    <div className="booking-modal-field">
                      <label
                        htmlFor="planned-accommodation-select"
                        className="booking-modal-label"
                      >
                        Use planned accommodation (optional)
                      </label>
                      <select
                        id="planned-accommodation-select"
                        className="booking-modal-select"
                        value=""
                        onChange={(event) => {
                          const plannedStay = plannedAccommodations.find(
                            (destination) =>
                              String(destination.id) === event.target.value,
                          );
                          if (!plannedStay) return;
                          setCustomTitle(plannedStay.accommodation || '');
                          setCustomLocation(plannedStay.location_name);
                          setSelectedPlannedDestinationId(String(plannedStay.id));
                        }}
                      >
                        <option value="" disabled>
                          Select a planned stay...
                        </option>
                        {plannedAccommodations.map((destination) => (
                          <option key={destination.id} value={destination.id}>
                            {destination.location_name} — {destination.accommodation}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Reservation / Hotel Name (Figma #808:214, #808:215, #808:216) */}
                  <div className="booking-modal-field">
                    <label htmlFor="custom-title" className="booking-modal-label">
                      Reservation / Hotel Name
                    </label>
                    <input
                      id="custom-title"
                      type="text"
                      placeholder="Enter reservation or hotel name"
                      className="booking-modal-input"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      required
                    />
                  </div>

                  {/* Location (Figma #808:217, #808:218, #808:219) */}
                  <div className="booking-modal-field">
                    <label htmlFor="custom-location" className="booking-modal-label">
                      Location
                    </label>
                    <input
                      id="custom-location"
                      type="text"
                      placeholder="Enter city or place"
                      className="booking-modal-input"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                    />
                  </div>

                  {/* Booking Date (Figma #808:220, #808:221, #808:222) */}
                  <div className="booking-modal-field">
                    <label htmlFor="custom-date" className="booking-modal-label">
                      Booking Date
                    </label>
                    <input
                      id="custom-date"
                      type="date"
                      className="booking-modal-input"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      required
                    />
                  </div>

                  {/* Type (Figma #808:223 - #808:227) */}
                  <div className="booking-modal-field">
                    <span id="custom-type-label" className="booking-modal-label">
                      Type
                    </span>
                    <div
                      className="booking-modal-type-group"
                      role="group"
                      aria-labelledby="custom-type-label"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCustomType('activity');
                          setSelectedPlannedDestinationId('');
                        }}
                        className={`booking-modal-type-pill ${customType === 'activity' ? 'active' : ''}`}
                      >
                        <Ticket size={13} className="shrink-0" />
                        <span>Reservation</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomType('hotel');
                          setSelectedPlannedDestinationId('');
                        }}
                        className={`booking-modal-type-pill ${customType === 'hotel' ? 'active' : ''}`}
                      >
                        <Bed size={13} className="shrink-0" />
                        <span>Hotel / Stay</span>
                      </button>
                    </div>
                  </div>

                  {/* Notes (Figma #808:228, #808:229, #808:230) */}
                  <div className="booking-modal-field">
                    <label htmlFor="custom-notes" className="booking-modal-label">
                      Notes
                    </label>
                    <input
                      id="custom-notes"
                      type="text"
                      placeholder="Optional details"
                      className="booking-modal-input"
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Action Buttons (Figma #808:198 - #808:201 & #808:231 - #808:234) */}
              <div className="booking-modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setIsBookActivityOpen(false);
                    setBookingErrorMsg(null);
                  }}
                  className="booking-modal-cancel-btn"
                  disabled={bookingSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    bookingSubmitting ||
                    (bookingMode === 'catalog' && !selectedActivityId) ||
                    (bookingMode === 'custom' && !customTitle.trim())
                  }
                  className="booking-modal-submit-btn"
                >
                  {bookingSubmitting ? 'Confirming...' : 'Submit Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
