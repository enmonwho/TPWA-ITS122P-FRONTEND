/**
 * User roles for the Travel Planner application.
 * Used for role-based access control throughout the UI.
 */
export type UserRole = 'admin' | 'staff' | 'customer' | 'vendor' | string;

export interface UserPreferences {
  username?: string;
  bio?: string;
  timeFormat?: string;
  dateFormat?: string;
  currency?: string;
  distanceUnit?: string;
  onboardingCompleted?: boolean;
}

/**
 * Base user interface matching the backend response.
 */
export interface User {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  is_verified?: boolean;
  created_at?: string;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  preferences?: UserPreferences;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token?: string;
}

export interface MeResponse {
  user: User;
}
