import { createBrowserRouter } from 'react-router-dom';
import AdminDashboard from './pages/admin/AdminDashboard';
import StaffDashboard from './pages/staff/StaffDashboard';
import { BaseLayout, DashboardLayout, TripWorkspaceLayout } from './layouts';
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
    element: <DashboardLayout />,
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
    element: <AdminDashboard />,
  },
  {
    path: '/staff',
    element: <StaffDashboard />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <SignUp />,
  },
  {
    path: '/onboarding',
    element: <Onboarding />,
  },
  {
    path: '/trip/:tripId',
    element: <TripWorkspaceLayout />,
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
