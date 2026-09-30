/**
 * Customer session tracking and duration analytics service for LakBye.
 * Tracks live customer session duration, persists historical customer session records to localStorage,
 * and derives real customer average session metrics across active and historical periods.
 *
 * NOTE: Strictly excludes Admin and Staff users from all session duration metrics.
 */

export interface SessionRecord {
  id: string;
  userId?: string | number;
  userRole?: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
}

export interface SessionMetricsResult {
  avgDurationFormatted: string;
  avgDurationSeconds: number;
  changePct: number;
  isPositive: boolean;
  fillPercentage: number;
}

const STORAGE_KEY_SESSIONS = 'lakbye_session_records';
const SESSION_START_KEY = 'lakbye_active_session_start';
const SESSION_ID_KEY = 'lakbye_active_session_id';
const LAST_HEARTBEAT_KEY = 'lakbye_active_session_last_heartbeat';

// Benchmark: 15 minutes (900 seconds) target customer session length for 100% progress fill
const BENCHMARK_SESSION_SECONDS = 900;

/**
 * Returns the logged-in user's role from localStorage.
 */
export function getCurrentUserRole(): { userId?: number | string; role: string } {
  if (typeof window === 'undefined') return { role: 'guest' };
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        userId: parsed.id,
        role: String(parsed.role || 'customer').toLowerCase(),
      };
    }
  } catch {
    // Ignore parse error
  }
  return { role: 'guest' };
}

/**
 * Initializes client-side session tracking.
 * Safe to call multiple times; attaches listeners only once.
 */
let isTrackerInitialized = false;

