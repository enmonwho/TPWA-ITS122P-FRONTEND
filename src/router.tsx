import { createBrowserRouter } from 'react-router-dom';
import { BaseLayout, DashboardLayout } from './layouts';
import { Home, Login, Onboarding, SignUp, Dashboard } from './pages';

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
]);

export default router;
