/**
 * SECURE ADMIN AUTHENTICATION SERVICE
 * Backed by HTTP-Only Cookies, Server-Side Sessions, and CSRF Protection.
 * Strictly avoids long-lived admin authentication tokens in localStorage.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Transient In-Memory State (Never persisted to localStorage to prevent token theft)
let inMemoryCsrfToken = null;
let currentAdminUser = null;

// Clean up legacy localStorage auth keys if present
try {
  localStorage.removeItem('portfolio_admin_session');
} catch (e) {
  // Ignore
}

export const authService = {
  isConfigured: true,

  getCsrfToken: () => inMemoryCsrfToken,
  setCsrfToken: (token) => {
    inMemoryCsrfToken = token;
  },

  getCurrentUser: () => currentAdminUser,

  /**
   * Authenticate admin via backend API
   * Generates HttpOnly session cookie on backend and returns sanitized user + CSRF token
   */
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Sends & receives HttpOnly session cookies
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify your credentials.');
      }

      currentAdminUser = data.user;
      inMemoryCsrfToken = data.csrfToken;

      // Mark tab session active in sessionStorage (clears automatically when tab/browser closes)
      sessionStorage.setItem('admin_session_active', 'true');

      return {
        user: data.user,
        csrfToken: data.csrfToken,
        expiresInMs: data.expiresInMs
      };
    } catch (err) {
      currentAdminUser = null;
      inMemoryCsrfToken = null;
      sessionStorage.removeItem('admin_session_active');
      throw err;
    }
  },

  /**
   * Check session status with the backend
   * Validates backend session cookie and inactivity window
   */
  checkSession: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/session`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        currentAdminUser = null;
        inMemoryCsrfToken = null;
        sessionStorage.removeItem('admin_session_active');
        return {
          authenticated: false,
          code: errData.code || 'UNAUTHENTICATED',
          message: errData.message
        };
      }

      const data = await response.json();
      currentAdminUser = data.user;
      inMemoryCsrfToken = data.csrfToken;
      sessionStorage.setItem('admin_session_active', 'true');

      return {
        authenticated: true,
        user: data.user,
        csrfToken: data.csrfToken,
        remainingMs: data.remainingMs,
        timeoutMs: data.timeoutMs
      };
    } catch (err) {
      currentAdminUser = null;
      inMemoryCsrfToken = null;
      sessionStorage.removeItem('admin_session_active');
      return {
        authenticated: false,
        code: 'NETWORK_ERROR',
        message: 'Unable to reach authentication server.'
      };
    }
  },

  /**
   * Keep-Alive to reset server inactivity timer
   */
  keepAlive: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/keep-alive`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': inMemoryCsrfToken || ''
        }
      });
      return await response.json();
    } catch (err) {
      console.warn('[AuthService] Keep-alive failed:', err);
      return null;
    }
  },

  /**
   * Secure Logout: Invalidate server-side session and clear session cookies
   */
  logout: async () => {
    try {
      await fetch(`${API_BASE_URL}/admin/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': inMemoryCsrfToken || ''
        }
      });
    } catch (err) {
      console.warn('[AuthService] Logout request warning:', err);
    } finally {
      currentAdminUser = null;
      inMemoryCsrfToken = null;
      sessionStorage.removeItem('admin_session_active');
      localStorage.removeItem('portfolio_admin_session');
    }
  }
};
