/* ==========================================================================
   EXPRESS SERVER - CYBERSECURITY PORTFOLIO BACKEND
   Secure Admin Authentication & Session Management
   ========================================================================== */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
require('dotenv').config();

const dataStore = require('./dataStore');
const {
  SESSION_TIMEOUT_MS,
  ADMIN_EMAIL,
  authenticateAdmin,
  changeAdminPassword,
  generateCsrfToken,
  adminCacheControl,
  requireAdminAuth
} = require('./authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || 'cybersecurity_soc_session_secret_gokul_2026_!@#$%^';

// --------------------------------------------------------------------------
// 1. CORS Configuration (Allows credentials & secure headers)
// --------------------------------------------------------------------------
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or in whitelist
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed for this origin: ' + origin));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'XSRF-TOKEN', 'X-Requested-With'],
  exposedHeaders: ['X-CSRF-Token']
}));

// --------------------------------------------------------------------------
// 2. Request Parsers & Cookie Parser
// --------------------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(sessionSecret));

// --------------------------------------------------------------------------
// 3. Secure Session Middleware
//    - Session Cookie: no maxAge means it expires when the browser is closed.
//    - Inactivity timeout: enforced server-side via req.session.lastActivity.
//    - HttpOnly & SameSite: protects against XSS token extraction & CSRF.
// --------------------------------------------------------------------------
app.use(session({
  name: '__Secure_admin_sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // Inaccessible to JavaScript
    secure: isProd, // HTTPS only in production, false for local dev
    sameSite: isProd ? 'strict' : 'lax', // CSRF defense
    path: '/'
    // Note: maxAge is omitted intentionally so browsers treat this as a SESSION COOKIE.
    // The cookie is deleted automatically when the browser process closes.
  }
}));

// --------------------------------------------------------------------------
// 4. Public Endpoints
// --------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Cybersecurity portfolio backend is running.',
    timestamp: new Date().toISOString()
  });
});

// Public read-only portfolio data
app.get('/api/portfolio', (req, res) => {
  const data = dataStore.getAll();
  res.status(200).json(data);
});

// Contact endpoint stub
app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Please provide name, email, and message.' });
  }
  // Log message receipt
  console.log(`[Contact Form Received] From: ${name} <${email}> Subject: ${subject}`);
  res.status(200).json({ success: true, message: 'Message received successfully.' });
});

// --------------------------------------------------------------------------
// 5. Admin Authentication & Session Lifecycle Endpoints
// --------------------------------------------------------------------------

/**
 * POST /api/admin/login
 * - Authenticates admin credentials
 * - Regenerates session ID to prevent session fixation attacks
 * - Generates cryptographically secure CSRF token
 * - Sets server session state with lastActivity timestamp
 */
app.post('/api/admin/login', adminCacheControl, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required.',
      code: 'MISSING_CREDENTIALS'
    });
  }

  const isValid = authenticateAdmin(email, password);
  if (!isValid) {
    return res.status(401).json({
      error: 'Invalid admin credentials. Access restricted.',
      code: 'INVALID_CREDENTIALS'
    });
  }

  // Regenerate session to prevent session fixation
  req.session.regenerate((err) => {
    if (err) {
      console.error('[Session Regenerate Error]:', err);
      return res.status(500).json({ error: 'Failed to initialize secure session.' });
    }

    const csrfToken = generateCsrfToken();
    req.session.user = {
      email: ADMIN_EMAIL,
      displayName: 'Gokulakannan P',
      role: 'admin'
    };
    req.session.lastActivity = Date.now();
    req.session.csrfToken = csrfToken;

    // Send CSRF token in response and header
    res.setHeader('X-CSRF-Token', csrfToken);
    res.status(200).json({
      success: true,
      user: req.session.user,
      csrfToken,
      expiresInMs: SESSION_TIMEOUT_MS,
      message: 'Admin authentication successful.'
    });
  });
});

/**
 * GET /api/admin/session
 * - Validates current session status
 * - Enforces server-side inactivity timeout (15 mins)
 * - Returns remaining inactivity time for warning dialog
 */
