import { createBrowserRouter } from 'react-router-dom';
import { BaseLayout } from './layouts';
import { Home, Login } from './pages';

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
    path: '/login',
    element: <Login />,
  },
]);

export default router;
