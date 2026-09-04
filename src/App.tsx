import { RouterProvider } from 'react-router-dom';
import router from './router';

/**
 * App — root application component.
 * Provides the router context to the entire component tree.
 */
export default function App() {
  return <RouterProvider router={router} />;
}
