import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { authService } from '../services/auth';
import InactivityModal from '../components/InactivityModal';

const AuthContext = createContext({
  user: null,
  loading: true,
  csrfToken: null,
  sessionExpiredMessage: null,
  setSessionExpiredMessage: () => {},
  login: async () => {},
  logout: async () => {},
  checkSession: async () => {},
  stayLoggedIn: async () => {},
  isConfigured: true
});

const INACTIVITY_TIMEOUT_SECONDS = 15 * 60; // 15 minutes (900 seconds)
const WARNING_THRESHOLD_SECONDS = 13 * 60;  // Show warning at 13 minutes (120 seconds left)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState(null);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(null);

  // Inactivity warning state
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [countdown, setCountdown] = useState(120);

  const lastActivityRef = useRef(Date.now());
  const isWarningActiveRef = useRef(false);

  // Synchronize ref with state
  useEffect(() => {
    isWarningActiveRef.current = inactivityWarning;
  }, [inactivityWarning]);

  /**
   * Check session with backend server
   */
  const checkSession = useCallback(async () => {
    try {
      const result = await authService.checkSession();
      if (result.authenticated && result.user) {
        setUser(result.user);
        setCsrfToken(result.csrfToken);
        lastActivityRef.current = Date.now();
        return result.user;
      } else {
        setUser(null);
        setCsrfToken(null);
        if (result.code === 'SESSION_EXPIRED') {
          setSessionExpiredMessage('Your session has expired. Please log in again.');
        }
        return null;
      }
    } catch (err) {
      setUser(null);
      setCsrfToken(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Admin Login handler
   */
  const login = async (email, password) => {
    setLoading(true);
    setSessionExpiredMessage(null);
    try {
      const result = await authService.login(email, password);
      setUser(result.user);
      setCsrfToken(result.csrfToken);
      lastActivityRef.current = Date.now();
      setInactivityWarning(false);
      return result.user;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Secure Admin Logout handler
   */
  const logout = useCallback(async (isExpired = false) => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setCsrfToken(null);
      setInactivityWarning(false);
      if (isExpired) {
        setSessionExpiredMessage('Your session has expired. Please log in again.');
      }
    }
  }, []);

  /**
   * Keep-Alive to extend active session
   */
  const stayLoggedIn = async () => {
    try {
      await authService.keepAlive();
      lastActivityRef.current = Date.now();
      setInactivityWarning(false);
    } catch (err) {
      console.warn('Failed to refresh session:', err);
    }
  };

  // Activity listener: track user interaction to reset idle timer
  const recordActivity = useCallback(() => {
    // Only reset timer if warning modal is not currently actively prompting the user
    if (!isWarningActiveRef.current) {
      lastActivityRef.current = Date.now();
    }
  }, []);

  // Set up event listeners for user activity
  useEffect(() => {
    if (!user) return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(evt => window.addEventListener(evt, recordActivity, { passive: true }));

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, recordActivity));
    };
  }, [user, recordActivity]);

  // Periodic inactivity checker (runs every second when logged in)
  useEffect(() => {
    if (!user) {
      setInactivityWarning(false);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastActivityRef.current) / 1000);

      // Exceeded 15 minutes: Auto-Logout
      if (elapsedSeconds >= INACTIVITY_TIMEOUT_SECONDS) {
        clearInterval(interval);
        setInactivityWarning(false);
        logout(true);
      }
      // Between 13 and 15 minutes: Show warning countdown
      else if (elapsedSeconds >= WARNING_THRESHOLD_SECONDS) {
        const remaining = Math.max(0, INACTIVITY_TIMEOUT_SECONDS - elapsedSeconds);
        setInactivityWarning(true);
        setCountdown(remaining);
      } else {
        if (isWarningActiveRef.current) {
          setInactivityWarning(false);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, logout]);

  // Initial check on mount and BFCache (back/forward cache) restoration check
  useEffect(() => {
    checkSession();

    const handlePageShow = (e) => {
      // If page is restored from browser back-forward cache, verify session immediately
      if (e.persisted) {
        checkSession();
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [checkSession]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      csrfToken,
      sessionExpiredMessage,
      setSessionExpiredMessage,
      login,
      logout,
      checkSession,
      stayLoggedIn,
      isConfigured: true
    }}>
      {children}
      {user && (
        <InactivityModal
          isOpen={inactivityWarning}
          countdown={countdown}
          onStayLoggedIn={stayLoggedIn}
          onLogout={() => logout(false)}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
