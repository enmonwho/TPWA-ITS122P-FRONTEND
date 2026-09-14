import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';
import Spinner from './Spinner';

interface PublicOnlyRouteProps {
  children?: React.ReactNode;
}

/**
 * Route wrapper for guest-only pages like Login and Sign Up.
 * - Shows loading spinner while checking initial session.
 * - If user is already authenticated, redirects them directly to their role-appropriate portal.
 * - If unauthenticated, renders children or outlet.
 */
export default function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAF8F5',
        }}
      >
        <Spinner size={48} />
      </div>
    );
  }

  if (user) {
    const role = user.role?.toLowerCase() || '';
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
