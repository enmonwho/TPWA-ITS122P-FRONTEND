import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import lakbyeLogo from '../../assets/lakbye-logo.png';
import { adminApi } from '../../services/api';
import type {
  AdminUser,
  AdminCategory,
  AdminActivity,
  SystemAuditLog,
} from '../../services/api';
import type { Trip } from '../../types/trip';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Admin.css';

type Tab = 'systems' | 'users' | 'categories' | 'master';

interface SystemsMetrics {
  monthlyBookings: number;
  mostRequestedDestination: string;
  totalPlannedBudgets: number;
  totalActiveUsers: number;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('categories');
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (setUser) setUser(null);
    navigate('/login');
  };

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

// ============================================================================
// TAB 1: Systems Report (FR-ADM-03, FR-ADM-04)
// ============================================================================
function SystemsReportTab() {
  const [metrics, setMetrics] = useState<SystemsMetrics>({
    monthlyBookings: 0,
    mostRequestedDestination: 'No data',
    totalPlannedBudgets: 0,
    totalActiveUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadReportData = async () => {
      try {
        const data = await adminApi.getReports();
        if (isMounted && data) {
          setMetrics({
            monthlyBookings: data.monthlyBookings ?? 0,
            mostRequestedDestination:
              data.mostRequestedDestination || 'No destination data',
            totalPlannedBudgets: data.totalPlannedBudgets ?? 0,
            totalActiveUsers: data.totalActiveUsers ?? 0,
          });
        }
      } catch (err) {
        console.error('Failed to load systems report:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadReportData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleExport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        'Metric,Value',
        `Total Monthly Bookings,${metrics.monthlyBookings}`,
        `Most Requested Destination,"${metrics.mostRequestedDestination}"`,
        `Total Planned Budgets,${metrics.totalPlannedBudgets}`,
        `Total Active Users,${metrics.totalActiveUsers}`,
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `LakBye_Systems_Report_${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-card-panel">
      <div className="admin-panel-header">
        <h1 className="admin-panel-title">LakBye Systems Report</h1>
        <button type="button" className="btn-admin-pill-gradient" onClick={handleExport}>
          <Download size={13} /> Export Report
        </button>
      </div>

      <div className="admin-header-rule" />

      {loading ? (
        <div className="flex items-center justify-center h-full text-stone-500 text-sm">
          Loading live systems analytics...
        </div>
      ) : (
        <div className="systems-report-grid">
          <div className="systems-stat-stack">
            <div className="sys-stat-card sys-stat-card--gold">
              <div className="sys-stat-label">TOTAL Monthly Bookings</div>
              <div className="sys-stat-val">
                {metrics.monthlyBookings.toLocaleString()}
              </div>
            </div>
            <div className="sys-stat-card sys-stat-card--red">
              <div className="sys-stat-label">MOST Requested Destination</div>
              <div className="sys-stat-sub">{metrics.mostRequestedDestination}</div>
            </div>
            <div className="sys-stat-card sys-stat-card--gold">
              <div className="sys-stat-label">TOTAL Planned Budgets</div>
              <div className="sys-stat-val">
                ₱{(metrics.totalPlannedBudgets / 1000).toFixed(1)}K
              </div>
            </div>
            <div className="sys-stat-card sys-stat-card--gold">
              <div className="sys-stat-label">TOTAL Active Users</div>
              <div className="sys-stat-val">
                {metrics.totalActiveUsers.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="systems-center-stack">
            <div className="sys-placeholder-box flex-1">
              Users (New, Active, Inactive)
            </div>
            <div className="sys-placeholder-box flex-1">Monthly Bookings</div>
            <div className="sys-placeholder-box flex-1">Avg. Session Duration</div>
          </div>

          <div className="systems-right-stack">
            <div className="sys-placeholder-box" style={{ height: '31%' }}>
              Monthly Planned Budget
            </div>
            <div className="sys-placeholder-box flex-1">
              Top 5 Most Requested Destinations
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB 2: User Management (FR-ADM-01)
// ============================================================================
function UserManagementTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'name' | 'status' | 'role' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

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
      .filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => {
        if (sortField === 'name') {
          return sortOrder === 'asc'
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
        if (sortField === 'status') {
          return a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1;
        }
        if (sortField === 'role') {
          return a.role.localeCompare(b.role);
        }
        if (sortField === 'date') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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
        <span className="text-xs font-bold text-stone-700 mr-2">Filter & Sort by:</span>
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
          className="admin-filter-pill"
          onClick={() => setSortField('status')}
        >
          Status
        </button>
        <button
          type="button"
          className="admin-filter-pill"
          onClick={() => setSortField('role')}
        >
          Role
        </button>
        <button
          type="button"
          className="admin-filter-pill"
          onClick={() => setSortField('date')}
        >
          Member Since
        </button>

        <div className="ml-auto admin-pill-search mb-0">
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
                    <td className="font-semibold">{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      {new Date(u.created_at).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
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
                        <div className="absolute right-0 top-8 bg-white border border-stone-200 shadow-lg rounded-lg py-1 z-20 w-32 text-left">
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
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TAB 3: Categories & Activities (FR-ADM-02)
// ============================================================================
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
  const [categoryName, setCategoryName] = useState('');
  const [categoryType, setCategoryType] = useState('');

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

    try {
      await adminApi.createCategory({
        name: categoryName,
        type: categoryType || 'General',
      });
      setCatModalOpen(false);
      setCategoryName('');
      setCategoryType('');
      await refreshData();
    } catch (err) {
      console.error('Failed to create category:', err);
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
                {filteredCategories.map((c) => (
                  <tr key={c.id}>
                    <td>C{String(c.id).padStart(3, '0')}</td>
                    <td className="font-semibold">{c.name}</td>
                    <td>{c.type}</td>
                    <td>{c.activity_count ?? 0}</td>
                    <td>
                      <button
                        type="button"
                        aria-label="Edit category"
                        className="text-stone-500 hover:text-black"
                      >
                        <Edit size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
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
                        aria-label="Activity options"
                        className="text-stone-500 hover:text-black"
                      >
                        <MoreVertical size={16} />
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
                onChange={(e) => setCategoryName(e.target.value)}
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
                onChange={(e) => setCategoryType(e.target.value)}
                className="admin-modal-input-field"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="px-4 py-1.5 text-xs text-stone-600 font-semibold"
                onClick={() => setCatModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-admin-pill-gradient">
                Save Category
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

// ============================================================================
// TAB 4: Master Records Override (FR-ADM-01, FR-ADM-05)
// ============================================================================
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
      const match = usersList.find(
        (u) =>
          String(u.id) === userSearch.trim() ||
          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.name.toLowerCase().includes(userSearch.toLowerCase()),
      );
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

          <div className="text-center mt-2">
            <button
              type="button"
              disabled={!foundTrip}
              className="btn-master-danger disabled:opacity-50"
              onClick={() => setIsDeletingTrip(true)}
            >
              Force Delete Trip
            </button>
          </div>
        </div>

        {/* User Override Card */}
        <div className="admin-card-panel">
          <h2 className="text-sm font-bold mb-3">User Records Override</h2>
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
            <span className="master-field-label">Name:</span>
            <input
              type="text"
              className="master-field-input"
              readOnly
              value={foundUser ? foundUser.name : '—'}
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
            <span className="master-field-label">Status:</span>
            <input
              type="text"
              className="master-field-input"
              readOnly
              value={foundUser ? (foundUser.is_active ? 'ACTIVE' : 'INACTIVE') : '—'}
            />
          </div>

          <div className="text-center mt-2">
            <button
              type="button"
              disabled={!foundUser || !foundUser.is_active}
              className="btn-master-danger disabled:opacity-50"
              onClick={handleDeactivateFoundUser}
            >
              Deactivate User
            </button>
          </div>
        </div>
      </div>

      {/* Override Activity Log */}
      <div className="admin-card-panel flex-1">
        <img src={lakbyeLogo} alt="" className="admin-watermark" />
        <h2
          className="text-sm font-bold mb-3"
          style={{ color: 'var(--color-brand-red)' }}
        >
          Override Activity Log
        </h2>

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
                className="btn-master-danger !mt-0 disabled:opacity-50"
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
