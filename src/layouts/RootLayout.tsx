import { Outlet } from 'react-router-dom';
import { PageLoaderProvider } from '../context/PageLoaderContext';

/**
 * RootLayout — top-level layout that wraps all application routes with PageLoaderProvider.
 * Listens to route transitions and renders the global spinning earth loader.
 */
export default function RootLayout() {
  return (
    <PageLoaderProvider>
      <Outlet />
    </PageLoaderProvider>
  );
}
