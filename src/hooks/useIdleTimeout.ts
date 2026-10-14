import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

interface UseIdleTimeoutOptions {
  idleTimeMs?: number; // Time before warning modal shows (default: 15 mins)
  countdownSec?: number; // Countdown duration in seconds (default: 60s)
  onLogout?: () => void;
}

export function useIdleTimeout({
  idleTimeMs = 15 * 60 * 1000, // 15 minutes
  countdownSec = 60,
  onLogout,
}: UseIdleTimeoutOptions = {}) {
  const { user, logout } = useAuth();
  const [isIdleWarningOpen, setIsIdleWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(countdownSec);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const performLogout = useCallback(() => {
    setIsIdleWarningOpen(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (onLogout) {
      onLogout();
    } else {
      logout();
    }
  }, [logout, onLogout]);

  const resetTimer = useCallback(() => {
    if (!user) return;

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    setIsIdleWarningOpen(false);
    setRemainingSeconds(countdownSec);

    idleTimerRef.current = setTimeout(() => {
      setIsIdleWarningOpen(true);
      setRemainingSeconds(countdownSec);

      countdownIntervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            performLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, idleTimeMs);
  }, [user, idleTimeMs, countdownSec, performLogout]);

  useEffect(() => {
    if (!user) {
      setIsIdleWarningOpen(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      return;
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => {
      // Only reset automatically if warning modal is not active
      if (!isIdleWarningOpen) {
        resetTimer();
      }
    };

    resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [user, isIdleWarningOpen, resetTimer]);

  const stayLoggedIn = () => {
    resetTimer();
  };

  return {
    isIdleWarningOpen,
    remainingSeconds,
    stayLoggedIn,
    performLogout,
  };
}