app.get('/api/admin/session', adminCacheControl, (req, res) => {
  if (!req.session || !req.session.user || req.session.user.role !== 'admin') {
    return res.status(401).json({
      authenticated: false,
      code: 'NOT_AUTHENTICATED'
    });
  }

  const now = Date.now();
  const lastActivity = req.session.lastActivity || now;
  const timeElapsed = now - lastActivity;

  // Enforce Inactivity Timeout
  if (timeElapsed > SESSION_TIMEOUT_MS) {
    req.session.destroy(() => {
      res.clearCookie('__Secure_admin_sid', {
        path: '/',
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'strict' : 'lax'
      });
      return res.status(401).json({
        authenticated: false,
        code: 'SESSION_EXPIRED',
        message: 'Your session has expired due to inactivity. Please log in again.'
      });
    });
    return;
  }

  const remainingMs = Math.max(0, SESSION_TIMEOUT_MS - timeElapsed);

  res.setHeader('X-CSRF-Token', req.session.csrfToken);
  res.status(200).json({
    authenticated: true,
    user: req.session.user,
    csrfToken: req.session.csrfToken,
    remainingMs,
    timeoutMs: SESSION_TIMEOUT_MS
  });
});

/**
 * POST /api/admin/keep-alive
 * - Resets inactivity timer when admin clicks "Stay Logged In"
 */
app.post('/api/admin/keep-alive', adminCacheControl, requireAdminAuth, (req, res) => {
  req.session.lastActivity = Date.now();
  res.status(200).json({
    success: true,
    remainingMs: SESSION_TIMEOUT_MS,
    message: 'Session refreshed.'
  });
});

/**
 * POST /api/admin/logout
 * - Securely invalidates server-side session
 * - Clears HttpOnly session cookie
 */
app.post('/api/admin/logout', adminCacheControl, (req, res) => {
  const clearCookieOptions = {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax'
  };

  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('[Logout Error]:', err);
      }
      res.clearCookie('__Secure_admin_sid', clearCookieOptions);
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
      });
    });
  } else {
    res.clearCookie('__Secure_admin_sid', clearCookieOptions);
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  }
});

// --------------------------------------------------------------------------
// 6. Protected Admin Data Endpoints
//    - Every endpoint requires valid admin session
//    - Mutating endpoints require valid CSRF token
// --------------------------------------------------------------------------
app.use('/api/admin', adminCacheControl);

app.get('/api/admin/data', requireAdminAuth, (req, res) => {
  res.status(200).json(dataStore.getAll());
});

app.post('/api/admin/save-about', requireAdminAuth, (req, res) => {
  const updated = dataStore.updateAbout(req.body);
  res.status(200).json({ success: true, about: updated });
});

app.post('/api/admin/save-project', requireAdminAuth, (req, res) => {
  const saved = dataStore.saveProject(req.body);
  res.status(200).json({ success: true, project: saved });
});

app.delete('/api/admin/project/:id', requireAdminAuth, (req, res) => {
  const success = dataStore.deleteProject(req.params.id);
  res.status(200).json({ success });
});

app.post('/api/admin/save-cert', requireAdminAuth, (req, res) => {
  const saved = dataStore.saveCert(req.body);
  res.status(200).json({ success: true, cert: saved });
});

app.delete('/api/admin/cert/:id', requireAdminAuth, (req, res) => {
  const success = dataStore.deleteCert(req.params.id);
  res.status(200).json({ success });
});

app.post('/api/admin/save-skill', requireAdminAuth, (req, res) => {
  const saved = dataStore.saveSkillCategory(req.body);
  res.status(200).json({ success: true, category: saved });
});

app.delete('/api/admin/skill/:id', requireAdminAuth, (req, res) => {
  const success = dataStore.deleteSkillCategory(req.params.id);
  res.status(200).json({ success });
});

app.post('/api/admin/save-achievement', requireAdminAuth, (req, res) => {
  const saved = dataStore.saveAchievement(req.body);
  res.status(200).json({ success: true, achievement: saved });
});

app.delete('/api/admin/achievement/:id', requireAdminAuth, (req, res) => {
  const success = dataStore.deleteAchievement(req.params.id);
  res.status(200).json({ success });
});

app.post('/api/admin/change-password', requireAdminAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Please provide both current and new password.' });
  }

  const result = changeAdminPassword(currentPassword, newPassword);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.status(200).json({
    success: true,
    message: result.message
  });
});

// --------------------------------------------------------------------------
// 7. Undefined Route Handler
// --------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// --------------------------------------------------------------------------
// 8. Start Server
// --------------------------------------------------------------------------
const server = app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`[Security Console] Server started on port ${PORT}`);
  console.log(`Inactivity Timeout: ${SESSION_TIMEOUT_MS / 1000 / 60} minutes`);
  console.log(`Session Cookie: __Secure_admin_sid (Session-Only, HttpOnly, SameSite)`);
  console.log(`CSRF Protection: Synchronizer Token Active`);
  console.log(`Health Check: http://localhost:${PORT}/api/health`);
  console.log(`==================================================`);
});

module.exports = { app, server };
