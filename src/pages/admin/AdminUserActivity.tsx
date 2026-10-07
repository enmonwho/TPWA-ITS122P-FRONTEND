import { Fragment, useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { adminUserActivityApi } from '../../services/api';
import type {
  UserActivityRecord,
  UserSessionAction,
  UserSessionRecord,
} from '../../types/activity';

function formatTimestamp(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function formatDuration(seconds?: number | null): string {
  if (seconds == null) return 'In progress';
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remainder = Math.max(0, seconds) % 60;
  return `${minutes}m ${remainder}s`;
}

function getSessionLabel(session: UserSessionRecord): string {
  if (!session.user_id) {
    const shortId = session.visitor_id?.slice(0, 8) || `session-${session.session_id}`;
    return `Guest Visitor · ${shortId}`;
  }
  return (
    session.full_name || session.username || session.email || `User ${session.user_id}`
  );
}

export default function AdminUserActivity() {
  const [sessions, setSessions] = useState<UserSessionRecord[]>([]);
  const [activities, setActivities] = useState<UserActivityRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [visitorMetrics, setVisitorMetrics] = useState({
    active_visitors: 0,
    logged_in_visitors: 0,
    guest_visitors: 0,
  });
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);
  const [sessionActions, setSessionActions] = useState<
    Record<number, UserSessionAction[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [sessionResult, activityResult, metricsResult] = await Promise.all([
        adminUserActivityApi.getSessions(1, 50),
        adminUserActivityApi.getActivity(1, 50),
        adminUserActivityApi.getSessionMetrics(),
      ]);
      setError('');
      setSessions(sessionResult.sessions);
      setActivities(activityResult.activities);
      setTotal(sessionResult.pagination.total);
      setVisitorMetrics(metricsResult);
    } catch {
      setError('Unable to load user activity. Check the admin API and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = () => {
    setLoading(true);
    setError('');
    void load();
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      adminUserActivityApi.getSessions(1, 50),
      adminUserActivityApi.getActivity(1, 50),
      adminUserActivityApi.getSessionMetrics(),
    ])
      .then(([sessionResult, activityResult, metricsResult]) => {
        if (!active) return;
        setSessions(sessionResult.sessions);
        setActivities(activityResult.activities);
        setTotal(sessionResult.pagination.total);
        setVisitorMetrics(metricsResult);
        setError('');
      })
      .catch(() => {
        if (active)
          setError('Unable to load user activity. Check the admin API and try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const refreshSessions = async () => {
      try {
        const [result, metrics] = await Promise.all([
          adminUserActivityApi.getSessions(1, 50),
          adminUserActivityApi.getSessionMetrics(),
        ]);
        if (!active) return;
        setSessions(result.sessions);
        setTotal(result.pagination.total);
        setVisitorMetrics(metrics);
      } catch {
        // Keep the last successful session snapshot visible during transient failures.
      }
    };

    const intervalId = window.setInterval(() => void refreshSessions(), 15_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const toggleSession = async (sessionId: number) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      return;
    }
    setExpandedSessionId(sessionId);
    if (sessionActions[sessionId]) return;
    try {
      const result = await adminUserActivityApi.getSessionActions(sessionId);
      setSessionActions((current) => ({ ...current, [sessionId]: result.actions }));
    } catch {
      setSessionActions((current) => ({ ...current, [sessionId]: [] }));
    }
  };

  return (
    <section className="admin-activity-page">
      <header className="admin-activity-heading">
        <div>
          <h1>User Activity</h1>
          <p>Server-recorded sessions and trip, destination, and booking actions.</p>
        </div>
        <button
          type="button"
          className="admin-activity-refresh"
          onClick={refresh}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      {error && (
        <p className="admin-activity-error" role="alert">
          {error}
        </p>
      )}

      <div className="admin-activity-summary">
        <div className="admin-card-panel">
          <span>Recorded sessions</span>
          <strong>{loading ? '—' : total.toLocaleString()}</strong>
        </div>
        <div className="admin-card-panel">
          <span>Recent actions</span>
          <strong>{loading ? '—' : activities.length.toLocaleString()}</strong>
        </div>
        <div className="admin-card-panel">
          <span>Active visitors</span>
          <strong>
            {loading ? '—' : visitorMetrics.active_visitors.toLocaleString()}
          </strong>
        </div>
        <div className="admin-card-panel">
          <span>Logged-in visitors</span>
          <strong>
            {loading ? '—' : visitorMetrics.logged_in_visitors.toLocaleString()}
          </strong>
        </div>
        <div className="admin-card-panel">
          <span>Guest visitors</span>
          <strong>
            {loading ? '—' : visitorMetrics.guest_visitors.toLocaleString()}
          </strong>
        </div>
      </div>

      <section className="admin-card-panel admin-activity-panel">
        <div className="admin-panel-header">
          <h2>Sessions</h2>
          <span>{total.toLocaleString()} total</span>
        </div>
        {loading ? (
          <p className="admin-activity-empty">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <p className="admin-activity-empty">No recorded sessions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Visitor</th>
                  <th>IP address</th>
                  <th>Started</th>
                  <th>Last seen</th>
                  <th>Ended</th>
                  <th>Active time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <Fragment key={session.session_id}>
                    <tr key={session.session_id}>
                      <td>
                        <button
                          type="button"
                          className="admin-activity-expand"
                          onClick={() => void toggleSession(session.session_id)}
                          aria-expanded={expandedSessionId === session.session_id}
                        >
                          {expandedSessionId === session.session_id ? (
                            <ChevronDown size={15} />
                          ) : (
                            <ChevronRight size={15} />
                          )}
                          <span>{getSessionLabel(session)}</span>
                        </button>
                        {session.user_id && session.email && (
                          <small className="admin-activity-visitor-detail">
                            {session.email} · {session.role || 'user'}
                          </small>
                        )}
                      </td>
                      <td>{session.ip_address || '—'}</td>
                      <td>{formatTimestamp(session.session_start)}</td>
                      <td>{formatTimestamp(session.last_seen_at)}</td>
                      <td>{formatTimestamp(session.session_end)}</td>
                      <td>{formatDuration(session.duration_seconds)}</td>
                      <td>
                        <span
                          className={`admin-session-status ${session.is_active ? 'is-active' : 'is-inactive'}`}
                        >
                          {session.is_active
                            ? 'Active'
                            : session.session_end
                              ? 'Ended'
                              : 'Inactive'}
                        </span>
                      </td>
                      <td>{session.action_count}</td>
                    </tr>
                    {expandedSessionId === session.session_id && (
                      <tr key={`${session.session_id}-actions`}>
                        <td colSpan={8}>
                          <div className="admin-activity-actions">
                            <strong>Session actions</strong>
                            {(sessionActions[session.session_id] || []).length === 0 ? (
                              <p>No linked business actions recorded.</p>
                            ) : (
                              <ul>
                                {sessionActions[session.session_id].map((action) => (
                                  <li key={action.id}>
                                    <span>{action.action.replaceAll('_', ' ')}</span>
                                    <span>
                                      {action.entity_type || 'event'}
                                      {action.entity_id ? ` #${action.entity_id}` : ''}
                                    </span>
                                    <time>{formatTimestamp(action.created_at)}</time>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card-panel admin-activity-panel">
        <div className="admin-panel-header">
          <h2>Recent Activity</h2>
          <span>Latest {activities.length}</span>
        </div>
        {!loading && activities.length === 0 ? (
          <p className="admin-activity-empty">No activity has been recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Record</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td>{formatTimestamp(activity.created_at)}</td>
                    <td>
                      {activity.full_name ||
                        activity.username ||
                        `User ${activity.user_id ?? 'removed'}`}
                    </td>
                    <td className="font-semibold">
                      {activity.action.replaceAll('_', ' ')}
                    </td>
                    <td>
                      {activity.entity_type || '—'}
                      {activity.entity_id ? ` #${activity.entity_id}` : ''}
                    </td>
                    <td>
                      {activity.details && Object.keys(activity.details).length
                        ? JSON.stringify(activity.details)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
