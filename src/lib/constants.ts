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
   *
   * ⚠️ STOPGAP: The backend users table has no columns for username or preferences.
   * This data is stored in localStorage only and is not synced with the backend API.
   */
  USER_PREFERENCES: (userId: string | number) => `lakbye_preferences_${userId}`,
};
