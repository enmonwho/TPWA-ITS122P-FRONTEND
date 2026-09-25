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
  MOCK_USERS: 'lakbye_mock_users',
  MOCK_SESSION: 'lakbye_mock_session',
  MOCK_PREFS: (userId: string | number) => `lakbye_mock_prefs_${userId}`,

  /**
   * Side-table for trip fields not yet in the backend schema
   * (countries, travelType). Keyed by backend-issued trip ID.
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
