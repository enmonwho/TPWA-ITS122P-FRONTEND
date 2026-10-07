export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  LOGIN: '/login',
  SIGN_UP: '/signup',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  ONBOARDING: '/onboarding',
  ADMIN: '/admin',
  STAFF: '/staff',
  PROFILE_SETTINGS: '/dashboard/settings',
  CUSTOMER_PROFILE: '/dashboard/profile',
  TRIP: (tripId: string | number) => `/trip/${tripId}`,
  TRIP_BUDGET: (tripId: string | number) => `/trip/${tripId}/budget`,
  TRIP_PACKING: (tripId: string | number) => `/trip/${tripId}/packing`,
};

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  VISITOR_ID: 'lakbye_visitor_id',
  VISIT_SESSION_ID: 'lakbye_visit_session_id',
  MOCK_USERS: 'lakbye_mock_users',
  MOCK_SESSION: 'lakbye_mock_session',
  MOCK_PREFS: (userId: string | number) => `lakbye_mock_prefs_${userId}`,

  /**
   * Side-table for trip fields not yet in the backend schema
   * (countries, travelType). Keyed by backend-issued trip ID.
   */
  TRIP_EXTRAS: (tripId: string | number) => `lakbye_trip_extras_${tripId}`,

  /** Maps the Trip Workspace's stable local row IDs to backend destination IDs. */
  WORKSPACE_DESTINATION_IDS: (tripId: string | number) =>
    `lakbye_workspace_destination_ids_${tripId}`,
  WORKSPACE_DESTINATIONS_MIGRATED: (tripId: string | number) =>
    `lakbye_workspace_destinations_migrated_${tripId}`,

  /**
   * Side-table for user preferences (username, timeFormat, dateFormat, currency, distanceUnit).
   * Keyed by backend-issued user ID.
   */
  USER_PREFERENCES: (userId: string | number) => `lakbye_preferences_${userId}`,

  /**
   * Client-side cache and persistence for user travel journal entries.
   * Keyed by backend-issued user ID.
   */
  JOURNALS: (userId: string | number) => `lakbye_journals_${userId}`,

  /**
   * Side-table for booking fields not yet in backend schema (trip_id, booking_date, custom_title, custom_type, cost, notes).
   * Keyed by backend-issued booking ID.
   */
  BOOKING_EXTRAS: (bookingId: string | number) => `lakbye_booking_extras_${bookingId}`,

  /**
   * Side-table for trip custom reservations (hotels/stays) not supported by backend schema.
   * Keyed by backend-issued trip ID.
   */
  TRIP_BOOKINGS: (tripId: string | number) => `lakbye_trip_bookings_${tripId}`,
};
