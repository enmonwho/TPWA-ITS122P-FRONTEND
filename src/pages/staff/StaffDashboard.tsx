import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Search,
  CloudOff,
  X,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
} from 'lucide-react';
import lakbyeLogo from '../../assets/lakbye-logo.png';
import staffPendingIcon from '../../assets/staff/staff_pending.png';
import staffBookingsIcon from '../../assets/staff/staff_bookings_nav.png';
import staffSortIcon from '../../assets/staff/staff_sort.png';
import staffMenuIcon from '../../assets/staff/staff_menu.png';
import staffChevronDown from '../../assets/staff/staff_chevron_down.png';

import { useAuth } from '../../context/AuthContext';
import { bookingsApi, activitiesApi, adminApi } from '../../services/api';
import type { Booking, Activity, BookingStatus } from '../../types/booking';
import type { AdminUser } from '../../services/api';
import '../../styles/Staff.css';

type StaffTab = 'pending' | 'bookings';
type SortOrder = 'desc' | 'asc';

/**
 * Helper to retry network operations once upon initial failure.
 */
async function withRetry<T>(fn: () => Promise<T>, delayMs = 800): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`Staff API request failed, retrying in ${delayMs}ms...`, err);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return await fn();
  }
}

/**
 * Format ISO date string into readable date & time.
 */
