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
  Edit,
  Download,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import lakbyeLogo from '../../assets/lakbye-logo.png';
import { adminApi } from '../../services/api';
import type {
  AdminUser,
  AdminCategory,
  AdminActivity,
  SystemAuditLog,
  AdminSystemReportData,
} from '../../services/api';
import type { Trip } from '../../types/trip';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { STORAGE_KEYS } from '../../lib/constants';
import '../../styles/Admin.css';

type Tab = 'systems' | 'users' | 'categories' | 'master';

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab: Tab =
    rawTab && ['systems', 'users', 'categories', 'master'].includes(rawTab)
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
            <List size={16} /> Categories & Activities
          </button>
          <button
            type="button"
            className={`admin-nav-item ${activeTab === 'master' ? 'active' : ''}`}
            onClick={() => setActiveTab('master')}
          >
            <Database size={16} /> Master Records
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
        {activeTab === 'categories' && <CategoriesActivitiesTab />}
        {activeTab === 'master' && <MasterRecordsTab />}
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
  const [sortField, setSortField] = useState<'name' | 'status' | 'role' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  // Deletion state
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await adminApi.deleteUser(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (err: unknown) {
      console.error('Failed to delete user:', err);
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Failed to delete user account. Please try again.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        const displayName = u.full_name || u.name || '';
        return (
          displayName.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
        );
      })
      .sort((a, b) => {
        const nameA = a.full_name || a.name || '';
        const nameB = b.full_name || b.name || '';
        if (sortField === 'name') {
          return sortOrder === 'asc'
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
        }
        if (sortField === 'status') {
          return a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1;
        }
        if (sortField === 'role') {
          return a.role.localeCompare(b.role);
        }
        if (sortField === 'date') {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeB - timeA;
        }
        return 0;
      });
  }, [users, search, sortField, sortOrder]);

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
          className={`admin-filter-pill ${sortField === 'name' && sortOrder === 'asc' ? 'font-bold' : ''}`}
          onClick={() => {
            setSortField('name');
            setSortOrder('asc');
          }}
        >
          A to Z
        </button>
        <button
          type="button"
          className={`admin-filter-pill ${sortField === 'name' && sortOrder === 'desc' ? 'font-bold' : ''}`}
          onClick={() => {
            setSortField('name');
            setSortOrder('desc');
          }}
        >
          Z to A
        </button>
        <button
          type="button"
          className={`admin-filter-pill ${sortField === 'status' ? 'font-bold' : ''}`}
          onClick={() => setSortField('status')}
        >
          Status
        </button>
        <button
          type="button"
          className={`admin-filter-pill ${sortField === 'role' ? 'font-bold' : ''}`}
          onClick={() => setSortField('role')}
        >
          Role
        </button>
        <button
          type="button"
          className={`admin-filter-pill ${sortField === 'date' ? 'font-bold' : ''}`}
          onClick={() => setSortField('date')}
        >
          Member Since
        </button>

        <div className="admin-pill-search">
          <Search size={14} className="text-stone-400" />
          <input
            type="text"
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
                              className="w-full px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              onClick={() => handleToggleStatus(u)}
                            >
                              {isOnline ? (
                                <XCircle size={14} className="text-red-600" />
                              ) : (
                                <CheckCircle size={14} className="text-green-600" />
                              )}
                              {isOnline ? 'Deactivate' : 'Activate'}
                            </button>
                            <div className="my-1 border-t border-stone-100" />
                            <button
                              type="button"
                              disabled={Number(currentUser?.id) === Number(u.id)}
                              title={
                                Number(currentUser?.id) === Number(u.id)
                                  ? 'You cannot delete your own account'
                                  : 'Delete user account'
                              }
                              className={`w-full px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                                Number(currentUser?.id) === Number(u.id)
                                  ? 'text-stone-300 cursor-not-allowed'
                                  : 'text-red-600 hover:bg-red-50'
                              }`}
                              onClick={() => {
                                if (Number(currentUser?.id) === Number(u.id)) return;
                                setActiveMenuId(null);
                                setDeleteError(null);
                                setUserToDelete(u);
                              }}
                            >
                              <Trash2
                                size={14}
                                className={
                                  Number(currentUser?.id) === Number(u.id)
                                    ? 'text-stone-300'
                                    : 'text-red-600'
                                }
                              />
                              Delete Account
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

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div
            className="admin-modal-box"
            style={{ width: '460px', maxWidth: '92vw', boxSizing: 'border-box' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="admin-modal-title mb-0 text-red-700">
                  Delete User Account
                </h3>
                <p className="text-xs text-stone-500">This action cannot be undone.</p>
              </div>
            </div>

            {deleteError && (
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
                <span>{deleteError}</span>
              </div>
            )}

            <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 my-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-500">User:</span>
                <span className="font-semibold text-stone-800">
                  {userToDelete.full_name || userToDelete.name || 'User'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Email:</span>
                <span className="font-mono text-stone-700">{userToDelete.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Role:</span>
                <span className="font-bold text-stone-700 uppercase">
                  {userToDelete.role}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed mb-4">
              Are you sure you want to permanently delete this user account? All
              associated data including trips, activities, and bookings will be
              permanently removed.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '24px',
                paddingTop: '16px',
                borderTop: '1px solid #f3f4f6',
              }}
            >
              <button
                type="button"
                className="btn-admin-cancel-pill"
                disabled={isDeleting}
                onClick={() => {
                  setUserToDelete(null);
                  setDeleteError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-admin-danger-pill"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting Account...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Tab 3: Categories & Activities
function CategoriesActivitiesTab() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [catSearch, setCatSearch] = useState('');
  const [actSearch, setActSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCatModalOpen, setCatModalOpen] = useState(false);
  const [isActModalOpen, setActModalOpen] = useState(false);

  // Forms
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState('');
  const [isSavingCat, setIsSavingCat] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  const [activityName, setActivityName] = useState('');
  const [activityDest, setActivityDest] = useState('');
  const [activityCatId, setActivityCatId] = useState<number | ''>('');
  const [activityCost, setActivityCost] = useState('');

  const refreshData = async () => {
    try {
      const [cats, acts] = await Promise.all([
        adminApi.getCategories(),
        adminApi.getActivities(),
      ]);
      setCategories(cats || []);
      setActivities(acts || []);
    } catch (err) {
      console.error('Failed to load database records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        const [cats, acts] = await Promise.all([
          adminApi.getCategories(),
          adminApi.getActivities(),
        ]);
        if (isMounted) {
          setCategories(cats || []);
          setActivities(acts || []);
        }
      } catch (err) {
        console.error('Failed to load database records:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setIsSavingCat(true);
    setCatError(null);

    try {
      if (editingCategory) {
        const catId = editingCategory.id ?? editingCategory.categoryid ?? 0;
        await adminApi.updateCategory(catId, {
          name: categoryName.trim(),
          type: categoryType.trim() || 'General',
        });
      } else {
        await adminApi.createCategory({
          name: categoryName.trim(),
          type: categoryType.trim() || 'General',
        });
      }
      setCatModalOpen(false);
      setEditingCategory(null);
      setCategoryName('');
      setCategoryType('');
      await refreshData();
    } catch (err: unknown) {
      console.error('Failed to save category:', err);
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setCatError(err.response.data.message);
      } else if (err instanceof Error) {
        setCatError(err.message);
      } else {
        setCatError('Failed to save category. Please check permissions.');
      }
    } finally {
      setIsSavingCat(false);
    }
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityName.trim()) return;

    try {
      await adminApi.createActivity({
        title: activityName,
        category_id: activityCatId ? Number(activityCatId) : undefined,
        cost: Number(activityCost) || 0,
      });
      setActModalOpen(false);
      setActivityName('');
      setActivityDest('');
      setActivityCatId('');
      setActivityCost('');
      await refreshData();
    } catch (err) {
      console.error('Failed to create activity:', err);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(catSearch.toLowerCase()),
  );

  const filteredActivities = activities.filter((a) =>
    a.title.toLowerCase().includes(actSearch.toLowerCase()),
  );

  return (
    <div className="admin-split-view">
      {/* Categories Panel */}
      <div className="admin-card-panel flex-1">
        <img src={lakbyeLogo} alt="" className="admin-watermark" />
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">Categories Manager</h2>
          <button
            type="button"
            className="btn-admin-pill-gradient"
            onClick={() => setCatModalOpen(true)}
          >
            <Plus size={13} /> Add Category
          </button>
        </div>
        <div className="admin-header-rule" />

        <div className="admin-pill-search">
          <Search size={14} className="text-stone-400" />
          <input
            type="text"
            placeholder="Search..."
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="p-4 text-center text-xs text-stone-500">
              Loading categories...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-4 text-center text-xs text-stone-500">
              No categories found in database.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Category ID</th>
                  <th>Category Name</th>
                  <th>Type / Tag</th>
                  <th>Active Items</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((c) => {
                  const catId = c.id ?? c.categoryid ?? 0;
                  return (
                    <tr key={catId}>
                      <td>C{String(catId).padStart(3, '0')}</td>
                      <td className="font-semibold">{c.name}</td>
                      <td>{c.type}</td>
                      <td>{c.activity_count ?? 0}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label="Edit category"
                            title="Edit Category"
                            className="text-stone-500 hover:text-black cursor-pointer"
                            onClick={() => {
                              setEditingCategory(c);
                              setCategoryName(c.name);
                              setCategoryType(c.type || 'General');
                              setCatModalOpen(true);
                            }}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete category"
                            title="Delete Category"
                            className="text-stone-400 hover:text-red-600 cursor-pointer"
                            onClick={async () => {
                              if (window.confirm(`Delete category "${c.name}"?`)) {
                                try {
                                  await adminApi.deleteCategory(catId);
                                  await refreshData();
                                } catch (err) {
                                  console.error('Failed to delete category:', err);
                                  alert(
                                    'Cannot delete category with associated activities.',
                                  );
                                }
                              }
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* Activities Panel */}
      <div className="admin-card-panel flex-[1.4]">
        <img src={lakbyeLogo} alt="" className="admin-watermark" />
        <div className="admin-panel-header">
          <h2 className="admin-panel-title">Activities Manager</h2>
          <button
            type="button"
            className="btn-admin-pill-gradient"
            onClick={() => setActModalOpen(true)}
          >
            <Plus size={13} /> Create Activity
          </button>
        </div>
        <div className="admin-header-rule" />

        <div className="admin-pill-search">
          <Search size={14} className="text-stone-400" />
          <input
            type="text"
            placeholder="Search..."
            value={actSearch}
            onChange={(e) => setActSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="p-4 text-center text-xs text-stone-500">
              Loading activities...
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-4 text-center text-xs text-stone-500">
              No activities found in database.
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Activity Name</th>
                  <th>Destination</th>
                  <th>Category</th>
                  <th>Cost</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((a) => (
                  <tr key={a.id}>
                    <td className="font-semibold">{a.title}</td>
                    <td>{a.destination || 'Unassigned'}</td>
                    <td>{a.category || 'General'}</td>
                    <td className="font-bold">₱{Number(a.cost).toLocaleString()}</td>
                    <td>
                      <span className="admin-badge-active">ACTIVE</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        aria-label="Delete activity"
                        title="Delete Activity"
                        className="text-stone-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                        onClick={async () => {
                          if (
                            window.confirm(
                              `Are you sure you want to delete activity "${a.title}"?`,
                            )
                          ) {
                            try {
                              await adminApi.deleteActivity(a.id);
                              await refreshData();
                            } catch (err) {
                              console.error('Failed to delete activity:', err);
                              alert('Failed to delete activity.');
                            }
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Category Modal */}
      {isCatModalOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <form onSubmit={handleSaveCategory} className="admin-modal-box">
            <h3 className="admin-modal-title">Add New Category</h3>

            {catError && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#991B1B',
                  marginBottom: '12px',
                }}
              >
                {catError}
              </div>
            )}

            <div>
              <label
                htmlFor="cat-name-input"
                className="block text-xs font-semibold mb-1 text-stone-700"
              >
                Category Name
              </label>
              <input
                id="cat-name-input"
                type="text"
                required
                placeholder="e.g. Nature & Hiking"
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value);
                  if (catError) setCatError(null);
                }}
                className="admin-modal-input-field"
              />
            </div>
            <div>
              <label
                htmlFor="cat-type-input"
                className="block text-xs font-semibold mb-1 text-stone-700"
              >
                Category Tag / Slug
              </label>
              <input
                id="cat-type-input"
                type="text"
                placeholder="e.g. outdoor"
                value={categoryType}
                onChange={(e) => {
                  setCategoryType(e.target.value);
                  if (catError) setCatError(null);
                }}
                className="admin-modal-input-field"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="px-4 py-1.5 text-xs text-stone-600 font-semibold"
                onClick={() => {
                  setCatModalOpen(false);
                  setCatError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingCat || !categoryName.trim()}
                className="btn-admin-pill-gradient disabled:opacity-50"
              >
                {isSavingCat ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Activity Modal */}
      {isActModalOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <form
            onSubmit={handleSaveActivity}
            className="admin-modal-box"
            style={{ width: '480px' }}
          >
            <h3 className="admin-modal-title">Create Master Activity</h3>
            <div>
              <label
                htmlFor="act-title-input"
                className="block text-xs font-semibold mb-1 text-stone-700"
              >
                Activity Title
              </label>
              <input
                id="act-title-input"
                type="text"
                required
                placeholder="Activity Title"
                value={activityName}
                onChange={(e) => setActivityName(e.target.value)}
                className="admin-modal-input-field"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="act-dest-input"
                  className="block text-xs font-semibold mb-1 text-stone-700"
                >
                  Destination
                </label>
                <input
                  id="act-dest-input"
                  type="text"
                  placeholder="e.g. Boracay"
                  value={activityDest}
                  onChange={(e) => setActivityDest(e.target.value)}
                  className="admin-modal-input-field"
                />
              </div>
              <div>
                <label
                  htmlFor="act-cat-select"
                  className="block text-xs font-semibold mb-1 text-stone-700"
                >
                  Category
                </label>
                <select
                  id="act-cat-select"
                  value={activityCatId}
                  onChange={(e) =>
                    setActivityCatId(e.target.value ? Number(e.target.value) : '')
                  }
                  className="admin-modal-input-field text-stone-700"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="act-cost-input"
                className="block text-xs font-semibold mb-1 text-stone-700"
              >
                Estimated Cost (PHP)
              </label>
              <input
                id="act-cost-input"
                type="number"
                min="0"
                placeholder="0.00"
                value={activityCost}
                onChange={(e) => setActivityCost(e.target.value)}
                className="admin-modal-input-field"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="px-4 py-1.5 text-xs text-stone-600 font-semibold"
                onClick={() => setActModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-admin-pill-gradient">
                Save Activity
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// Tab 4: Master Records Override
function MasterRecordsTab() {
  const [tripSearch, setTripSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const [foundTrip, setFoundTrip] = useState<Trip | null>(null);
  const [foundUser, setFoundUser] = useState<AdminUser | null>(null);

  const [deleteReason, setDeleteReason] = useState('');
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);

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

  useEffect(() => {
    let isMounted = true;
    const fetchInitialLogs = async () => {
      try {
        const logs = await adminApi.getAuditLogs();
        if (isMounted) {
          setAuditLogs(logs || []);
        }
      } catch (err) {
        console.error('Failed to load system audit logs:', err);
      } finally {
        if (isMounted) {
          setLoadingLogs(false);
        }
      }
    };

    fetchInitialLogs();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripSearch.trim()) return;
    try {
      const usersList = await adminApi.getUsers();
      console.log('Searching trips via API context:', usersList.length);
    } catch {
      setFoundTrip(null);
    }
  };

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSearch.trim()) return;
    try {
      const usersList = await adminApi.getUsers();
      const match = usersList.find((u) => {
        const displayName = (u.full_name || u.name || '').toLowerCase();
        return (
          String(u.id) === userSearch.trim() ||
          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
          displayName.includes(userSearch.toLowerCase())
        );
      });
      setFoundUser(match || null);
    } catch {
      setFoundUser(null);
    }
  };

  const handleDeactivateFoundUser = async () => {
    if (!foundUser) return;
    try {
      await adminApi.toggleUserStatus(foundUser.id, false);
      setFoundUser({ ...foundUser, is_active: false });
      await refreshAuditLogs();
    } catch (err) {
      console.error('Failed to deactivate user override:', err);
    }
  };

  const handleForceDeleteTrip = async () => {
    if (!foundTrip || !deleteReason.trim()) return;
    try {
      await adminApi.overrideDeleteTrip(Number(foundTrip.id), deleteReason);
      setFoundTrip(null);
      setIsDeletingTrip(false);
      setDeleteReason('');
      await refreshAuditLogs();
    } catch (err) {
      console.error('Failed to override delete trip:', err);
    }
  };

  return (
    <div className="master-records-wrapper">
      <div className="admin-panel-header mb-0">
        <h1 className="admin-panel-title">Master Records Override</h1>
      </div>

      <div className="master-forms-grid">
        {/* Trip Override Card */}
        <div className="admin-card-panel">
          <h2 className="text-sm font-bold mb-3">Trip Records Override</h2>
          <form onSubmit={handleSearchTrip} className="admin-pill-search w-full mb-4">
            <Search size={14} className="text-stone-400" />
            <input
              type="text"
              placeholder="Search Trip ID..."
              value={tripSearch}
              onChange={(e) => setTripSearch(e.target.value)}
            />
          </form>

          <div className="master-field-row">
            <span className="master-field-label">Trip ID:</span>
            <input
              type="text"
              className="master-field-input"
              readOnly
              value={
                foundTrip
                  ? `TRP-${String(foundTrip.id).padStart(3, '0')}`
                  : 'No search query'
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
            <span className="master-field-label">Status:</span>
            <input
              type="text"
              className="master-field-input"
              readOnly
              value={foundTrip ? foundTrip.status : '—'}
            />
          </div>

          <div className="flex justify-end mt-2">
            <button
              type="button"
              disabled={!foundTrip}
              className="btn-master-danger disabled:opacity-50"
              onClick={() => setIsDeletingTrip(true)}
            >
              Master Force Delete Trip
            </button>
          </div>
        </div>

        {/* User Override Card */}
        <div className="admin-card-panel">
          <h2 className="text-sm font-bold mb-3">User Deactivation Override</h2>
          <form onSubmit={handleSearchUser} className="admin-pill-search w-full mb-4">
            <Search size={14} className="text-stone-400" />
            <input
              type="text"
              placeholder="Search User ID or Email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </form>

          <div className="master-field-row">
            <span className="master-field-label">User ID:</span>
            <input
              type="text"
              className="master-field-input"
              readOnly
              value={
                foundUser
                  ? `USR-${String(foundUser.id).padStart(3, '0')}`
                  : 'No search query'
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
              disabled={!foundUser || !foundUser.is_active}
              className="btn-master-danger disabled:opacity-50"
              onClick={handleDeactivateFoundUser}
            >
              Master Force Deactivate
            </button>
          </div>
        </div>
      </div>

      {/* System Audit Logs Section */}
      <div className="admin-card-panel flex-1 min-h-55">
        <h2 className="text-sm font-bold mb-3">Immutable System Audit Trail</h2>

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
                      {new Date(log.created_at).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </td>
                    <td>{log.user_name || 'System Administrator'}</td>
                    <td className="font-semibold">{log.action_type}</td>
                    <td className="font-bold">{log.record_id}</td>
                    <td>{log.description || 'Administrative action'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Force Delete Confirmation Modal */}
      {isDeletingTrip && foundTrip && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-box">
            <div className="flex items-center gap-2 text-red-600 mb-3 font-bold text-base">
              <AlertTriangle size={18} />
              <span>Confirm Force Deletion</span>
            </div>
            <p className="text-xs text-stone-600 mb-4">
              Are you sure you want to permanently delete trip{' '}
              <strong>{foundTrip.name}</strong>? This action will be logged in the
              immutable system audit table.
            </p>
            <label
              htmlFor="del-reason"
              className="block text-xs font-semibold mb-1 text-stone-700"
            >
              Reason for Deletion
            </label>
            <textarea
              id="del-reason"
              required
              rows={3}
              placeholder="e.g. Terms of service violation, fraudulent booking..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="admin-modal-input-field"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="px-4 py-1.5 text-xs text-stone-600 font-semibold"
                onClick={() => setIsDeletingTrip(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deleteReason.trim()}
                className="btn-master-danger mt-0! disabled:opacity-50"
                onClick={handleForceDeleteTrip}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
