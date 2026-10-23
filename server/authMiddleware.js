const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes inactivity timeout
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'gokulakannan.cyber@gmail.com').toLowerCase().trim();
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Gokul@1234';

const DATA_DIR = path.join(__dirname, 'data');
const AUTH_FILE = path.join(DATA_DIR, 'adminAuth.json');

// Secure Password Hashing with scrypt (OWASP Recommended)
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(key, 'hex'));
  } catch (err) {
    return false;
  }
}

// Load or initialize stored password hash
let currentAdminHash = null;

function loadAdminPasswordHash() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(AUTH_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
      if (data.adminHashedPassword) {
        currentAdminHash = data.adminHashedPassword;
        return currentAdminHash;
      }
    } catch (e) {
      console.warn('[Auth] Failed to parse adminAuth.json, initializing defaults:', e.message);
    }
  }

  currentAdminHash = hashPassword(DEFAULT_ADMIN_PASSWORD);
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({
      adminHashedPassword: currentAdminHash,
      updatedAt: new Date().toISOString()
    }, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Auth] Failed to write initial adminAuth.json:', err.message);
  }
  return currentAdminHash;
}

// Initialize on load
currentAdminHash = loadAdminPasswordHash();

/**
 * Verify admin credentials securely
 */
function authenticateAdmin(email, password) {
  if (!email || !password) return false;
  const normalizedEmail = email.toLowerCase().trim();
  if (normalizedEmail !== ADMIN_EMAIL) return false;
  return verifyPassword(password, currentAdminHash);
}

/**
 * Change admin password and persist hash
 */
function changeAdminPassword(currentPassword, newPassword) {
  if (!verifyPassword(currentPassword, currentAdminHash)) {
    return { success: false, error: 'Current password is incorrect.' };
  }
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  currentAdminHash = hashPassword(newPassword);
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify({
      adminHashedPassword: currentAdminHash,
      updatedAt: new Date().toISOString()
    }, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Auth] Failed to save updated password:', err);
    return { success: false, error: 'Failed to persist updated password on server.' };
  }

  return { success: true, message: 'Admin password updated successfully.' };
}

/**
 * Generate cryptographically secure CSRF token
 */
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware: Strictly prevent caching on sensitive Admin responses
 */
function adminCacheControl(req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}

/**
 * Middleware: Validate Admin Session and Inactivity Timeout
 */
function requireAdminAuth(req, res, next) {
  // 1. Validate session existence and admin role
  if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    return res.status(401).json({
      error: 'Unauthorized. Admin authentication required.',
      authenticated: false,
      code: 'AUTH_REQUIRED'
    });
  }

  // 2. Validate Inactivity Timeout (15 minutes)
  const now = Date.now();
  const lastActivity = req.session.lastActivity || now;
  if (now - lastActivity > SESSION_TIMEOUT_MS) {
    const isProd = process.env.NODE_ENV === 'production';
    req.session.destroy(() => {
      res.clearCookie('__Secure_admin_sid', {
        path: '/',
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'strict' : 'lax'
      });
      return res.status(401).json({
        error: 'Your session has expired due to inactivity. Please log in again.',
        authenticated: false,
        code: 'SESSION_EXPIRED'
      });
    });
    return;
  }

  // 3. CSRF Validation on State-Changing HTTP Methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const clientToken = 
      req.headers['x-csrf-token'] || 
      req.headers['xsrf-token'] || 
      req.body?._csrf;

    if (!clientToken || clientToken !== req.session.csrfToken) {
      return res.status(403).json({
        error: 'Forbidden. Invalid or missing CSRF token.',
        code: 'CSRF_INVALID'
      });
    }
  }

  // 4. Update lastActivity timestamp upon successful authorization
  req.session.lastActivity = now;
  next();
}

module.exports = {
  SESSION_TIMEOUT_MS,
  ADMIN_EMAIL,
  authenticateAdmin,
  changeAdminPassword,
  generateCsrfToken,
  adminCacheControl,
  requireAdminAuth
};
