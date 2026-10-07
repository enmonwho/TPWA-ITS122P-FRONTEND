import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { STORAGE_KEYS } from '../lib/constants';
import { getOrCreateVisitorId } from '../lib/visitSession';
import { visitSessionsApi } from '../services/api';

const HEARTBEAT_INTERVAL_MS = 60_000;

function readStoredSessionId(): number | null {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEYS.VISIT_SESSION_ID));
    return Number.isSafeInteger(stored) && stored > 0 ? stored : null;
  } catch {
    return null;
  }
}

export default function VisitSessionTracker() {
  const { user, isLoading } = useAuth();
  const [visitorId] = useState(getOrCreateVisitorId);
  const sessionId = useRef<number | null>(readStoredSessionId());

  const saveSessionId = useCallback((id: number) => {
    sessionId.current = id;
    try {
      localStorage.setItem(STORAGE_KEYS.VISIT_SESSION_ID, String(id));
    } catch {
      // The in-memory ID is sufficient until the page is reloaded.
    }
  }, []);

  const startVisit = useCallback(async () => {
    try {
      const session = await visitSessionsApi.start(visitorId);
      saveSessionId(session.session_id);
    } catch {
      // Keep site browsing available when visit telemetry is temporarily unavailable.
    }
  }, [saveSessionId, visitorId]);

  const heartbeat = useCallback(async () => {
    if (document.visibilityState !== 'visible') return;
    const currentId = sessionId.current;
    if (!currentId) {
      await startVisit();
      return;
    }
    try {
      const session = await visitSessionsApi.heartbeat(visitorId, currentId);
      saveSessionId(session.session_id);
    } catch {
      // The next heartbeat retries without interrupting the page.
    }
  }, [saveSessionId, startVisit, visitorId]);

  useEffect(() => {
    if (isLoading) return undefined;
    void startVisit();

    const intervalId = window.setInterval(() => void heartbeat(), HEARTBEAT_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void heartbeat();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handleVisibility);
    };
  }, [heartbeat, isLoading, startVisit, user?.id]);

  return null;
}