export function initSessionTracker(): void {
  if (isTrackerInitialized || typeof window === 'undefined') return;
  isTrackerInitialized = true;

  const now = Date.now();
  let startTime = Number(sessionStorage.getItem(SESSION_START_KEY));
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);

  if (!startTime || !sessionId) {
    startTime = now;
    sessionId = `sess_${now}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(SESSION_START_KEY, String(startTime));
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }

  sessionStorage.setItem(LAST_HEARTBEAT_KEY, String(now));

  // Sync active customer session duration to persistent storage
  const syncSession = () => {
    const { userId, role } = getCurrentUserRole();

    // STRICT: Do NOT record or accumulate session time for admin or staff users
    if (role === 'admin' || role === 'staff') {
      return;
    }

    const currentNow = Date.now();
    const duration = Math.max(1, Math.round((currentNow - startTime) / 1000));
    sessionStorage.setItem(LAST_HEARTBEAT_KEY, String(currentNow));

    saveSessionRecord({
      id: sessionId!,
      userId,
      userRole: role,
      startTime,
      endTime: currentNow,
      durationSeconds: duration,
    });
  };

  // Immediate initial record if customer/guest
  syncSession();

  // Periodic heartbeat every 15 seconds
  const intervalId = window.setInterval(syncSession, 15000);

  // Update on page visibility change or unload
  const handleVisibilityOrUnload = () => {
    syncSession();
  };

  window.addEventListener('visibilitychange', handleVisibilityOrUnload);
  window.addEventListener('beforeunload', handleVisibilityOrUnload);
  window.addEventListener('pagehide', handleVisibilityOrUnload);

  // Clean up on hot-module-reload if needed
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      window.clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityOrUnload);
      window.removeEventListener('beforeunload', handleVisibilityOrUnload);
      window.removeEventListener('pagehide', handleVisibilityOrUnload);
    });
  }
}

/**
 * Returns the current active customer session duration in seconds.
 * Returns 0 if current browser user is an Admin or Staff member.
 */
export function getActiveCustomerSessionDurationSeconds(): number {
  if (typeof window === 'undefined') return 0;
  const { role } = getCurrentUserRole();
  if (role === 'admin' || role === 'staff') {
    return 0; // Exclude admin/staff session from customer analytics
  }
  const startTime = Number(sessionStorage.getItem(SESSION_START_KEY));
  if (!startTime) return 0;
  return Math.max(1, Math.round((Date.now() - startTime) / 1000));
}

/**
 * Retrieves all stored session records from localStorage, excluding admin and staff sessions.
 */
export function getStoredSessionRecords(): SessionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Strict filter: exclude any historical session records belonging to admin or staff
    return parsed.filter(
      (s: SessionRecord) => s.userRole !== 'admin' && s.userRole !== 'staff',
    );
  } catch {
    return [];
  }
}

/**
 * Saves or updates a session record in persistent storage.
 */
function saveSessionRecord(record: SessionRecord): void {
  if (typeof window === 'undefined') return;
  // Never save admin or staff records
  if (record.userRole === 'admin' || record.userRole === 'staff') return;

  try {
    const records = getStoredSessionRecords();
    const existingIndex = records.findIndex((r) => r.id === record.id);
    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }
    // Retain up to 300 recent customer sessions to prevent unbounded storage growth
    const trimmed = records.slice(-300);
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(trimmed));
  } catch {
    // Ignore storage quota limits
  }
}

/**
 * Format duration in seconds to "XXm YYs" (e.g. "06m 42s").
 */
export function formatSessionDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '00m 00s';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

export interface CustomerSessionComputeOptions {
  customerTrips?: Array<{ created_at?: string; user_id?: number }>;
  customerBookings?: Array<{
    submitted_at?: string;
    created_at?: string;
    user_id?: number;
  }>;
  customerUserIds?: Set<number | string>;
  totalCustomersCount?: number;
}

/**
 * Computes customer-only session metrics based on:
 * 1. Tracked customer client sessions in localStorage (excluding admin/staff)
 * 2. Live customer active session (excluding active admin/staff browser session)
 * 3. Customer database actions (trips and bookings clustered into 30-min customer sessions)
 * 4. Period filtering ('30d' | '90d' | '1y') and period-over-period trend delta
 */
export function computeSessionMetrics(
  period: '30d' | '90d' | '1y',
  options: CustomerSessionComputeOptions = {},
): SessionMetricsResult {
  const {
    customerTrips = [],
    customerBookings = [],
    customerUserIds = new Set(),
    totalCustomersCount = 0,
  } = options;

  const now = Date.now();
  const intervalDays = period === '90d' ? 90 : period === '1y' ? 365 : 30;
  const periodStartTime = now - intervalDays * 24 * 60 * 60 * 1000;
  const prevPeriodStartTime = now - intervalDays * 2 * 24 * 60 * 60 * 1000;

  // 1. Collect all valid CUSTOMER session durations
  const allSessions: Array<{ startTime: number; durationSeconds: number }> = [];

  // A. Add stored customer client sessions
  const stored = getStoredSessionRecords();
  stored.forEach((s) => {
    if (s.durationSeconds > 0 && s.userRole !== 'admin' && s.userRole !== 'staff') {
      allSessions.push({
        startTime: s.startTime,
        durationSeconds: s.durationSeconds,
      });
    }
  });

  // B. Include current live session ONLY IF active user is NOT admin or staff
  const liveCustomerSec = getActiveCustomerSessionDurationSeconds();
  if (liveCustomerSec > 0) {
    const liveStartTime = Number(sessionStorage.getItem(SESSION_START_KEY)) || now;
    allSessions.push({
      startTime: liveStartTime,
      durationSeconds: liveCustomerSec,
    });
  }

  // C. Derive customer sessions from customer database activities (trips & bookings)
  const customerActivityTimestamps: Array<{ userId: number | string; time: number }> = [];

  customerTrips.forEach((t) => {
    if (t.created_at) {
      const time = new Date(t.created_at).getTime();
      if (time > 0) {
        const uId = t.user_id != null ? t.user_id : 'customer_anon';
        if (
          customerUserIds.size === 0 ||
          customerUserIds.has(uId) ||
          uId === 'customer_anon'
        ) {
          customerActivityTimestamps.push({ userId: uId, time });
        }
      }
    }
  });

  customerBookings.forEach((b) => {
    const dStr = b.submitted_at || b.created_at;
    if (dStr) {
      const time = new Date(dStr).getTime();
      if (time > 0) {
        const uId = b.user_id != null ? b.user_id : 'customer_anon';
        if (
          customerUserIds.size === 0 ||
          customerUserIds.has(uId) ||
          uId === 'customer_anon'
        ) {
          customerActivityTimestamps.push({ userId: uId, time });
        }
      }
    }
  });

  if (customerActivityTimestamps.length > 0) {
    // Group by customer user ID
    const customerLogsMap = new Map<number | string, number[]>();
    customerActivityTimestamps.forEach(({ userId, time }) => {
      const list = customerLogsMap.get(userId) || [];
      list.push(time);
      customerLogsMap.set(userId, list);
    });

    const SESSION_INACTIVITY_GAP_MS = 30 * 60 * 1000; // 30 minutes standard session clustering

    customerLogsMap.forEach((timestamps) => {
      timestamps.sort((a, b) => a - b);
      let sessionStart = timestamps[0];
      let sessionEnd = timestamps[0];

      for (let i = 1; i < timestamps.length; i++) {
        const t = timestamps[i];
        if (t - sessionEnd <= SESSION_INACTIVITY_GAP_MS) {
          sessionEnd = t;
        } else {
          // Completed customer session cluster
          const duration = Math.max(60, Math.round((sessionEnd - sessionStart) / 1000));
          allSessions.push({
            startTime: sessionStart,
            durationSeconds: duration,
          });
          sessionStart = t;
          sessionEnd = t;
        }
      }

      // Final customer cluster
      const duration = Math.max(60, Math.round((sessionEnd - sessionStart) / 1000));
      allSessions.push({
        startTime: sessionStart,
        durationSeconds: duration,
      });
    });
  }

  // 2. Segment customer sessions into current period vs previous period
  const currPeriodSessions = allSessions.filter(
    (s) => s.startTime >= periodStartTime && s.startTime <= now,
  );
  const prevPeriodSessions = allSessions.filter(
    (s) => s.startTime >= prevPeriodStartTime && s.startTime < periodStartTime,
  );

  let currAvgSeconds = 0;
  if (currPeriodSessions.length > 0) {
    const totalSec = currPeriodSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    currAvgSeconds = Math.round(totalSec / currPeriodSessions.length);
  } else if (allSessions.length > 0) {
    const totalSec = allSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    currAvgSeconds = Math.round(totalSec / allSessions.length);
  } else if (totalCustomersCount > 0 && liveCustomerSec > 0) {
    currAvgSeconds = liveCustomerSec;
  }

  let prevAvgSeconds = 0;
  if (prevPeriodSessions.length > 0) {
    const totalSec = prevPeriodSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
    prevAvgSeconds = Math.round(totalSec / prevPeriodSessions.length);
  }

  // 3. Compute period-over-period trend percentage
  let changePct = 0;
  if (prevAvgSeconds > 0) {
    changePct = Number(
      (((currAvgSeconds - prevAvgSeconds) / prevAvgSeconds) * 100).toFixed(1),
    );
  } else if (currAvgSeconds > 0 && prevPeriodSessions.length === 0) {
    changePct = 0;
  }

  const isPositive = changePct >= 0;
  const fillPercentage =
    currAvgSeconds > 0
      ? Math.min(
          100,
          Math.max(5, Math.round((currAvgSeconds / BENCHMARK_SESSION_SECONDS) * 100)),
        )
      : 0;

  return {
    avgDurationFormatted: formatSessionDuration(currAvgSeconds),
    avgDurationSeconds: currAvgSeconds,
    changePct: Math.abs(changePct),
    isPositive,
    fillPercentage,
  };
}
