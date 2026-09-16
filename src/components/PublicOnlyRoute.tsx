import React, { useRef, useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/constants';
import EarthLoadingScreen from './EarthLoadingScreen';

interface PublicOnlyRouteProps {
  children?: React.ReactNode;
}

/**
 * Route wrapper for guest-only pages like Login and Sign Up.
 * - Shows loading spinner while checking initial session.
 * - If user was already authenticated upon loading this route, redirects them directly to their role-appropriate portal.
 * - If user transitions to authenticated via in-page form submission (SignUp or Login), lets the page component control its target navigation.
 * - If unauthenticated, renders children or outlet.
 */
export default function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const isInitialCheckRef = useRef(true);

  useEffect(() => {
    if (!isLoading && isInitialCheckRef.current) {
      isInitialCheckRef.current = false;
      if (user) {
        const role = user.role?.toLowerCase() || '';
        if (role === 'admin') {
          navigate(ROUTES.ADMIN, { replace: true });
        } else if (role === 'staff') {
          navigate(ROUTES.STAFF, { replace: true });
        } else {
          navigate(ROUTES.HOME, { replace: true });
        }
      }
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return <EarthLoadingScreen />;
  }

  return children ? <>{children}</> : <Outlet />;
}
