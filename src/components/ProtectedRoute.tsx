import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';
import EarthLoadingScreen from './EarthLoadingScreen';

interface ProtectedRouteProps {
  /**
   * Optional array of allowed roles (e.g. ['admin'], ['staff', 'admin']).
   * If omitted, any authenticated user can access the route.
   */
  allowedRoles?: string[];
  /**
   * Optional custom redirect path when user lacks role permissions.
   */
  redirectPath?: string;
  /**
   * Optional child component (supports both wrapper and Outlet usage).
   */
  children?: React.ReactNode;
}

/**
 * Route guard that requires the user to be authenticated and have an allowed role.
 * - Shows a spinning earth loading screen while session validation is pending.
 * - Redirects unauthenticated users to `/login`.
 * - Redirects unauthorized users with mismatched roles to their authorized home portal.
 */
export default function ProtectedRoute({
  allowedRoles,
  redirectPath,
  children,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <EarthLoadingScreen />;
  }

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  const role = user.role?.toLowerCase() || '';

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }

    // Role-appropriate redirect destination
    if (role === 'admin') {
      return <Navigate to={ROUTES.ADMIN} replace />;
    }
    if (role === 'staff') {
      return <Navigate to={ROUTES.STAFF} replace />;
    }
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
