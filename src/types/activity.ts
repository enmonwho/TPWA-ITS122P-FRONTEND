/** Backend-backed Admin session and activity records. */

export interface UserSessionRecord {
  session_id: number;
  user_id: number | null;
  full_name: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
  visitor_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  session_start: string;
  last_seen_at: string;
  session_end: string | null;
  duration_seconds: number | null;
  is_open: boolean;
  is_active: boolean;
  action_count: number;
}

export interface UserSessionAction {
  id: number;
  user_id: number | null;
  session_id: number;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface UserActivityRecord {
  id: number | string;
  user_id: number | null;
  session_id: number | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
  full_name: string | null;
  username: string | null;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

/**
 * Predefined activity action types.
 */
export type ActivityAction =
  | 'login'
  | 'logout'
  | 'register'
  | 'page_view'
  | 'trip_create'
  | 'trip_delete'
  | 'booking_create'
  | 'expense_add'
  | 'profile_update'
  | 'session_start'
  | 'session_end';

/**
 * A single recorded user activity event.
 */
export interface ActivityEvent {
  /** Unique event ID (e.g. `act_<timestamp>_<random>`) */
  id: string;
  /** Backend user ID (undefined for unauthenticated visitors) */
  userId?: number;
  /** User role at time of event */
  userRole?: string;
  /** Action type */
  action: ActivityAction;
  /** Route path where the event occurred (e.g. `/dashboard/bookings`) */
  page?: string;
  /** Arbitrary metadata attached to the event */
  metadata?: Record<string, unknown>;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Server-issued session ID linking events to a session. */
  sessionId?: string;
  /** Client IP address (best-effort, may be undefined) */
  ip?: string;
}

/**
 * Filter options for querying the activity log.
 */
export interface ActivityLogFilter {
  userId?: number;
  action?: ActivityAction;
  startTime?: number;
  endTime?: number;
  page?: string;
}
