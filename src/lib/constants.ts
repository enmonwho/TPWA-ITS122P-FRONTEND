export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  LOGIN: '/login',
  SIGN_UP: '/signup',
  ONBOARDING: '/onboarding',
  ADMIN: '/admin',
  STAFF: '/staff',
  PROFILE_SETTINGS: '/dashboard/settings',
  CUSTOMER_PROFILE: '/dashboard/profile',
  TRIP: (tripId: string | number) => `/trip/${tripId}`,
};

export const STORAGE_KEYS = {
  /**
   * Side-table for trip fields not yet in the backend schema
   * (countries, travelType). Keyed by backend-issued trip ID.
   *
   * ⚠️ STOPGAP: This data is NOT synced to the backend and will be
   * lost if the user clears browser data or uses another device.
   */
  TRIP_EXTRAS: (tripId: string | number) => `lakbye_trip_extras_${tripId}`,

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
};
