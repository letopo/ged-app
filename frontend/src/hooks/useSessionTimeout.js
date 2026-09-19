// frontend/src/hooks/useSessionTimeout.js
import { useState, useEffect, useRef, useCallback } from 'react';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE = 2 * 60 * 1000;   // Avertissement 2 min avant

export default function useSessionTimeout(isAuthenticated, logout) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const countdownRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const clearTimers = useCallback(() => {
    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);
    clearInterval(countdownRef.current);
  }, []);

  const handleLogout = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    logout();
  }, [clearTimers, logout]);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated) return;
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    clearTimers();

    // Warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      const expireAt = Date.now() + WARNING_BEFORE;
      countdownRef.current = setInterval(() => {
        const left = Math.max(0, Math.round((expireAt - Date.now()) / 1000));
        setRemainingSeconds(left);
        if (left <= 0) {
          clearInterval(countdownRef.current);
        }
      }, 1000);
    }, SESSION_TIMEOUT - WARNING_BEFORE);

    // Logout timer
    timeoutRef.current = setTimeout(handleLogout, SESSION_TIMEOUT);
  }, [isAuthenticated, clearTimers, handleLogout]);

  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    resetTimer();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const onActivity = () => {
      // Ne pas reset si le warning est deja affiche (l'utilisateur doit cliquer le bouton)
      if (!showWarning) {
        resetTimer();
      }
    };

    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));

    return () => {
      clearTimers();
      events.forEach(e => window.removeEventListener(e, onActivity));
    };
  }, [isAuthenticated, resetTimer, clearTimers, showWarning]);

  return { showWarning, remainingSeconds, extendSession, handleLogout };
}
