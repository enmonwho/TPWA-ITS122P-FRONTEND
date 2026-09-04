/**
 * User roles for the Travel Planner application.
 * Used for role-based access control throughout the UI.
 */
export type UserRole = 'admin' | 'staff' | 'customer' | 'vendor';

/**
 * Base user interface — represents the minimal user shape
 * returned from the API. Extend this for feature-specific needs.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
