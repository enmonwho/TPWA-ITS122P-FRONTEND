import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components';
import App from './App';
import './index.css';

/* ------------------------------------------------------------------ */
/*  One-time cleanup of mock-auth localStorage artifacts               */
/*  Only runs when the real backend is active (VITE_USE_MOCK_AUTH≠true) */
/* ------------------------------------------------------------------ */
if (import.meta.env.VITE_USE_MOCK_AUTH !== 'true') {
  const MOCK_KEYS = ['lakbye_mock_users', 'lakbye_mock_session'] as const;

  for (const key of MOCK_KEYS) {
    if (localStorage.getItem(key) !== null) {
      console.warn(
        `[mock-cleanup] Removing leftover mock key "${key}" from localStorage.`,
      );
      localStorage.removeItem(key);
    }
  }

  // Warn about potential trip-data collision but do NOT auto-delete
  const tripKeys = Object.keys(localStorage).filter((k) => k.startsWith('lakbye_trips_'));
  if (tripKeys.length > 0) {
    console.warn(
      '[mock-cleanup] Found localStorage trip keys that may contain mock data:',
      tripKeys,
      '\nThese were NOT auto-cleared because real user trips use the same key pattern.',
      '\nManually run: tripKeys.forEach(k => localStorage.removeItem(k))',
    );
  }
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
