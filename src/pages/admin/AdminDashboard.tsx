import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Users,
  List,
  Database,
  LogOut,
  Search,
  MoreVertical,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Activity as ActivityIcon,
} from 'lucide-react';
import lakbyeLogo from '../../assets/lakbye-logo.png';
import { adminApi, bookingsApi, destinationsApi, tripsApi } from '../../services/api';
import type {
  AdminUser,
  SystemAuditLog,
  AdminSystemReportData,
} from '../../services/api';
import type { Trip } from '../../types/trip';
import type { Destination } from '../../types/destination';
import type { Booking, BookingStatus } from '../../types/booking';
import { isAccommodationBooking } from '../../lib/bookingFilters';
import { formatBookingCost } from '../../lib/bookingCost';
import { useAuth } from '../../context/AuthContext';
import { STORAGE_KEYS } from '../../lib/constants';
import '../../styles/Admin.css';
import AdminUserActivity from './AdminUserActivity';

type Tab = 'systems' | 'users' | 'categories' | 'master' | 'activity';

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: Tab =
    rawTab && ['systems', 'users', 'categories', 'master', 'activity'].includes(rawTab)
      ? (rawTab as Tab)
      : 'systems';

  const setActiveTab = (tab: Tab) => {
    setSearchParams({ tab }, { replace: true });
  };
  const { user, setUser, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/login', { replace: true });
      } else if (user.role?.toLowerCase() !== 'admin') {
        const dest = user.role?.toLowerCase() === 'staff' ? '/staff' : '/dashboard';
        navigate(dest, { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    if (setUser) setUser(null);
    navigate('/login');
  };

  if (isLoading || !user || user.role?.toLowerCase() !== 'admin') {
    return null;
  }

  const adminName = user?.full_name || user?.email?.split('@')[0] || 'Administrator';

  return (
    <div className="admin-layout-root">
      {/* 145px Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="admin-logo-container">
          <img src={lakbyeLogo} alt="LakBye" className="admin-logo-img" />
        </div>

        <div className="admin-divider" />

        <div className="admin-profile-box">
          <div className="admin-profile-name">{adminName}</div>
          <span className="admin-role-badge">LakBye Admin</span>
        </div>

        <div className="admin-divider" />

        <nav className="admin-nav">
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'systems' ? 'active' : ''}`}
            onClick={() => setActiveTab('systems')}
          >
            <FileText size={16} /> Systems Report
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} /> User Management
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            <List size={16} /> Trips & Bookings
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'master' ? 'active' : ''}`}
            onClick={() => setActiveTab('master')}
          >
            <Database size={16} /> Master Records
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <ActivityIcon size={16} /> User Activity
          </button>
        </nav>

        <div className="admin-divider mt-auto" />

        <button type="button" className="admin-logout-btn" onClick={handleLogout}>
          <LogOut size={16} /> Log out
        </button>
      </aside>

      {/* Main Framed Canvas */}
      <main className="admin-main-canvas">
        {activeTab === 'systems' && <SystemsReportTab />}
        {activeTab === 'users' && <UserManagementTab />}
        {activeTab === 'categories' && <TripsBookingsTab />}
        {activeTab === 'master' && <MasterRecordsTab />}
        {activeTab === 'activity' && <AdminUserActivity />}
      </main>
    </div>
  );
}

// Tab 1: Systems Report
function SystemsReportTab() {
  const [selectedPeriod, setSelectedPeriod] = useState<'30d' | '90d' | '1y'>('30d');
  const [reportData, setReportData] = useState<AdminSystemReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadMetrics() {
      setLoading(true);
      const data = await adminApi.getReports(selectedPeriod);
      if (isMounted) {
        setReportData(data);
        setLoading(false);
      }
    }
    loadMetrics();
    return () => {
      isMounted = false;
    };
  }, [selectedPeriod]);

  const handleExportReport = () => {
    if (!reportData) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toLocaleString();

    const periodLabel =
      selectedPeriod === '30d'
        ? 'Last 30 days'
        : selectedPeriod === '90d'
          ? 'Last 3 months'
          : 'This year';

    const rows: (string | number)[][] = [
      ['LakBye Travel Planner - Systems Analytics Report'],
      [`Generated at: ${timestamp}`],
      [`Time Period: ${periodLabel}`],
      [],
      ['=== CORE KPI SUMMARY ==='],
      ['KPI', 'Value', 'Delta Trend'],
      [
        'Monthly Bookings',
        reportData.kpis.monthlyBookings.formatted,
        `${reportData.kpis.monthlyBookings.isPositive ? '+' : '-'}${reportData.kpis.monthlyBookings.changePct}%`,
      ],
      [
        'Most Requested Destination',
        reportData.kpis.mostRequestedDestination.name,
        `${reportData.kpis.mostRequestedDestination.requestsCount} requests`,
      ],
      [
        'Planned Budgets',
        reportData.kpis.plannedBudgets.formatted,
        'Across active plans',
      ],
      [
        'Active Users',
        reportData.kpis.activeUsers.formatted,
        `${reportData.kpis.activeUsers.isPositive ? '+' : '-'}${reportData.kpis.activeUsers.changePct}%`,
      ],
      [],
      ['=== TOP 5 MOST REQUESTED DESTINATIONS ==='],
      ['Rank', 'Destination', 'Trip Requests', 'Share of Top (%)'],
      ...reportData.topDestinations.map((d) => [
        d.rank,
        d.name,
        d.count,
        `${d.percentage}%`,
      ]),
      [],
      ['=== USER STATUS OVERVIEW (BY MONTH) ==='],
      ['Month', 'Active Users', 'New Users', 'Inactive Users'],
      ...reportData.userStatusBreakdown.months.map((month, i) => [
        month,
        reportData.userStatusBreakdown.active[i] ?? 0,
        reportData.userStatusBreakdown.newUsers[i] ?? 0,
        reportData.userStatusBreakdown.inactive[i] ?? 0,
      ]),
      [],
      ['=== MONTHLY PLANNED BUDGET TREND ==='],
      ['Month', 'Total Planned Budget (PHP)'],
      ...reportData.monthlyBudgetTrend.months.map((month, i) => [
        month,
        reportData.monthlyBudgetTrend.values[i] ?? 0,
      ]),
      [],
      ['=== MONTHLY BOOKINGS TREND ==='],
      ['Month', 'Bookings Count'],
      ...reportData.monthlyBookingsTrend.months.map((month, i) => [
        month,
        reportData.monthlyBookingsTrend.values[i] ?? 0,
      ]),
      [],
      ['=== SESSION METRICS ==='],
      ['Average Session Duration', reportData.sessionMetrics.avgDurationFormatted],
      ['Period-over-Period Trend', `${reportData.sessionMetrics.changePct}%`],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows
        .map((e) => e.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `lakbye-system-report-${selectedPeriod}-${dateStr}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // SVG Line Chart Coordinate Generator for Monthly Budget
  const budgetChart = useMemo(() => {
    if (!reportData?.monthlyBudgetTrend) return null;
    const { values, months } = reportData.monthlyBudgetTrend;
    if (!values.length) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const diff = max - min || 1;
    const n = values.length;
    const xStep = n > 1 ? (385 - 5) / (n - 1) : 0;

    const points = values.map((val, idx) => {
      const x = Math.round(5 + idx * xStep);
      const y = Math.round(140 - ((val - min) / diff) * 115);
      return { x, y, val, month: months[idx] };
    });

    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
    return { points, polylinePoints, months };
  }, [reportData?.monthlyBudgetTrend]);

  // Max value for scaling user status grouped bars
  const maxUserVal = useMemo(() => {
    if (!reportData?.userStatusBreakdown) return 100;
    const { active, newUsers, inactive } = reportData.userStatusBreakdown;
    return Math.max(...active, ...newUsers, ...inactive, 1);
  }, [reportData?.userStatusBreakdown]);

  // Max value for scaling booking mini bars
  const maxBookingVal = useMemo(() => {
    if (!reportData?.monthlyBookingsTrend) return 100;
    return Math.max(...reportData.monthlyBookingsTrend.values, 1);
  }, [reportData?.monthlyBookingsTrend]);

  return (
    <div className="admin-card-panel flex-1 flex flex-col admin-report-panel">
      {/* Header */}
      <div className="admin-panel-header items-center pb-4 admin-report-header">
        <h1 className="text-2xl font-bold text-black font-sans">LakBye Systems Report</h1>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as '30d' | '90d' | '1y')}
            className="admin-report-select"
            aria-label="Filter report time period"
          >
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 3 months</option>
            <option value="1y">This year</option>
          </select>

          <button
            type="button"
            onClick={handleExportReport}
            disabled={!reportData}
            className="flex items-center gap-2 px-4 py-2 border border-stone-200 rounded-full text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer admin-report-export disabled:opacity-50"
          >
            <Download size={14} /> Export Report (CSV)
          </button>
        </div>
      </div>

      <div className="admin-header-rule mb-6 admin-report-rule" />

      {loading && !reportData ? (
        <div className="flex-1 flex items-center justify-center text-stone-500">
          Compiling system analytics...
        </div>
      ) : reportData ? (
        <div className="admin-report-content">
          {/* Top 4 KPI Cards Matching Figma Design */}
          <div className="admin-report-kpis">
            {/* KPI 1: Monthly Bookings */}
            <article className="admin-report-kpi">
              <span className="report-eyebrow">TOTAL</span>
              <span className="report-kpi-label">Monthly Bookings</span>
              <strong>{reportData.kpis.monthlyBookings.formatted}</strong>
              <span className="report-kpi-note">
                <span
                  className={reportData.kpis.monthlyBookings.isPositive ? 'up' : 'down'}
                >
                  {reportData.kpis.monthlyBookings.isPositive ? '↑' : '↓'}{' '}
                  {reportData.kpis.monthlyBookings.changePct}%
                </span>{' '}
                from last month
              </span>
            </article>

            {/* KPI 2: Most Requested Destination */}
            <article
              className="admin-report-kpi admin-report-kpi-dest"
              style={
                reportData.kpis.mostRequestedDestination.imageUrl
                  ? {
                      backgroundImage: `linear-gradient(180deg, rgba(233, 114, 76, 0.20) 0%, rgba(25, 18, 16, 0.55) 100%), url("${reportData.kpis.mostRequestedDestination.imageUrl}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : undefined
              }
            >
              <span className="report-eyebrow">MOST</span>
              <span className="report-kpi-label">Requested Destination</span>
              <strong style={{ fontSize: 'clamp(18px, 1.6vw, 24px)', lineHeight: 1.2 }}>
                {reportData.kpis.mostRequestedDestination.name}
              </strong>
              <span className="report-kpi-note">
                {reportData.kpis.mostRequestedDestination.requestsCount} trip requests
                this period
              </span>
            </article>

            {/* KPI 3: Planned Budgets */}
            <article className="admin-report-kpi">
              <span className="report-eyebrow">TOTAL</span>
              <span className="report-kpi-label">Planned Budgets</span>
              <strong>{reportData.kpis.plannedBudgets.formatted}</strong>
              <span className="report-kpi-note">Across active trip plans</span>
            </article>

            {/* KPI 4: Active Users */}
            <article className="admin-report-kpi">
              <span className="report-eyebrow">TOTAL</span>
              <span className="report-kpi-label">Active Users</span>
              <strong>{reportData.kpis.activeUsers.formatted}</strong>
              <span className="report-kpi-note">
                <span className={reportData.kpis.activeUsers.isPositive ? 'up' : 'down'}>
                  {reportData.kpis.activeUsers.isPositive ? '↑' : '↓'}{' '}
                  {reportData.kpis.activeUsers.changePct}%
                </span>{' '}
                from last month
              </span>
            </article>
          </div>

          {/* 5 Analytical Report Cards */}
          <div className="admin-report-charts">
            {/* Card 1: Users (New, Active, Inactive) */}
            <article className="report-chart-card report-users-chart">
              <h2>Users (New, Active, Inactive)</h2>
              <p>Monthly user status overview</p>
              <div className="report-legend">
                <span>
                  <i className="legend-active" />
                  Active
                </span>
                <span>
                  <i className="legend-new" />
                  New
                </span>
                <span>
                  <i className="legend-inactive" />
                  Inactive
                </span>
              </div>
              <div className="report-grouped-bars" aria-label="Monthly user status chart">
                {reportData.userStatusBreakdown.months.map((month, idx) => {
                  const act = reportData.userStatusBreakdown.active[idx] ?? 0;
                  const nw = reportData.userStatusBreakdown.newUsers[idx] ?? 0;
                  const inact = reportData.userStatusBreakdown.inactive[idx] ?? 0;

                  const actH =
                    act > 0 && maxUserVal > 0
                      ? Math.max(6, Math.round((act / maxUserVal) * 100))
                      : 0;
                  const nwH =
                    nw > 0 && maxUserVal > 0
                      ? Math.max(5, Math.round((nw / maxUserVal) * 100))
                      : 0;
                  const inactH =
                    inact > 0 && maxUserVal > 0
                      ? Math.max(4, Math.round((inact / maxUserVal) * 100))
                      : 0;

                  return (
                    <div
                      key={month}
                      className="report-bar-group"
                      title={`${month} — Active: ${act}, New: ${nw}, Inactive: ${inact}`}
                    >
                      <i style={{ height: `${actH}%` }} />
                      <i style={{ height: `${nwH}%` }} />
                      <i style={{ height: `${inactH}%` }} />
                    </div>
                  );
                })}
                <div className="report-axis-labels">
                  {reportData.userStatusBreakdown.months.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            </article>

            {/* Card 2: Monthly Planned Budget */}
            <article className="report-chart-card report-budget-chart">
              <h2>Monthly Planned Budget</h2>
              <p>Total planned trip budget by month</p>
              <div className="report-line-chart">
                {budgetChart && (
                  <svg
                    viewBox="0 0 390 170"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label="Monthly planned budget trend"
                  >
                    <polyline points={budgetChart.polylinePoints} />
                    <g>
                      {budgetChart.points.map((pt) => (
                        <circle key={`${pt.x}-${pt.y}`} cx={pt.x} cy={pt.y} r={4}>
                          <title>{`${pt.month}: ₱${pt.val.toLocaleString()}`}</title>
                        </circle>
                      ))}
                    </g>
                  </svg>
                )}
              </div>
              <div className="report-months">
                {reportData.monthlyBudgetTrend.months.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </article>

            {/* Card 3: Monthly Bookings */}
            <article className="report-chart-card report-bookings-chart">
              <h2>Monthly Bookings</h2>
              <p>Bookings created during the selected period</p>
              <div className="report-booking-bars" aria-label="Monthly bookings chart">
                {reportData.monthlyBookingsTrend.values.map((count, index) => {
                  const height =
                    count > 0 && maxBookingVal > 0
                      ? Math.max(6, Math.round((count / maxBookingVal) * 100))
                      : 0;
                  const monthName = reportData.monthlyBookingsTrend.months[index] || '';
                  return (
                    <i
                      key={index}
                      style={{ height: `${height}%` }}
                      title={`${monthName}: ${count} bookings`}
                    />
                  );
                })}
              </div>
              <div className="report-months">
                {reportData.monthlyBookingsTrend.months.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </article>

            {/* Card 4: Top 5 Most Requested Destinations */}
            <article className="report-chart-card report-destinations-chart">
              <h2>Top 5 Most Requested Destinations</h2>
              <p>Based on trip requests</p>
              <div className="report-destinations-list">
                {reportData.topDestinations && reportData.topDestinations.length > 0 ? (
                  reportData.topDestinations.map((destination) => (
                    <div
                      className="report-destination-row"
                      key={`${destination.rank}-${destination.name}`}
                    >
                      <span className="report-rank">{destination.rank}</span>
                      <div className="report-destination-name">
                        <b>{destination.name}</b>
                        <span>
                          <i style={{ width: `${destination.percentage}%` }} />
                        </span>
                      </div>
                      <strong>{destination.count}</strong>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '36px 12px',
                      fontSize: '11px',
                      color: '#8a7a70',
                    }}
                  >
                    No destination requests recorded in database yet
                  </div>
                )}
              </div>
            </article>

            {/* Card 5: Avg. Session Duration */}
            <article className="report-chart-card report-session-chart">
              <h2>Avg. Session Duration</h2>
              <p>Average time users spend in LakBye</p>
              <strong className="report-session-value">
                {reportData.sessionMetrics.avgDurationFormatted}
              </strong>
              <span className="report-session-note">
                <span className={reportData.sessionMetrics.isPositive ? 'up' : 'down'}>
                  {reportData.sessionMetrics.isPositive ? '↑' : '↓'}{' '}
                  {reportData.sessionMetrics.changePct}%
                </span>{' '}
                vs. previous period
              </span>
              <div className="report-progress">
                <i style={{ width: `${reportData.sessionMetrics.fillPercentage}%` }} />
              </div>
            </article>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-red-500 font-semibold">
          Failed to load metrics. Ensure backend server is running.
        </div>
      )}
    </div>
  );
}

// Tab 2: User Management
function UserManagementTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [alphabeticalSort, setAlphabeticalSort] = useState<'asc' | 'desc' | null>('asc');
  const [statusFilterActive, setStatusFilterActive] = useState(false);
  const [roleSortActive, setRoleSortActive] = useState(false);
  const [dateSortActive, setDateSortActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  // Deactivation confirmation state (replaces userToDelete in standard user management)
  const [userToDeactivate, setUserToDeactivate] = useState<AdminUser | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await adminApi.getUsers();
        setUsers(data || []);
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleToggleStatus = async (userObj: AdminUser) => {
    try {
      const nextStatus = !userObj.is_active;
      await adminApi.toggleUserStatus(userObj.id, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === userObj.id ? { ...u, is_active: nextStatus } : u)),
      );
      setActiveMenuId(null);
    } catch (err) {
      console.error('Failed to update user status:', err);
    }
  };

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const displayName = u.full_name || u.name || '';
        const matchesSearch =
          displayName.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;
        if (statusFilterActive && !u.is_active) return false;
        return true;
      })
      .sort((a, b) => {
        if (dateSortActive) {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          const diff = timeB - timeA;
          if (diff !== 0) return diff;
        }
        if (roleSortActive) {
          const roleDiff = a.role.localeCompare(b.role);
          if (roleDiff !== 0) return roleDiff;
        }
        if (alphabeticalSort) {
          const nameA = a.full_name || a.name || '';
          const nameB = b.full_name || b.name || '';
          return alphabeticalSort === 'asc'
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
        }
        return 0;
      });
  }, [
    users,
    search,
    alphabeticalSort,
    statusFilterActive,
    roleSortActive,
    dateSortActive,
  ]);

  return (
    <div className="admin-card-panel">
      <img src={lakbyeLogo} alt="" className="admin-watermark" />
      <div className="admin-panel-header">
        <h1 className="admin-panel-title">User Management</h1>
      </div>
      <div className="admin-header-rule" />

      <div className="admin-filter-bar">
        <span className="admin-filter-bar-label">Filter & Sort by:</span>
        <button
          type="button"
          className={`admin-filter-pill ${alphabeticalSort === 'asc' ? 'active font-bold border-amber-500 bg-amber-50 text-amber-900' : ''}`}
          onClick={() => {
            setAlphabeticalSort((prev) => (prev === 'asc' ? null : 'asc'));
          }}
        >
          A to Z
        </button>
        <button
          type="button"
          className={`admin-filter-pill ${alphabeticalSort === 'desc' ? 'active font-bold border-amber-500 bg-amber-50 text-amber-900' : ''}`}
          onClick={() => {
            setAlphabeticalSort((prev) => (prev === 'desc' ? null : 'desc'));
          }}
        >
          Z to A
        </button>
        <button
          type="button"
          className={`admin-filter-pill ${statusFilterActive ? 'active font-bold border-amber-500 bg-amber-50 text-amber-900' : ''}`}
          onClick={() => setStatusFilterActive((prev) => !prev)}
        >
          Status
        </button>
        <button
          type="button"
          className={`admin-filter-pill ${roleSortActive ? 'active font-bold border-amber-500 bg-amber-50 text-amber-900' : ''}`}
          onClick={() => setRoleSortActive((prev) => !prev)}
        >
          Role
        </button>
        <button
          type="button"
          className={`admin-filter-pill ${dateSortActive ? 'active font-bold border-amber-500 bg-amber-50 text-amber-900' : ''}`}
          onClick={() => setDateSortActive((prev) => !prev)}
        >
          Member Since
        </button>

        <div className="admin-pill-search">
          <Search size={14} className="text-stone-400" />
          <input
            type="text"
            maxLength={100}
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        {loading ? (
          <div className="p-8 text-center text-stone-500 text-sm">
            Loading users from database...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-stone-500 text-sm">
            No users matched your search criteria.
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Member Since</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isOnline = u.is_active;
                return (
                  <tr key={u.id}>
                    <td className="font-mono text-xs">
                      USR-{String(u.id).padStart(3, '0')}
                    </td>
                    <td className="font-semibold">{u.full_name || u.name || 'User'}</td>
                    <td>{u.email}</td>
                    <td>
                      {u.created_at
                        ? new Date(u.created_at).toLocaleDateString('en-US', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="font-bold">{u.role}</td>
                    <td>
                      <span
                        className={
                          isOnline ? 'admin-badge-active' : 'admin-badge-inactive'
                        }
                      >
                        {isOnline ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="relative">
                      <button
                        type="button"
                        aria-label="User actions"
                        className="text-stone-500 hover:text-black p-1"
                        onClick={() =>
                          setActiveMenuId(activeMenuId === u.id ? null : u.id)
                        }
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeMenuId === u.id && (
                        <>
                          <button
                            type="button"
                            aria-label="Close menu"
                            tabIndex={-1}
                            className="fixed inset-0 z-10 cursor-default bg-transparent border-0"
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div className="absolute right-0 top-8 bg-white border border-stone-200 shadow-lg rounded-lg py-1 z-20 w-36 text-left">
                            <button
                              type="button"
                              disabled={Number(currentUser?.id) === Number(u.id)}
                              title={
                                Number(currentUser?.id) === Number(u.id)
                                  ? 'You cannot modify your own account status'
                                  : isOnline
                                    ? 'Deactivate user account'
                                    : 'Activate user account'
                              }
                              className={`w-full px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                                Number(currentUser?.id) === Number(u.id)
                                  ? 'text-stone-300 cursor-not-allowed'
                                  : 'text-stone-700 hover:bg-stone-50 cursor-pointer'
                              }`}
                              onClick={() => {
                                if (Number(currentUser?.id) === Number(u.id)) return;
                                setActiveMenuId(null);
                                if (isOnline) {
                                  setDeactivateError(null);
                                  setUserToDeactivate(u);
                                } else {
                                  handleToggleStatus(u);
                                }
                              }}
                            >
                              {isOnline ? (
                                <XCircle size={14} className="text-amber-600" />
                              ) : (
                                <CheckCircle size={14} className="text-emerald-600" />
                              )}
                              {isOnline ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Deactivate User Confirmation Modal */}
      {userToDeactivate && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div
            className="admin-modal-box"
            style={{ width: '460px', maxWidth: '92vw', boxSizing: 'border-box' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-600">
                <XCircle size={20} />
              </div>
              <div>
                <h3 className="admin-modal-title mb-0 text-stone-900">
                  Deactivate User Account
                </h3>
                <p className="text-xs text-stone-500">
                  Account status will be set to inactive and login will be disabled.
                </p>
              </div>
            </div>

            {deactivateError && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#991B1B',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={14} className="shrink-0" />
                <span>{deactivateError}</span>
              </div>
            )}

            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 my-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-500">User:</span>
                <span className="font-semibold text-stone-800">
                  {userToDeactivate.full_name || userToDeactivate.name || 'User'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Email:</span>
                <span className="font-mono text-stone-700">{userToDeactivate.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Role:</span>
                <span className="font-bold text-stone-700 uppercase">
                  {userToDeactivate.role}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed mb-4">
              Are you sure you want to deactivate this account? Permanent account deletion
              is restricted to Master Records Override.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #f3f4f6',
              }}
            >
              <button
                type="button"
                className="btn-admin-cancel-pill"
                disabled={isDeactivating}
                onClick={() => {
                  setUserToDeactivate(null);
                  setDeactivateError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-full text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                disabled={isDeactivating}
                onClick={async () => {
                  setIsDeactivating(true);
                  try {
                    await adminApi.toggleUserStatus(userToDeactivate.id, false);
                    setUsers((prev) =>
                      prev.map((u) =>
                        u.id === userToDeactivate.id ? { ...u, is_active: false } : u,
                      ),
                    );
                    setUserToDeactivate(null);
                  } catch (err) {
                    console.error('Failed to deactivate user:', err);
                    setDeactivateError('Failed to deactivate user account.');
                  } finally {
                    setIsDeactivating(false);
                  }
                }}
              >
                {isDeactivating ? 'Deactivating...' : 'Deactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Tab 3: Trip records are view-only; booking status uses the secure staff/admin workflow.
function TripsBookingsTab() {
  type BookingRecord = Booking & {
    trip_title?: string;
    destination_name?: string;
    property_name?: string;
  };

  const [trips, setTrips] = useState<Trip[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [tripSearch, setTripSearch] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [bookingStatus, setBookingStatus] = useState<
    'all' | 'pending' | 'confirmed' | 'cancelled'
  >('all');
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [statusError, setStatusError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      tripsApi.getTrips(),
      adminApi.getUsers(),
      destinationsApi.getAll(),
      bookingsApi.getAll(),
    ])
      .then(([tripRecords, userRecords, destinationRecords, bookingRecords]) => {
        if (!isCurrent) return;
        setTrips(tripRecords);
        setUsers(userRecords);
        setDestinations(destinationRecords);
        setBookings((bookingRecords as BookingRecord[]).filter(isAccommodationBooking));
        setSelectedTripId((current) => current ?? tripRecords[0]?.id ?? null);
      })
      .catch(() => {
        if (isCurrent) setLoadError('Unable to load trip and booking records.');
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const usersById = useMemo(
    () => new Map(users.map((item) => [String(item.id), item])),
    [users],
  );
  const tripsById = useMemo(
    () => new Map(trips.map((item) => [String(item.id), item])),
    [trips],
  );
  const destinationsById = useMemo(
    () => new Map(destinations.map((item) => [String(item.id), item])),
    [destinations],
  );
  const destinationsByTrip = useMemo(() => {
    const grouped = new Map<string, Destination[]>();
    destinations.forEach((destination) => {
      if (destination.trip_id == null) return;
      const key = String(destination.trip_id);
      grouped.set(key, [...(grouped.get(key) || []), destination]);
    });
    return grouped;
  }, [destinations]);

  const getOwner = (trip: Trip) => {
    const owner = trip.userId == null ? undefined : usersById.get(String(trip.userId));
    return owner?.full_name || owner?.name || owner?.email || 'Unknown owner';
  };
  const formatTripId = (id: Trip['id']) => `TRP-${String(id).padStart(3, '0')}`;
  const getTripDestinations = (trip: Trip) =>
    destinationsByTrip.get(String(trip.id)) || [];
  const filteredTrips = useMemo(() => {
    const query = tripSearch.trim().toLocaleLowerCase();
    if (!query) return trips;
    return trips.filter((trip) => {
      const owner = getOwner(trip);
      const tripId = `${trip.id} ${formatTripId(trip.id)}`;
      const places = getTripDestinations(trip)
        .map((destination) => `${destination.location_name} ${destination.country || ''}`)
        .join(' ');
      return `${tripId} ${trip.name} ${owner} ${places}`
        .toLocaleLowerCase()
        .includes(query);
    });
  }, [tripSearch, trips, usersById, destinationsByTrip]);
  const selectedTrip =
    trips.find((trip) => trip.id === selectedTripId) ||
    filteredTrips[0] ||
    trips[0] ||
    null;

  const filteredBookings = useMemo(
    () =>
      bookings.filter((booking) =>
        bookingStatus === 'all'
          ? true
          : String(booking.status || '').toLocaleLowerCase() === bookingStatus,
      ),
    [bookingStatus, bookings],
  );

  const updateBookingStatus = async (
    booking: BookingRecord,
    nextStatus: BookingStatus,
  ) => {
    if (String(booking.status).toLowerCase() !== 'pending') return;
    if (nextStatus !== 'confirmed' && nextStatus !== 'cancelled') return;
    setStatusUpdatingId(booking.id);
    setStatusError('');
    try {
      const updated = await bookingsApi.updateStatus(booking.id, nextStatus);
      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id
            ? { ...item, status: updated.status || nextStatus }
            : item,
        ),
      );
    } catch {
      setStatusError(`Could not update booking #${booking.id}. Refresh and try again.`);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const dateLabel = (value?: string) => {
    if (!value) return '—';
    const date = value.slice(0, 10);
    const [year, month, day] = date.split('-');
    return year && month && day ? `${month}/${day}/${year}` : value;
  };
  const tripDates = (trip: Trip) =>
    trip.startDate && trip.endDate
      ? `${dateLabel(trip.startDate)} – ${dateLabel(trip.endDate)}`
      : 'Dates not set';
  return (
    <div className="admin-split-view">
      <section className="admin-card-panel min-w-0 flex-[1.15]">
        <img src={lakbyeLogo} alt="" className="admin-watermark" />
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">Trip Records</h2>
          <span className="text-xs text-stone-500">{filteredTrips.length} trips</span>
        </div>
        <div className="admin-header-rule" />
        <label className="admin-pill-search !w-full max-w-none" aria-label="Search trips">
          <Search size={14} className="shrink-0 text-stone-400" />
          <input
            type="search"
            maxLength={100}
            placeholder="Search Trip ID, trip, owner, or destination..."
            value={tripSearch}
            onChange={(event) => setTripSearch(event.target.value)}
          />
        </label>

        {selectedTrip && (
          <div className="mb-3 rounded-lg border border-amber-100 bg-[#FCF9F6] px-3 py-2 text-[11px] text-stone-700">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <strong className="text-[#2F1B0C]">{selectedTrip.name}</strong>
              <span>{tripDates(selectedTrip)}</span>
            </div>
            <p className="mt-1">
              Trip ID: <span className="font-mono">{formatTripId(selectedTrip.id)}</span>{' '}
              · Owner: {getOwner(selectedTrip)} · {selectedTrip.status}
              {selectedTrip.totalBudget > 0
                ? ` · Budget ₱${selectedTrip.totalBudget.toLocaleString('en-PH')}`
                : ''}
            </p>
            <p className="mt-1 break-words">
              Destinations:{' '}
              {getTripDestinations(selectedTrip)
                .map(
                  (destination) =>
                    `${destination.location_name}${destination.country ? `, ${destination.country}` : ''}`,
                )
                .join(' · ') || 'None recorded'}
            </p>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-xs text-stone-500">
              Loading trip records…
            </div>
          ) : loadError ? (
            <div className="p-4 text-center text-xs text-rose-700">{loadError}</div>
          ) : filteredTrips.length === 0 ? (
            <div className="p-4 text-center text-xs text-stone-500">No trips found.</div>
          ) : (
            <table className="admin-table min-w-[700px]">
              <thead>
                <tr>
                  <th>Trip ID</th>
                  <th>Trip</th>
                  <th>Owner</th>
                  <th>Dates</th>
                  <th>Destinations</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.map((trip) => {
                  const places = getTripDestinations(trip);
                  const isSelected = trip.id === selectedTrip?.id;
                  return (
                    <tr
                      key={trip.id}
                      tabIndex={0}
                      role="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedTripId(trip.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedTripId(trip.id);
                        }
                      }}
                      className={`cursor-pointer hover:bg-amber-50/70 ${isSelected ? 'bg-amber-50/50' : ''}`}
                    >
                      <td className="whitespace-nowrap font-mono text-[10px]">
                        {formatTripId(trip.id)}
                      </td>
                      <td className="font-semibold">{trip.name}</td>
                      <td>{getOwner(trip)}</td>
                      <td>{tripDates(trip)}</td>
                      <td title={places.map((place) => place.location_name).join(', ')}>
                        {places.length}
                      </td>
                      <td className="capitalize">{trip.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="admin-card-panel min-w-0 flex-[1.6]">
        <img src={lakbyeLogo} alt="" className="admin-watermark" />
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">Booking Records</h2>
          <span className="text-xs text-stone-500">
            {filteredBookings.length} bookings
          </span>
        </div>
        <div className="admin-header-rule" />
        <div
          className="admin-booking-status-filters"
          aria-label="Filter bookings by status"
        >
          {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={bookingStatus === status}
              onClick={() => setBookingStatus(status)}
              className={`admin-booking-status-filter ${bookingStatus === status ? 'active' : ''}`}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>
        {statusError && (
          <p role="alert" className="mb-3 text-xs text-rose-700">
            {statusError}
          </p>
        )}
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-xs text-stone-500">
              Loading booking records…
            </div>
          ) : loadError ? (
            <div className="p-4 text-center text-xs text-rose-700">{loadError}</div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-4 text-center text-xs text-stone-500">
              No accommodation bookings found.
            </div>
          ) : (
            <table className="admin-table min-w-[900px]">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Trip</th>
                  <th>Destination</th>
                  <th>Accommodation</th>
                  <th>Booking Date</th>
                  <th>Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => {
                  const destination =
                    booking.destination_id == null
                      ? undefined
                      : destinationsById.get(String(booking.destination_id));
                  const trip =
                    booking.trip_id == null
                      ? undefined
                      : tripsById.get(String(booking.trip_id));
                  const customer =
                    booking.user_id == null
                      ? undefined
                      : usersById.get(String(booking.user_id));
                  const status = String(booking.status || 'pending').toLocaleLowerCase();
                  const statusClass =
                    status === 'confirmed'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : status === 'cancelled'
                        ? 'border-rose-200 bg-rose-50 text-rose-800'
                        : status === 'pending'
                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                          : 'border-stone-200 bg-stone-100 text-stone-700';
                  return (
                    <tr key={booking.id}>
                      <td className="font-semibold">
                        {booking.customer_name ||
                          customer?.full_name ||
                          customer?.name ||
                          customer?.email ||
                          'Unknown customer'}
                      </td>
                      <td>{trip?.name || booking.trip_title || '—'}</td>
                      <td>
                        {destination?.location_name || booking.destination_name || '—'}
                      </td>
                      <td
                        title={
                          booking.accommodation_name ||
                          destination?.accommodation ||
                          booking.property_name ||
                          ''
                        }
                      >
                        {booking.accommodation_name ||
                          destination?.accommodation ||
                          booking.property_name ||
                          '—'}
                      </td>
                      <td>{dateLabel(booking.booking_date || booking.created_at)}</td>
                      <td>{formatBookingCost(booking)}</td>
                      <td>
                        {status === 'pending' ? (
                          <select
                            aria-label={`Update booking ${booking.id} status`}
                            value="pending"
                            disabled={statusUpdatingId === booking.id}
                            onChange={(event) => {
                              const next = event.target.value as BookingStatus;
                              if (next === 'confirmed' || next === 'cancelled') {
                                void updateBookingStatus(booking, next);
                              }
                            }}
                            className={`max-w-[116px] rounded-full border px-2 py-1 text-[10px] font-semibold capitalize outline-none ${statusClass} disabled:opacity-60`}
                          >
                            <option value="pending" disabled>
                              {statusUpdatingId === booking.id ? 'Updating…' : 'Pending'}
                            </option>
                            <option value="confirmed">Confirm</option>
                            <option value="cancelled">Cancel</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-semibold capitalize ${statusClass}`}
                          >
                            {status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

// Tab 4: Master Records Override
function MasterRecordsTab() {
  const [tripSearch, setTripSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);

  const [foundTrip, setFoundTrip] = useState<Trip | null>(null);
  const [foundUser, setFoundUser] = useState<AdminUser | null>(null);

  const [showTripSuggestions, setShowTripSuggestions] = useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);

  const [deleteReason, setDeleteReason] = useState('');
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);
  const [isExecutingTripDelete, setIsExecutingTripDelete] = useState(false);
  const [tripDeleteError, setTripDeleteError] = useState('');
  const [deletedTripSuccess, setDeletedTripSuccess] = useState<Trip | null>(null);

  const [userDeleteReason, setUserDeleteReason] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isExecutingUserDelete, setIsExecutingUserDelete] = useState(false);
  const [deletedUserSuccess, setDeletedUserSuccess] = useState<AdminUser | null>(null);

  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const refreshAuditLogs = async () => {
    try {
      const logs = await adminApi.getAuditLogs();
      setAuditLogs(logs || []);
    } catch (err) {
      console.error('Failed to refresh system audit logs:', err);
    }
  };

  const loadAllRecords = async () => {
    try {
      const [trips, users, logs] = await Promise.all([
        tripsApi.getTrips().catch(() => [] as Trip[]),
        adminApi.getUsers().catch(() => [] as AdminUser[]),
        adminApi.getAuditLogs().catch(() => [] as SystemAuditLog[]),
      ]);
      setAllTrips(trips || []);
      setAllUsers(users || []);
      setAuditLogs(logs || []);
    } catch (err) {
      console.error('Failed to load master records:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadAllRecords();
  }, []);

  const filteredTrips = useMemo(() => {
    const q = tripSearch.trim().toLowerCase();
    if (!q) return [];
    return allTrips
      .filter((t) => {
        const idMatch =
          String(t.id).includes(q) || `trp-${String(t.id).padStart(3, '0')}`.includes(q);
        const nameMatch = (t.name || '').toLowerCase().includes(q);
        const destMatch = (t.destination || '').toLowerCase().includes(q);
        return idMatch || nameMatch || destMatch;
      })
      .slice(0, 6);
  }, [tripSearch, allTrips]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return [];
    return allUsers
      .filter((u) => {
        const idMatch =
          String(u.id).includes(q) || `usr-${String(u.id).padStart(3, '0')}`.includes(q);
        const nameMatch = (u.full_name || u.name || '').toLowerCase().includes(q);
        const emailMatch = (u.email || '').toLowerCase().includes(q);
        return idMatch || nameMatch || emailMatch;
      })
      .slice(0, 6);
  }, [userSearch, allUsers]);

  const handleSelectTrip = (trip: Trip) => {
    setFoundTrip(trip);
    setTripSearch(trip.name || `TRP-${String(trip.id).padStart(3, '0')}`);
    setShowTripSuggestions(false);
  };

  const handleSelectUser = (u: AdminUser) => {
    setFoundUser(u);
    setUserSearch(u.full_name || u.name || u.email);
    setShowUserSuggestions(false);
  };

  const handleForceDeleteTrip = async () => {
    if (!foundTrip || !deleteReason.trim()) return;
    const deletedTrip = foundTrip;
    setTripDeleteError('');
    setIsExecutingTripDelete(true);
    try {
      await adminApi.overrideDeleteTrip(Number(deletedTrip.id), deleteReason);
      setFoundTrip(null);
      setIsDeletingTrip(false);
      setDeleteReason('');
      setTripSearch('');
      await loadAllRecords();
      setDeletedTripSuccess(deletedTrip);
    } catch (err) {
      console.error('Failed to override delete trip:', err);
      const responseMessage = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setTripDeleteError(responseMessage || 'Failed to delete trip.');
    } finally {
      setIsExecutingTripDelete(false);
    }
  };

  const handleForceDeleteUser = async () => {
    if (!foundUser) return;
    const deletedUser = foundUser;
    setIsExecutingUserDelete(true);
    try {
      await adminApi.deleteUser(deletedUser.id, userDeleteReason);
      setFoundUser(null);
      setIsDeletingUser(false);
      setUserDeleteReason('');
      setUserSearch('');
      await loadAllRecords();
      setDeletedUserSuccess(deletedUser);
    } catch (err) {
      console.error('Failed to force delete user:', err);
      const responseMessage = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      alert(responseMessage || 'Failed to delete user account.');
    } finally {
      setIsExecutingUserDelete(false);
    }
  };

  return (
    <div className="master-records-wrapper">
      <div className="admin-panel-header mb-0">
        <h1 className="admin-panel-title">Master Records Override</h1>
      </div>

      <div className="master-forms-grid">
        {/* Trip Override Card */}
        <div className="admin-card-panel relative">
          <h2 className="text-sm font-bold mb-3">Trip Records Override</h2>
          <div className="relative mb-4">
            <div className="admin-pill-search w-full">
              <Search size={14} className="text-stone-400" />
              <input
                type="text"
                maxLength={100}
                placeholder="Search trip by Name, Destination, or ID..."
                value={tripSearch}
                onChange={(e) => {
                  setTripSearch(e.target.value);
                  setShowTripSuggestions(true);
                }}
                onFocus={() => setShowTripSuggestions(true)}
              />
            </div>
            {showTripSuggestions && filteredTrips.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto py-1">
                {filteredTrips.map((t) => (
                  <li
                    key={t.id}
                    className="px-3 py-2 text-xs hover:bg-stone-100 cursor-pointer flex items-center justify-between border-b border-stone-50 last:border-0"
                    onMouseDown={() => handleSelectTrip(t)}
                  >
                    <div>
                      <span className="font-bold text-stone-900">{t.name}</span>
                      <span className="text-[10px] text-stone-500 ml-2">
                        {t.destination || 'Destination'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-stone-400">
                      TRP-{String(t.id).padStart(3, '0')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="master-field-row">
            <span className="master-field-label">Trip ID:</span>
            <input
              type="text"
              className="master-field-input"
              readOnly
              value={
                foundTrip
                  ? `TRP-${String(foundTrip.id).padStart(3, '0')}`
                  : 'Select a trip from search'
              }
            />
          </div>
          <div className="master-field-row">
            <span className="master-field-label">Trip Name:</span>
            <input
              type="text"
              className="master-field-input"
              readOnly
              value={foundTrip ? foundTrip.name : '—'}
            />
          </div>
          <div className="master-field-row">
            <span className="master-field-label">Destination:</span>
            <input
              type="text"
              className="master-field-input"
              readOnly
              value={foundTrip ? foundTrip.destination || 'Unassigned' : '—'}
            />
          </div>
          <div className="master-field-row">
            <span className="master-field-label">Status:</span>
            <input
              type="text"
              className="master-field-input"
              readOnly
              value={foundTrip ? foundTrip.status || 'Active' : '—'}
            />
          </div>

          <div className="flex justify-end mt-2">
            <button
              type="button"
              disabled={!foundTrip}
              className="btn-master-danger disabled:opacity-50 cursor-pointer"
              onClick={() => {
                setTripDeleteError('');
                setIsDeletingTrip(true);
              }}
            >
              Master Force Delete Trip
            </button>
          </div>
        </div>

        {/* User Override Card - Force Deletion */}
        <div className="admin-card-panel relative">
          <h2 className="text-sm font-bold mb-3">Force Deletion of Account</h2>
          <div className="relative mb-4">
            <div className="admin-pill-search w-full">
              <Search size={14} className="text-stone-400" />
              <input
                type="text"
                maxLength={100}
                placeholder="Search user by Name, Email, or ID..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setShowUserSuggestions(true);
                }}
                onFocus={() => setShowUserSuggestions(true)}
              />
            </div>
            {showUserSuggestions && filteredUsers.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto py-1">
                {filteredUsers.map((u) => (
                  <li
                    key={u.id}
                    className="px-3 py-2 text-xs hover:bg-stone-100 cursor-pointer flex items-center justify-between border-b border-stone-50 last:border-0"
                    onMouseDown={() => handleSelectUser(u)}
                  >
                    <div>
                      <span className="font-bold text-stone-900">
                        {u.full_name || u.name || 'User'}
                      </span>
                      <span className="text-[10px] text-stone-500 ml-2">{u.email}</span>
                    </div>
                    <span className="text-[10px] font-mono text-stone-400">
                      USR-{String(u.id).padStart(3, '0')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="master-field-row">
            <span className="master-field-label">User ID:</span>
            <input
              type="text"
              className="master-field-input"
              readOnly
              value={
                foundUser
                  ? `USR-${String(foundUser.id).padStart(3, '0')}`
                  : 'Select a user from search'
              }
            />
          </div>
          <div className="master-field-row">
            <span className="master-field-label">Full Name:</span>
            <input
              type="text"
              className="master-field-input"
              readOnly
              value={foundUser ? foundUser.full_name || foundUser.name || 'User' : '—'}
            />
          </div>
          <div className="master-field-row">
            <span className="master-field-label">Email:</span>
            <input
              type="text"
              className="master-field-input"
              readOnly
              value={foundUser ? foundUser.email : '—'}
            />
          </div>
          <div className="master-field-row">
            <span className="master-field-label">Role:</span>
            <input
              type="text"
              className="master-field-input"
              readOnly
              value={foundUser ? foundUser.role : '—'}
            />
          </div>
          <div className="master-field-row">
            <span className="master-field-label">Status:</span>
            <input
              type="text"
              className="master-field-input font-bold"
              readOnly
              value={foundUser ? (foundUser.is_active ? 'ACTIVE' : 'INACTIVE') : '—'}
            />
          </div>

          <div className="flex justify-end mt-2">
            <button
              type="button"
              disabled={!foundUser}
              className="btn-master-danger disabled:opacity-50 cursor-pointer"
              onClick={() => setIsDeletingUser(true)}
            >
              Force Deletion of Account
            </button>
          </div>
        </div>
      </div>

      {/* System Audit Logs Section */}
      <div className="admin-card-panel flex-1 min-h-55">
        <div className="admin-panel-header">
          <h2 className="text-sm font-bold">Immutable System Audit Trail</h2>
          <button
            type="button"
            className="px-3 py-1 text-xs text-stone-600 hover:text-stone-900 border border-stone-200 rounded-full font-semibold cursor-pointer"
            onClick={refreshAuditLogs}
          >
            Refresh Logs
          </button>
        </div>

        <div className="overflow-x-auto flex-1">
          {loadingLogs ? (
            <div className="p-4 text-center text-xs text-stone-500">
              Loading audit trail...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-4 text-center text-xs text-stone-500">
              No administrative overrides recorded.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Admin User</th>
                  <th>Action</th>
                  <th>Record ID</th>
                  <th>Reason / Notes</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      {new Date(log.created_at).toLocaleString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>{log.user_name || 'System Administrator'}</td>
                    <td className="font-semibold">
                      {log.action_type === 'FORCE_DELETE_USER'
                        ? 'Force Delete User'
                        : log.action_type}
                    </td>
                    <td className="font-bold">{log.record_id}</td>
                    <td>
                      {log.action_type === 'FORCE_DELETE_USER' &&
                      !/\. Reason: /.test(log.description || '')
                        ? `${log.description || 'Force Delete User'} · Reason not recorded`
                        : log.description || 'Administrative action'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Force Delete Trip Confirmation Modal */}
      {isDeletingTrip && foundTrip && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-box">
            <div className="flex items-center gap-2 text-red-600 mb-3 font-bold text-base">
              <AlertTriangle size={18} />
              <span>Confirm Force Deletion of Trip</span>
            </div>
            <p className="text-xs text-stone-600 mb-4">
              Are you sure you want to permanently delete trip{' '}
              <strong>{foundTrip.name}</strong>? This action will be logged in the
              immutable system audit table and cannot be undone.
            </p>
            <label
              htmlFor="del-reason"
              className="block text-xs font-semibold mb-1 text-stone-700"
            >
              Reason for Deletion *
            </label>
            <textarea
              id="del-reason"
              required
              rows={3}
              placeholder="e.g. Terms of service violation, fraudulent booking..."
              value={deleteReason}
              onChange={(e) => {
                setDeleteReason(e.target.value);
                setTripDeleteError('');
              }}
              maxLength={100}
              className="admin-modal-input-field"
            />
            {tripDeleteError && (
              <p className="mt-2 text-xs font-medium text-red-700" role="alert">
                {tripDeleteError}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="px-4 py-1.5 text-xs text-stone-600 font-semibold cursor-pointer"
                disabled={isExecutingTripDelete}
                onClick={() => {
                  setIsDeletingTrip(false);
                  setDeleteReason('');
                  setTripDeleteError('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deleteReason.trim() || isExecutingTripDelete}
                className="btn-master-danger mt-0! disabled:opacity-50 cursor-pointer"
                onClick={handleForceDeleteTrip}
              >
                {isExecutingTripDelete ? 'Deleting...' : 'Confirm Force Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletedTripSuccess && (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="force-delete-trip-success-title"
        >
          <div className="admin-modal-box">
            <div
              className="mb-3 text-base font-bold text-green-700"
              id="force-delete-trip-success-title"
            >
              Trip deleted successfully.
            </div>
            <p className="text-xs text-stone-600">
              Trip '{deletedTripSuccess.name}' was permanently deleted and recorded in the
              audit trail.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded-full border border-stone-200 px-4 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                onClick={() => setDeletedTripSuccess(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force Delete User Confirmation Modal */}
      {isDeletingUser && foundUser && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-box">
            <div className="flex items-center gap-2 text-red-600 mb-3 font-bold text-base">
              <AlertTriangle size={18} />
              <span>Confirm Force Deletion of Account</span>
            </div>
            <p className="text-xs text-stone-600 mb-4">
              Are you sure you want to permanently delete the account for{' '}
              <strong>
                {foundUser.full_name || foundUser.name || 'User'} ({foundUser.email})
              </strong>
              ? This action is irreversible and will permanently delete the user and their
              associated records from the database.
            </p>
            <label
              htmlFor="user-del-reason"
              className="block text-xs font-semibold mb-1 text-stone-700"
            >
              Reason for Deletion (Required; logged in Audit Trail) *
            </label>
            <textarea
              id="user-del-reason"
              rows={3}
              placeholder="e.g. Requested permanent GDPR deletion, severe policy violation..."
              value={userDeleteReason}
              onChange={(e) => setUserDeleteReason(e.target.value)}
              maxLength={100}
              className="admin-modal-input-field"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="px-4 py-1.5 text-xs text-stone-600 font-semibold cursor-pointer"
                disabled={isExecutingUserDelete}
                onClick={() => {
                  setIsDeletingUser(false);
                  setUserDeleteReason('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExecutingUserDelete || !userDeleteReason.trim()}
                className="btn-master-danger mt-0! disabled:opacity-50 cursor-pointer"
                onClick={handleForceDeleteUser}
              >
                {isExecutingUserDelete ? 'Deleting...' : 'Confirm Permanent Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletedUserSuccess && (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="force-delete-success-title"
        >
          <div className="admin-modal-box">
            <div
              className="mb-3 text-base font-bold text-green-700"
              id="force-delete-success-title"
            >
              Account deleted successfully.
            </div>
            <p className="text-xs text-stone-600">
              {deletedUserSuccess.full_name || deletedUserSuccess.name || 'Account'}
              {deletedUserSuccess.email ? ` (${deletedUserSuccess.email})` : ''}
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded-full border border-stone-200 px-4 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                onClick={() => setDeletedUserSuccess(null)}
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
