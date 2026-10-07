import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Plus,
  Calendar,
  ArrowUpRight,
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
  bookingsApi,
  accommodationsApi,
} from '../services/api';
import { mergeTripsWithExtras } from '../lib/tripExtras';
import { reconcileTripBookings, saveBookingExtra } from '../lib/bookingExtras';
import { formatUserDate, formatUserDateRange } from '../lib/formatters';
import type { Trip } from '../types/trip';
import type { Destination } from '../types/destination';
import type { Accommodation } from '../types/accommodation';
import type { Booking, BookingStatus } from '../types/booking';
import {
  countBookingStatuses,
  countBookingTypes,
  filterBookings,
  isAccommodationBooking,
  normalizeBookingStatus,
  type BookingStatusFilter,
} from '../lib/bookingFilters';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface BookingLedgerItem {
  id: string;
  date: string;
  destination: string;
  accommodation: string;
  cost: string;
  status: BookingStatus;
  type: 'hotel';
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
  const statusMeaning = {
    pending:
      'Your accommodation request is waiting for LakBye staff to complete the booking.',
    confirmed: 'Your accommodation has been booked and confirmed.',
    cancelled: 'This booking request was cancelled.',
    completed: 'This accommodation booking is completed.',
  }[norm as BookingStatus];
  switch (norm) {
    case 'confirmed':
      return (
        <span
          className="booking-status-badge booking-status-badge--confirmed"
          title={statusMeaning}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
            aria-hidden="true"
          />
          <span>Confirmed</span>
        </span>
      );
    case 'pending':
      return (
        <span
          className="booking-status-badge booking-status-badge--pending"
          title={statusMeaning}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"
            aria-hidden="true"
          />
          <span>Pending</span>
        </span>
      );
    case 'completed':
      return (
        <span
          className="booking-status-badge booking-status-badge--completed"
          title={statusMeaning}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0"
            aria-hidden="true"
          />
          <span>Completed</span>
        </span>
      );
    case 'cancelled':
      return (
        <span
          className="booking-status-badge booking-status-badge--cancelled"
          title={statusMeaning}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"
            aria-hidden="true"
          />
          <span>Cancelled</span>
        </span>
      );
    default:
      return (
        <span className="booking-status-badge booking-status-badge--completed">
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
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [plannedAccommodationInventory, setPlannedAccommodationInventory] = useState<{
    key: string;
    byDestination: Record<string, { items: Accommodation[]; error: boolean }>;
  } | null>(null);

  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Booking filters & modes
  const [bookingTypeFilter, setBookingTypeFilter] = useState<'all' | 'hotel'>('all');
  const [bookingStatusFilter, setBookingStatusFilter] =
    useState<BookingStatusFilter>('all');
  const [isAccommodationModalOpen, setIsAccommodationModalOpen] = useState(false);
  const [bookingPlanLoading, setBookingPlanLoading] = useState(false);
  const [bookingPlanRefreshFailed, setBookingPlanRefreshFailed] = useState(false);
  const [selectedPlannedDestinationId, setSelectedPlannedDestinationId] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
  const [bookingErrorMsg, setBookingErrorMsg] = useState<string | null>(null);
  const bookingSubmitLockRef = useRef(false);

  useModalBehavior(
    isAccommodationModalOpen,
    () => setIsAccommodationModalOpen(false),
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

  const plannedAccommodations = useMemo(
    () =>
      tripDestinations.filter(
        (destination) =>
          destination.accommodation_id != null || destination.accommodation?.trim(),
      ),
    [tripDestinations],
  );

  const plannedAccommodationLookupKey = useMemo(
    () =>
      JSON.stringify(
        plannedAccommodations.map((destination) => ({
          id: String(destination.id),
          country: destination.country || selectedTrip?.countries?.[0] || '',
          area: destination.location_name,
          plannedName: destination.accommodation || '',
          accommodationId: destination.accommodation_id ?? null,
        })),
      ),
    [plannedAccommodations, selectedTrip],
  );

  useEffect(() => {
    const rows = JSON.parse(plannedAccommodationLookupKey) as Array<{
      id: string;
      country: string;
      area: string;
      plannedName: string;
      accommodationId: number | null;
    }>;
    const controller = new AbortController();
    void Promise.all(
      rows.map(async (row) => {
        try {
          const items = await accommodationsApi.getByLocation(
            row.country,
            row.area,
            controller.signal,
          );
          return [
            row.id,
            {
              items: items.filter(
                (item) => item.active !== false && item.is_active !== false,
              ),
              error: false,
            },
          ] as const;
        } catch {
          return [row.id, { items: [], error: true }] as const;
        }
      }),
    ).then((entries) => {
      if (!controller.signal.aborted) {
        setPlannedAccommodationInventory({
          key: plannedAccommodationLookupKey,
          byDestination: Object.fromEntries(entries),
        });
      }
    });
    return () => controller.abort();
  }, [plannedAccommodationLookupKey]);

  const selectedPlannedDestination =
    plannedAccommodations.find(
      (destination) => String(destination.id) === selectedPlannedDestinationId,
    ) || null;
  const currentPlannedInventory =
    plannedAccommodationInventory?.key === plannedAccommodationLookupKey
      ? plannedAccommodationInventory.byDestination
      : null;
  const selectedDestinationInventory = selectedPlannedDestination
    ? currentPlannedInventory?.[String(selectedPlannedDestination.id)]
    : undefined;
  const selectedAccommodation =
    selectedPlannedDestination && selectedDestinationInventory
      ? selectedPlannedDestination.accommodation_id != null
        ? selectedDestinationInventory.items.find(
            (item) =>
              String(item.id) === String(selectedPlannedDestination.accommodation_id),
          ) || null
        : selectedDestinationInventory.items.find(
            (item) =>
              item.name.trim() === selectedPlannedDestination.accommodation?.trim(),
          ) || null
      : null;

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
      setUserBookings([]);
      return;
    }

    let cancelled = false;

    const fetchTripDetails = async () => {
      setDetailsLoading(true);
      setTripDestinations([]);
      setUserBookings([]);
      try {
        const destData = await destinationsApi
          .getByTripId(selectedTrip.id)
          .catch(() => []);
        if (!cancelled) {
          setTripDestinations(destData);
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

    // Show accommodation reservations only; legacy activity records remain stored.
    const tripBookings = userBookings.filter(
      (booking) =>
        String(booking.trip_id) === String(selectedTrip.id) &&
        isAccommodationBooking(booking),
    );

    if (tripBookings.length > 0) {
      return tripBookings.map((booking, idx) => {
        const destinationName =
          booking.custom_location ||
          tripDestinations.find(
            (destination) => String(destination.id) === String(booking.destination_id),
          )?.location_name ||
          selectedTrip.countries?.[0] ||
          selectedTrip.name;
        const cost = booking.total_price ?? booking.cost;

        const date = booking.booking_date
          ? formatUserDate(booking.booking_date)
          : booking.created_at
            ? formatUserDate(booking.created_at)
            : formatUserDate(selectedTrip.startDate) || 'Flexible';

        return {
          id: String(booking.id || `${selectedTrip.id}-booking-${idx}`),
          date,
          destination: destinationName,
          accommodation:
            booking.accommodation_name || booking.custom_title || 'Accommodation stay',
          cost:
            cost !== undefined && cost !== null && cost !== ''
              ? `PHP ${Number(cost).toLocaleString()}`
              : 'Not provided',
          status: normalizeBookingStatus(booking.status),
          type: 'hotel' as const,
        };
      });
    }

    return [];
  }, [selectedTrip, tripDestinations, userBookings]);

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

  const handleOpenAccommodationModal = async () => {
    if (!selectedTrip) return;
    setBookingDate(selectedTrip.startDate || new Date().toISOString().split('T')[0]);
    setSelectedPlannedDestinationId('');
    setCustomNotes('');
    setBookingSuccessMsg(null);
    setBookingErrorMsg(null);
    setIsAccommodationModalOpen(true);
    setBookingPlanLoading(true);
    setBookingPlanRefreshFailed(false);
    try {
      // Refresh at modal-open time so a recently saved Trip Planner selection
      // is not hidden by the destination list loaded earlier on this page.
      const freshDestinations = await destinationsApi.getByTripIdStrict(selectedTrip.id);
      setTripDestinations(freshDestinations);
      const firstPlannedStay =
        freshDestinations.find((destination) => destination.accommodation_id != null) ||
        freshDestinations.find((destination) => destination.accommodation?.trim());
      setSelectedPlannedDestinationId(String(firstPlannedStay?.id || ''));
    } catch {
      setBookingPlanRefreshFailed(true);
      setBookingErrorMsg(
        'Unable to load the latest planned accommodations. Please try again.',
      );
    } finally {
      setBookingPlanLoading(false);
    }
  };

  const handleBookAccommodationSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !selectedTrip ||
      bookingPlanLoading ||
      bookingPlanRefreshFailed ||
      bookingSubmitLockRef.current
    )
      return;
    if (!selectedPlannedDestination || !selectedAccommodation) {
      setBookingErrorMsg('Select an available planned accommodation before submitting.');
      return;
    }

    setBookingSubmitting(true);
    bookingSubmitLockRef.current = true;
    setBookingSuccessMsg(null);
    setBookingErrorMsg(null);

    try {
      const payload = {
        trip_id: Number(selectedTrip.id),
        destination_id: Number(selectedPlannedDestination.id),
        accommodation_id: selectedAccommodation.id,
        booking_date: bookingDate || undefined,
        notes: customNotes.trim() || undefined,
      };
      const savedBooking = await withRetry(() => bookingsApi.create(payload));
      const booking: Booking = {
        ...savedBooking,
        ...payload,
        accommodation_name: savedBooking.accommodation_name || selectedAccommodation.name,
        custom_title: savedBooking.custom_title || selectedAccommodation.name,
        status: savedBooking.status || 'pending',
        created_at: savedBooking.created_at || new Date().toISOString(),
      };
      saveBookingExtra(savedBooking.id, {
        trip_id: Number(selectedTrip.id),
        booking_date: bookingDate || undefined,
        custom_title: selectedAccommodation.name,
        custom_type: 'hotel',
        custom_location: selectedPlannedDestination.location_name,
        notes: customNotes.trim() || undefined,
      });
      setUserBookings((current) => [booking, ...current]);
      setSyncNotice(null);
      setBookingSuccessMsg(
        `Accommodation request for "${selectedAccommodation.name}" submitted. Status: Pending.`,
      );
      window.setTimeout(() => {
        setIsAccommodationModalOpen(false);
        setBookingSuccessMsg(null);
      }, 1200);
    } catch (error) {
      const apiError = error as {
        response?: { data?: { code?: string; message?: string } };
      };
      const errorText =
        `${apiError.response?.data?.code || ''} ${apiError.response?.data?.message || ''}`.toLowerCase();
      if (errorText.includes('price') && errorText.includes('required')) {
        setBookingErrorMsg(
          'This accommodation cannot be booked yet because pricing is not configured.',
        );
      } else if (
        errorText.includes('accommodation_not_found') ||
        errorText.includes('accommodation_not_available') ||
        errorText.includes('accommodation_location_mismatch') ||
        (errorText.includes('location') && errorText.includes('mismatch'))
      ) {
        setBookingErrorMsg(
          'This accommodation is no longer valid for the selected destination. Please choose another accommodation.',
        );
      } else {
        setBookingErrorMsg(
          'Unable to save this accommodation booking. Please try again.',
        );
      }
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
                        onClick={handleOpenAccommodationModal}
                        className="bookings-open-workspace-btn"
                        style={{
                          color: '#e9724c',
                          borderColor: 'rgba(233, 114, 76, 0.3)',
                          background: 'rgba(233, 114, 76, 0.08)',
                        }}
                      >
                        <Bed className="w-4 h-4" />
                        <span>Book Accommodation</span>
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
                                ? `Confirmed (${bookingStatusCounts.confirmed})`
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
                      {(['all', 'hotel'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setBookingTypeFilter(t)}
                          className={`bookings-type-tab-btn ${bookingTypeFilter === t ? 'active' : ''}`}
                        >
                          {t === 'all'
                            ? `All Reservations (${bookingTypeCounts.all})`
                            : `Accommodation (${bookingTypeCounts.hotel})`}
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
                            <th>Accommodation</th>
                            <th>Booking Cost</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody className="bookings-table-body">
                          {filteredLedgerItems.map((item) => (
                            <tr key={item.id} className="bookings-table-row">
                              <td className="bookings-cell-date">{item.date}</td>
                              <td className="bookings-cell-destination">
                                <span>{item.destination}</span>
                              </td>
                              <td
                                className="bookings-cell-accommodation"
                                title={item.accommodation}
                              >
                                {item.accommodation}
                              </td>
                              <td className="bookings-cell-budget">{item.cost}</td>
                              <td className="bookings-cell-status">
                                {renderStatusBadge(item.status)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div
                        className="bookings-table-empty"
                        style={{ padding: '48px 24px' }}
                      >
                        <Bed className="bookings-table-empty-icon" />
                        <h3 className="bookings-table-empty-title">
                          {ledgerItems.length === 0
                            ? 'No Accommodation Bookings Yet'
                            : 'No reservations match this filter'}
                        </h3>
                        <p className="bookings-table-empty-desc">
                          {ledgerItems.length === 0
                            ? 'Add a stay reservation from your trip plan.'
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
                    view its accommodation reservations.
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

      {isAccommodationModalOpen && selectedTrip && (
        <div
          className="booking-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-accommodation-title"
        >
          <button
            type="button"
            className="modal-backdrop-dismiss"
            onClick={() => !bookingSubmitting && setIsAccommodationModalOpen(false)}
            aria-label="Close accommodation booking dialog"
          />
          <div className="booking-modal-card">
            <button
              type="button"
              className="booking-modal-close-btn"
              onClick={() => !bookingSubmitting && setIsAccommodationModalOpen(false)}
              aria-label="Close modal"
            >
              <X size={18} aria-hidden="true" />
            </button>

            <div className="booking-modal-header">
              <h3 id="add-accommodation-title" className="booking-modal-title">
                Add Accommodation Booking
              </h3>
              <p className="booking-modal-subtitle">
                Add a stay reservation to {selectedTrip.name}.
              </p>
            </div>

            {bookingSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 my-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{bookingSuccessMsg}</span>
              </div>
            )}

            {bookingErrorMsg && (
              <div role="alert" className="booking-modal-error">
                <CloudOff size={14} aria-hidden="true" />
                <span>{bookingErrorMsg}</span>
                <button
                  type="button"
                  onClick={() => setBookingErrorMsg(null)}
                  aria-label="Dismiss error"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            <form onSubmit={handleBookAccommodationSubmit} className="booking-modal-form">
              {bookingPlanLoading ? (
                <p className="text-xs text-stone-500">
                  Loading planned accommodations...
                </p>
              ) : plannedAccommodations.length > 0 ? (
                <>
                  <div className="booking-modal-field">
                    <label
                      htmlFor="planned-accommodation-select"
                      className="booking-modal-label"
                    >
                      Planned Accommodation
                    </label>
                    <select
                      id="planned-accommodation-select"
                      className="booking-modal-select"
                      value={selectedPlannedDestinationId}
                      onChange={(event) => {
                        setSelectedPlannedDestinationId(event.target.value);
                        setBookingDate(selectedTrip.startDate || '');
                      }}
                    >
                      <option value="">Select a planned accommodation</option>
                      {plannedAccommodations.map((destination) => (
                        <option key={destination.id} value={destination.id}>
                          {destination.location_name} — {destination.accommodation}
                          {destination.country ? `, ${destination.country}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {plannedAccommodationInventory?.key !==
                  plannedAccommodationLookupKey ? (
                    <p className="text-xs text-stone-500">
                      Loading planned accommodation details...
                    </p>
                  ) : selectedDestinationInventory?.error ? (
                    <p role="alert" className="text-xs text-rose-700">
                      Unable to load accommodations.
                    </p>
                  ) : selectedPlannedDestination &&
                    selectedDestinationInventory &&
                    !selectedAccommodation ? (
                    <p role="alert" className="text-xs text-amber-800">
                      This accommodation is no longer available.
                      {selectedPlannedDestination.accommodation
                        ? ` ${selectedPlannedDestination.accommodation}. Select another property in Trip Planner.`
                        : ' Select another property in Trip Planner.'}
                    </p>
                  ) : selectedAccommodation && selectedPlannedDestination ? (
                    <div className="booking-modal-trip-card">
                      <span className="booking-modal-trip-tag">Selected property</span>
                      <span className="booking-modal-trip-name">
                        {selectedAccommodation.name}
                      </span>
                      <span className="booking-modal-trip-meta">
                        {selectedAccommodation.address ||
                          `${selectedAccommodation.area}, ${selectedAccommodation.country}`}
                      </span>
                      <span className="booking-modal-trip-meta font-semibold">
                        PHP {Number(selectedAccommodation.price).toLocaleString()}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : (
                <div role="alert" className="booking-modal-error">
                  Select an accommodation in Trip Planner before submitting a booking
                  request.
                </div>
              )}

              <div className="booking-modal-field">
                <label htmlFor="accommodation-date" className="booking-modal-label">
                  Booking Date
                </label>
                <input
                  id="accommodation-date"
                  type="date"
                  className="booking-modal-input"
                  value={bookingDate}
                  onChange={(event) => setBookingDate(event.target.value)}
                />
              </div>

              <div className="booking-modal-field">
                <label htmlFor="accommodation-notes" className="booking-modal-label">
                  Notes (optional)
                </label>
                <input
                  id="accommodation-notes"
                  type="text"
                  placeholder="Optional details"
                  className="booking-modal-input"
                  value={customNotes}
                  onChange={(event) => setCustomNotes(event.target.value)}
                />
              </div>

              <div className="booking-modal-trip-card">
                <span className="booking-modal-trip-tag">Selected trip</span>
                <span className="booking-modal-trip-name">{selectedTrip.name}</span>
                <span className="booking-modal-trip-meta">
                  {selectedTrip.startDate && selectedTrip.endDate
                    ? formatUserDateRange(selectedTrip.startDate, selectedTrip.endDate)
                    : selectedTrip.countries?.join(', ') || selectedTrip.name}
                </span>
              </div>

              <div className="booking-modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setIsAccommodationModalOpen(false);
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
                    bookingPlanLoading ||
                    bookingPlanRefreshFailed ||
                    !selectedAccommodation ||
                    !selectedPlannedDestination ||
                    plannedAccommodationInventory?.key !== plannedAccommodationLookupKey
                  }
                  className="booking-modal-submit-btn"
                >
                  {bookingSubmitting ? 'Saving...' : 'Save Accommodation Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
