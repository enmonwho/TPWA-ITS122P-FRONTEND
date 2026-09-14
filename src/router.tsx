import { createBrowserRouter } from 'react-router-dom';
import AdminDashboard from './pages/admin/AdminDashboard';
import StaffDashboard from './pages/staff/StaffDashboard';
import { BaseLayout, DashboardLayout, TripWorkspaceLayout } from './layouts';
import { ProtectedRoute, PublicOnlyRoute } from './components';
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
} from './pages';

/**
 * Application router configuration.
 *
 * Sub-routes under /dashboard share DashboardLayout (sidebar/navigation).
 */
const router = createBrowserRouter([
  {
    element: <BaseLayout />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
    ],
  },
  {
    path: '/dashboard',
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
    ],
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff',
    element: (
      <ProtectedRoute allowedRoles={['staff', 'admin']}>
        <StaffDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <Login />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/signup',
    element: (
      <PublicOnlyRoute>
        <SignUp />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/onboarding',
    element: (
      <ProtectedRoute>
        <Onboarding />
      </ProtectedRoute>
    ),
  },
  {
    path: '/trip/:tripId',
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
]);

export default router;
