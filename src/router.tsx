import { createBrowserRouter, Navigate } from 'react-router-dom';
import AdminDashboard from './pages/admin/AdminDashboard';
import StaffDashboard from './pages/staff/StaffDashboard';
import { BaseLayout, DashboardLayout, TripWorkspaceLayout, RootLayout } from './layouts';
import { ProtectedRoute, PublicOnlyRoute } from './components';
import PublicProfile from './pages/PublicProfile';
import ResetPassword from './pages/ResetPassword';
import {
  Home,
  Login,
  Onboarding,
  SignUp,
  Dashboard,
  Bookings,
  Explore,
  MapView,
  TripWorkspace,
  Budget,
  Settings,
  ProfileSettings,
  CustomerProfile,
} from './pages';

/**
 * Application router configuration.
 *
 * All routes are wrapped under RootLayout which provides PageLoaderContext
 * and automatically displays the spinning earth page loader on cross-page transitions.
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        element: <BaseLayout />,
        children: [
          {
            index: true,
            element: <Home />,
          },
        ],
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            path: '',
            element: <Dashboard />,
          },
          {
            path: 'profile',
            element: <CustomerProfile />,
          },
          {
            path: 'bookings',
            element: <Bookings />,
          },
          {
            path: 'explore',
            element: <Explore />,
          },
          {
            path: 'map',
            element: <MapView />,
          },
          {
            path: 'settings',
            element: <ProfileSettings />,
          },
        ],
      },
      {
        path: 'app/settings/profile',
        element: <Navigate to="/dashboard/settings" replace />,
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'staff',
        element: (
          <ProtectedRoute allowedRoles={['staff', 'admin']}>
            <StaffDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'login',
        element: (
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        ),
      },
      {
        path: 'signup',
        element: (
          <PublicOnlyRoute>
            <SignUp />
          </PublicOnlyRoute>
        ),
      },
      {
        path: 'reset-password',
        element: <ResetPassword />, 
      },
     
      {
        path: 'onboarding',
        element: (
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        ),
      },
      {
        path: 'trip/:tripId',
        element: (
          <ProtectedRoute>
            <TripWorkspaceLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            path: '',
            element: <TripWorkspace />,
          },
          {
            path: 'budget',
            element: <Budget />,
          },
          {
            path: 'settings',
            element: <Settings />,
          },
        ],
      },
      {
        path: '/profile/:username',
        element: <PublicProfile />,
      },
      {
        path: ':username', // Wildcard route placed at the very bottom
        element: (
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <PublicProfile />,
          },
        ],
      },
    ],
  },
]);

export default router;