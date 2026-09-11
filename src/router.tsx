import { createBrowserRouter } from 'react-router-dom';
import { BaseLayout, DashboardLayout, TripWorkspaceLayout } from './layouts';
import {
  Home,
  Login,
  Onboarding,
  SignUp,
  Dashboard,
  TripWorkspace,
  Budget,
  Settings,
} from './pages';

/**
 * Application router configuration.
 *
 * All routes are nested inside BaseLayout so they share
 * the common Header/Footer chrome. Add new routes here.
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