function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format ISO date string into date only (e.g. Apr 15, 2026).
 */
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function StaffDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<StaffTab>('pending');

  // Core data states
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Search & Filter & Sort states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [processedStatusFilter, setProcessedStatusFilter] = useState<
    'all' | 'confirmed' | 'cancelled' | 'completed'
  >('all');

  // Dropdown open tracking
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<number | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  // Modal detail viewing
  const [selectedBookingForModal, setSelectedBookingForModal] = useState<Booking | null>(
    null,
  );

  // Staff User Display Name
  const staffName = user?.full_name || user?.email?.split('@')[0] || 'LakBye Staff';

  // Helper mappings
  const activityMap = useMemo(() => {
    const map = new Map<number, Activity>();
    activities.forEach((a) => map.set(a.id, a));
    return map;
  }, [activities]);

  const userMap = useMemo(() => {
    const map = new Map<number, AdminUser>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  // Fetch all bookings, activities, and user directory
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setSyncError(null);
    try {
      const [bookingsData, activitiesData, usersData] = await Promise.all([
        withRetry(() => bookingsApi.getAll()),
        withRetry(() => activitiesApi.getAll()).catch(() => [] as Activity[]),
        withRetry(() => adminApi.getUsers()).catch(() => [] as AdminUser[]),
      ]);

      setBookings(bookingsData || []);
      setActivities(activitiesData || []);
      setUsers(usersData || []);
    } catch (err) {
      console.error('Failed to load staff dashboard data:', err);
      setSyncError(
        'Unable to sync live booking data with backend. Retrying is available.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const initFetch = async () => {
      try {
        const [bookingsData, activitiesData, usersData] = await Promise.all([
          withRetry(() => bookingsApi.getAll()),
          withRetry(() => activitiesApi.getAll()).catch(() => [] as Activity[]),
          withRetry(() => adminApi.getUsers()).catch(() => [] as AdminUser[]),
        ]);

        if (active) {
          setBookings(bookingsData || []);
          setActivities(activitiesData || []);
          setUsers(usersData || []);
        }
      } catch (err) {
        console.error('Failed to load staff dashboard data:', err);
        if (active) {
          setSyncError(
            'Unable to sync live booking data with backend. Retrying is available.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    initFetch();
    return () => {
      active = false;
    };
  }, []);

  // Dismiss dropdowns on outside click
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('.staff-status-wrapper') &&
        !target.closest('.staff-action-wrapper')
      ) {
        setOpenStatusDropdownId(null);
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Handle Status Update
  const handleUpdateStatus = async (bookingId: number, nextStatus: BookingStatus) => {
    setStatusUpdatingId(bookingId);
    setOpenStatusDropdownId(null);
    setOpenActionMenuId(null);

    try {
      const updated = await bookingsApi.updateStatus(bookingId, nextStatus);
      // Update local state smoothly
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: updated.status || nextStatus } : b,
        ),
      );
    } catch (err) {
      console.error(`Failed to update booking #${bookingId} status:`, err);
      setSyncError(`Failed to update booking status to ${nextStatus}. Please retry.`);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Logout handler
  const handleLogout = () => {
    if (logout) {
      logout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    navigate('/login');
  };

  // Separate bookings into Pending vs Processed
  const pendingBookings = useMemo(() => {
    return bookings.filter((b) => (b.status || '').toLowerCase() === 'pending');
  }, [bookings]);

  const processedBookings = useMemo(() => {
    return bookings.filter((b) => (b.status || '').toLowerCase() !== 'pending');
  }, [bookings]);

  // Current working list based on tab
  const activeList = activeTab === 'pending' ? pendingBookings : processedBookings;

  // Filter and Sort active list
  const filteredList = useMemo(() => {
    let result = [...activeList];

    // Status filter in Processed Bookings tab
    if (activeTab === 'bookings' && processedStatusFilter !== 'all') {
      result = result.filter(
        (b) => (b.status || '').toLowerCase() === processedStatusFilter,
      );
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((b) => {
        const idFormatted = `lb${String(b.id).padStart(4, '0')}`.toLowerCase();
        const idRaw = String(b.id);
        const act = activityMap.get(b.activity_id);
        const actTitle = (b.activity_title || act?.title || '').toLowerCase();
        const usr = userMap.get(b.user_id);
        const customerName = (
          usr?.full_name ||
          usr?.name ||
          `Customer #${b.user_id}`
        ).toLowerCase();
        return (
          idFormatted.includes(q) ||
          idRaw.includes(q) ||
          actTitle.includes(q) ||
          customerName.includes(q)
        );
      });
    }

    // Sort by Date
    result.sort((a, b) => {
      const dateA = new Date(a.created_at || a.booking_date || 0).getTime();
      const dateB = new Date(b.created_at || b.booking_date || 0).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [
    activeList,
    activeTab,
    processedStatusFilter,
    searchQuery,
    sortOrder,
    activityMap,
    userMap,
  ]);

  return (
    <div className="staff-layout-root">
      {/* ===================================================================
          Sidebar Navigation (Exact 145px width matching Figma specs)
          =================================================================== */}
      <aside className="staff-sidebar">
        <div className="staff-logo-container">
          <img src={lakbyeLogo} alt="LakBye" className="staff-logo-img" />
        </div>

        <div className="staff-divider" />

        <div className="staff-profile-box">
          <div className="staff-profile-name">{staffName}</div>
          <span className="staff-role-badge">LakBye Staff</span>
        </div>

        <div className="staff-divider" />

        <nav className="staff-nav">
          <button
            type="button"
            className={`staff-nav-item ${activeTab === 'pending' ? 'active-pending' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <img src={staffPendingIcon} alt="" className="staff-nav-icon" />
            <span>Pending</span>
          </button>

          <button
            type="button"
            className={`staff-nav-item ${activeTab === 'bookings' ? 'active-bookings' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            <img src={staffBookingsIcon} alt="" className="staff-nav-icon" />
            <span>Bookings</span>
          </button>
        </nav>

        <div className="staff-sidebar-bottom">
          <div className="staff-divider" />
          <button type="button" className="staff-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ===================================================================
          Main Canvas Panel & Inner White Card
          =================================================================== */}
      <main className="staff-main-canvas">
        <div className="staff-inner-card">
          {/* Centered Watermark Logo */}
          <img src={lakbyeLogo} alt="" className="staff-watermark" />

          {/* Header Area */}
          <div className="staff-header-area">
            <div className="staff-heading-row">
              <h1 className="staff-page-title">
                {activeTab === 'pending' ? 'Pending Requests' : 'Processed Bookings'}
              </h1>
              {loading && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: '#7B6F68',
                  }}
                >
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Syncing...</span>
                </div>
              )}
            </div>

            {/* Sync Notice Banner */}
            {syncError && (
              <div className="staff-sync-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CloudOff size={16} style={{ color: '#E9724C' }} />
                  <span>{syncError}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={loadDashboardData}
                    style={{
                      background: '#E9724C',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncError(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#92400E',
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Controls Bar: Filter & Sort by, Search Bar */}
            <div className="staff-controls-bar">
              <div className="staff-controls-left">
                <span className="staff-controls-label">Filter &amp; Sort by:</span>

                {/* Sort Order Toggle */}
                <button
                  type="button"
                  className="staff-sort-btn"
                  title={`Order: ${sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}`}
                  onClick={() =>
                    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                  }
                >
                  <img src={staffSortIcon} alt="Sort" className="staff-sort-icon" />
                </button>

                {/* Date & Time Sort Pill */}
                <button
                  type="button"
                  className="staff-pill-btn active"
                  onClick={() =>
                    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                  }
                >
                  <span>Date &amp; Time</span>
                  <span style={{ fontSize: '10px' }}>
                    {sortOrder === 'desc' ? '↓' : '↑'}
                  </span>
                </button>

                {/* Status Filter Pill in Processed Bookings */}
                {activeTab === 'bookings' && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['all', 'confirmed', 'cancelled'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`staff-pill-btn ${processedStatusFilter === st ? 'active' : ''}`}
                        onClick={() => setProcessedStatusFilter(st)}
                      >
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search Bar */}
              <div className="staff-search-wrapper">
                <Search size={14} className="staff-search-icon" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="staff-search-input"
                />
              </div>
            </div>
          </div>

          {/* ===============================================================
              Table Data View
              =============================================================== */}
          <div className="staff-table-container">
            {loading && bookings.length === 0 ? (
              <div className="staff-empty-state">
                <RefreshCw size={24} className="animate-spin text-stone-400" />
                <span>Loading bookings from live backend...</span>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="staff-empty-state">
                <Info size={24} className="text-stone-400" />
                <span>
                  {searchQuery
                    ? 'No bookings match your search criteria.'
                    : activeTab === 'pending'
                      ? 'No pending requests awaiting staff action.'
                      : 'No processed bookings found.'}
                </span>
              </div>
            ) : activeTab === 'pending' ? (
              /* TAB 1: PENDING REQUESTS TABLE */
              <table className="staff-table">
                <thead>
                  <tr>
                    <th className="staff-th">Booking ID</th>
                    <th className="staff-th">Customer Name</th>
                    <th className="staff-th">Activity Title</th>
                    <th className="staff-th">Schedule Date &amp; Time</th>
                    <th className="staff-th">Cost</th>
                    <th className="staff-th">Submitted At</th>
                    <th className="staff-th" style={{ textAlign: 'center' }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((booking) => {
                    const activity = activityMap.get(booking.activity_id);
                    const customer = userMap.get(booking.user_id);
                    const costVal = booking.total_price ?? activity?.cost ?? 0;
                    const bookingCode = `LB${String(booking.id).padStart(4, '0')}`;
                    const customerName =
                      customer?.full_name ||
                      customer?.name ||
                      `Customer #${booking.user_id}`;
                    const activityTitle =
                      booking.activity_title ||
                      activity?.title ||
                      `Activity #${booking.activity_id}`;
                    const scheduleDate = booking.booking_date
                      ? formatDate(booking.booking_date)
                      : formatDateTime(booking.created_at);
                    const submittedAt = formatDateTime(booking.created_at);
                    const isUpdating = statusUpdatingId === booking.id;
                    const isDropdownOpen = openStatusDropdownId === booking.id;

                    return (
                      <tr key={booking.id} className="staff-tr">
                        <td className="staff-td staff-booking-id">{bookingCode}</td>
                        <td className="staff-td staff-customer-name">{customerName}</td>
                        <td className="staff-td staff-activity-title">{activityTitle}</td>
                        <td className="staff-td staff-time-val">{scheduleDate}</td>
                        <td className="staff-td staff-cost-val">
                          ₱{Number(costVal).toLocaleString()}
                        </td>
                        <td className="staff-td staff-time-val">{submittedAt}</td>
                        <td className="staff-td" style={{ textAlign: 'center' }}>
                          <div className="staff-status-wrapper">
                            <button
                              type="button"
                              className="staff-status-pill pending clickable"
                              title="Click to update status"
                              disabled={isUpdating}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenStatusDropdownId(
                                  isDropdownOpen ? null : booking.id,
                                );
                              }}
                            >
                              {isUpdating ? (
                                <span>Updating...</span>
                              ) : (
                                <>
                                  <span>PENDING</span>
                                  <img
                                    src={staffChevronDown}
                                    alt=""
                                    className={`staff-chevron-icon ${isDropdownOpen ? 'open' : ''}`}
                                  />
                                </>
                              )}
                            </button>

                            {/* Dropdown to Confirm or Reject */}
                            {isDropdownOpen && (
                              <div className="staff-dropdown-menu">
                                <button
                                  type="button"
                                  className="staff-dropdown-item confirm"
                                  onClick={() =>
                                    handleUpdateStatus(booking.id, 'confirmed')
                                  }
                                >
                                  <CheckCircle2 size={14} />
                                  <span>Confirm</span>
                                </button>
                                <button
                                  type="button"
                                  className="staff-dropdown-item cancel"
                                  onClick={() =>
                                    handleUpdateStatus(booking.id, 'cancelled')
                                  }
                                >
                                  <XCircle size={14} />
                                  <span>Reject</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              /* TAB 2: PROCESSED BOOKINGS TABLE */
              <table className="staff-table">
                <thead>
                  <tr>
                    <th className="staff-th">Booking ID</th>
                    <th className="staff-th">Customer Name</th>
                    <th className="staff-th">Activity</th>
                    <th className="staff-th">Schedule Date &amp; Time</th>
                    <th className="staff-th">Cost</th>
                    <th className="staff-th">Processed At</th>
                    <th className="staff-th" style={{ textAlign: 'center' }}>
                      Status
                    </th>
                    <th className="staff-th" style={{ textAlign: 'center' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((booking) => {
                    const activity = activityMap.get(booking.activity_id);
                    const customer = userMap.get(booking.user_id);
                    const costVal = booking.total_price ?? activity?.cost ?? 0;
                    const bookingCode = `LB${String(booking.id).padStart(4, '0')}`;
                    const customerName =
                      customer?.full_name ||
                      customer?.name ||
                      `Customer #${booking.user_id}`;
                    const activityTitle =
                      booking.activity_title ||
                      activity?.title ||
                      `Activity #${booking.activity_id}`;
                    const scheduleDate = booking.booking_date
                      ? formatDate(booking.booking_date)
                      : formatDateTime(booking.created_at);
                    const processedAt = formatDateTime(booking.created_at);
                    const normStatus = (booking.status || 'confirmed').toLowerCase();
                    const isActionOpen = openActionMenuId === booking.id;
                    const isUpdating = statusUpdatingId === booking.id;

                    return (
                      <tr key={booking.id} className="staff-tr">
                        <td className="staff-td staff-booking-id">{bookingCode}</td>
                        <td className="staff-td staff-customer-name">{customerName}</td>
                        <td className="staff-td staff-activity-title">{activityTitle}</td>
                        <td className="staff-td staff-time-val">{scheduleDate}</td>
                        <td className="staff-td staff-cost-val">
                          ₱{Number(costVal).toLocaleString()}
                        </td>
                        <td className="staff-td staff-time-val">{processedAt}</td>
                        <td className="staff-td" style={{ textAlign: 'center' }}>
                          <span className={`staff-status-pill ${normStatus}`}>
                            {normStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="staff-td" style={{ textAlign: 'center' }}>
                          <div className="staff-status-wrapper staff-action-wrapper">
                            <button
                              type="button"
                              className="staff-action-btn"
                              title="Actions"
                              disabled={isUpdating}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionMenuId(isActionOpen ? null : booking.id);
                              }}
                            >
                              <img
                                src={staffMenuIcon}
                                alt="Actions"
                                className="staff-action-icon"
                              />
                            </button>

                            {/* Processed Booking Actions Menu */}
                            {isActionOpen && (
                              <div className="staff-dropdown-menu">
                                <button
                                  type="button"
                                  className="staff-dropdown-item"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    setSelectedBookingForModal(booking);
                                  }}
                                >
                                  <Info size={14} />
                                  <span>View Details</span>
                                </button>
                                <button
                                  type="button"
                                  className="staff-dropdown-item revert"
                                  onClick={() =>
                                    handleUpdateStatus(booking.id, 'pending')
                                  }
                                >
                                  <Clock size={14} />
                                  <span>Revert to Pending</span>
                                </button>
                                {normStatus !== 'confirmed' && (
                                  <button
                                    type="button"
                                    className="staff-dropdown-item confirm"
                                    onClick={() =>
                                      handleUpdateStatus(booking.id, 'confirmed')
                                    }
                                  >
                                    <CheckCircle2 size={14} />
                                    <span>Set Confirmed</span>
                                  </button>
                                )}
                                {normStatus !== 'cancelled' && (
                                  <button
                                    type="button"
                                    className="staff-dropdown-item cancel"
                                    onClick={() =>
                                      handleUpdateStatus(booking.id, 'cancelled')
                                    }
                                  >
                                    <XCircle size={14} />
                                    <span>Set Cancelled</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* ===================================================================
          Details Modal for Processed Booking
          =================================================================== */}
      {selectedBookingForModal && (
        <div className="staff-modal-backdrop">
          <button
            type="button"
            className="staff-modal-backdrop-dismiss"
            aria-label="Close modal overlay"
            onClick={() => setSelectedBookingForModal(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-modal-title"
            className="staff-modal-card"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 id="staff-modal-title" className="staff-modal-title">
                Booking Details
              </h2>
              <button
                type="button"
                onClick={() => setSelectedBookingForModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#7B6F68',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="staff-detail-row">
              <span className="staff-detail-label">Booking ID</span>
              <span className="staff-detail-val staff-booking-id">
                LB{String(selectedBookingForModal.id).padStart(4, '0')}
              </span>
            </div>

            <div className="staff-detail-row">
              <span className="staff-detail-label">Customer</span>
              <span className="staff-detail-val">
                {userMap.get(selectedBookingForModal.user_id)?.full_name ||
                  userMap.get(selectedBookingForModal.user_id)?.name ||
                  `Customer #${selectedBookingForModal.user_id}`}
              </span>
            </div>

            <div className="staff-detail-row">
              <span className="staff-detail-label">Activity</span>
              <span className="staff-detail-val">
                {selectedBookingForModal.activity_title ||
                  activityMap.get(selectedBookingForModal.activity_id)?.title ||
                  `Activity #${selectedBookingForModal.activity_id}`}
              </span>
            </div>

            <div className="staff-detail-row">
              <span className="staff-detail-label">Total Cost</span>
              <span className="staff-detail-val staff-cost-val">
                ₱
                {Number(
                  selectedBookingForModal.total_price ??
                    activityMap.get(selectedBookingForModal.activity_id)?.cost ??
                    0,
                ).toLocaleString()}
              </span>
            </div>

            <div className="staff-detail-row">
              <span className="staff-detail-label">Schedule Date</span>
              <span className="staff-detail-val">
                {formatDate(
                  selectedBookingForModal.booking_date ||
                    selectedBookingForModal.created_at,
                )}
              </span>
            </div>

            <div className="staff-detail-row">
              <span className="staff-detail-label">Submitted At</span>
              <span className="staff-detail-val">
                {formatDateTime(selectedBookingForModal.created_at)}
              </span>
            </div>

            <div className="staff-detail-row">
              <span className="staff-detail-label">Current Status</span>
              <span
                className={`staff-status-pill ${(selectedBookingForModal.status || 'pending').toLowerCase()}`}
              >
                {(selectedBookingForModal.status || 'pending').toUpperCase()}
              </span>
            </div>

            <div
              style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}
            >
              <button
                type="button"
                onClick={() => setSelectedBookingForModal(null)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: '1px solid #D9D9D9',
                  background: '#FFFFFF',
                  color: '#401C02',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
