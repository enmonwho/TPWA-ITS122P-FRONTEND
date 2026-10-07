import { RouterProvider } from 'react-router-dom';
import router from './router';
import { AuthProvider } from './context/AuthContext';
import VisitSessionTracker from './components/VisitSessionTracker';

/**
 * App — root application component.
 * Provides authentication and router context to the entire component tree.
 */
export default function App() {
  return (
    <AuthProvider>
      <VisitSessionTracker />
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
