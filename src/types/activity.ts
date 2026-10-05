/**
 * Activity tracking types reserved for a future backend implementation.
 */

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
  /** Session ID from sessionTracker (links events to a session) */
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
