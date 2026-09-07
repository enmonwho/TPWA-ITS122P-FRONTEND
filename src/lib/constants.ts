export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  LOGIN: '/login',
  SIGN_UP: '/signup',
  ONBOARDING: '/onboarding',
  TRIP: (tripId: string | number) => `/trip/${tripId}`,
};

export const STORAGE_KEYS = {
  TRIPS: (userId: string | number) => `lakbye_trips_${userId}`,
};
