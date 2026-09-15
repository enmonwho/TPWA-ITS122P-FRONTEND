/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';
import EarthLoadingScreen from '../components/EarthLoadingScreen';

interface PageLoaderContextType {
  /** Manually trigger the spinning earth loading screen for a minimum duration */
  showLoader: (minDurationMs?: number) => void;
  /** Dismiss the loading screen with a smooth fade-out */
  hideLoader: () => void;
  /** Execute an async action while showing the spinning earth loader */
  triggerTransition: (
    action?: () => void | Promise<void>,
    minDurationMs?: number,
  ) => Promise<void>;
  /** Whether the loading screen is currently active */
  isLoading: boolean;
}

const PageLoaderContext = createContext<PageLoaderContextType | undefined>(undefined);

/**
 * Helper to determine if a route path belongs to the dashboard sub-ecosystem.
 */
function isDashboardPath(path: string): boolean {
  return path === '/dashboard' || path.startsWith('/dashboard/');
}

export function PageLoaderProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const prevPathRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    setFadingOut(true);
    fadeTimerRef.current = setTimeout(() => {
      setLoading(false);
      setFadingOut(false);
    }, 250);
  }, []);

  const show = useCallback(
    (minDurationMs = 550) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      setFadingOut(false);
      setLoading(true);

      timerRef.current = setTimeout(() => {
        hide();
      }, minDurationMs);
    },
    [hide],
  );

  const triggerTransition = useCallback(
    async (action?: () => void | Promise<void>, minDurationMs = 550) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      setFadingOut(false);
      setLoading(true);

      const startTime = Date.now();
      try {
        if (action) {
          await action();
        }
      } finally {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDurationMs - elapsed);
        timerRef.current = setTimeout(() => {
          hide();
        }, remaining);
      }
    },
    [hide],
  );

  // Monitor route changes
  useEffect(() => {
    const currentPath = location.pathname;
    const prevPath = prevPathRef.current;

    // Record initial route without showing transition loader
    if (prevPath === null) {
      prevPathRef.current = currentPath;
      return;
    }

    // Only update if path actually changed
    if (prevPath === currentPath) {
      return;
    }

    prevPathRef.current = currentPath;

    // Check if switching between two dashboard pages
    const isInternalDashboard = isDashboardPath(prevPath) && isDashboardPath(currentPath);

    // If switching between dashboard pages, bypass loader (instant transition)
    // Otherwise, show spinning earth transition loader
    if (!isInternalDashboard) {
      show(550);
    }
  }, [location.pathname, show]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  return (
    <PageLoaderContext.Provider
      value={{
        showLoader: show,
        hideLoader: hide,
        triggerTransition,
        isLoading: loading,
      }}
    >
      {children}
      {loading && <EarthLoadingScreen fadeOut={fadingOut} />}
    </PageLoaderContext.Provider>
  );
}

export function usePageLoader(): PageLoaderContextType {
  const context = useContext(PageLoaderContext);
  if (!context) {
    throw new Error('usePageLoader must be used within a PageLoaderProvider');
  }
  return context;
}
