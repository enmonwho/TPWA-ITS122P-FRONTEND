import { createBrowserRouter } from 'react-router-dom';
import { BaseLayout, DashboardLayout, TripWorkspaceLayout } from './layouts';
import {
  Home,
  Login,
  Onboarding,
  SignUp,
  Dashboard,
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
