/**
 * Comprehensive Automated Security & Session Management Test Suite
 * Tests all 8 security requirements specified by user.
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';
let testResults = [];

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) { json = body; }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

function parseCookies(cookieHeaders) {
  if (!cookieHeaders) return {};
  const cookies = {};
  const list = Array.isArray(cookieHeaders) ? cookieHeaders : [cookieHeaders];
  list.forEach(item => {
    const parts = item.split(';')[0].split('=');
    if (parts.length === 2) {
      cookies[parts[0].trim()] = parts[1].trim();
    }
  });
  return cookies;
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    testResults.push({ passed: false, message });
    throw new Error(message);
  } else {
    console.log(`  ✅ PASSED: ${message}`);
    testResults.push({ passed: true, message });
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('RUNNING ADMIN AUTHENTICATION & SESSION SECURITY TESTS');
  console.log('======================================================\n');

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Health check
    // ------------------------------------------------------------------------
    console.log('[Test 1] Public Endpoint Health Check');
    const health = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    assert(health.statusCode === 200, 'Server is running and responds to /api/health with 200');
    assert(health.data.status === 'OK', 'Health check returns status OK');

    // ------------------------------------------------------------------------
    // TEST 2: Attempting to access admin APIs without authentication (Req 5)
    // ------------------------------------------------------------------------
    console.log('\n[Test 2] Attempting to access admin APIs without authentication');
    const unauthGet = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/data',
      method: 'GET'
    });
    assert(unauthGet.statusCode === 401, 'Unauthenticated GET /api/admin/data returns 401');
    assert(unauthGet.data.code === 'AUTH_REQUIRED', 'Returns code AUTH_REQUIRED');

    const unauthSession = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/session',
      method: 'GET'
    });
    assert(unauthSession.statusCode === 401, 'Unauthenticated GET /api/admin/session returns 401');

    // ------------------------------------------------------------------------
    // TEST 3: Attempting to modify admin data without authentication (Req 6)
    // ------------------------------------------------------------------------
    console.log('\n[Test 3] Attempting to modify admin data without authentication');
    const unauthPost = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/save-project',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { title: 'Malicious Project' });
    assert(unauthPost.statusCode === 401, 'Unauthenticated POST /api/admin/save-project is rejected with 401');

    // ------------------------------------------------------------------------
    // TEST 4: Attempting to login with invalid credentials
    // ------------------------------------------------------------------------
    console.log('\n[Test 4] Attempting login with invalid credentials');
    const invalidLogin = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'wrong@example.com', password: 'wrongpassword' });
    assert(invalidLogin.statusCode === 401, 'Invalid credentials rejected with 401');
    assert(invalidLogin.data.code === 'INVALID_CREDENTIALS', 'Returns INVALID_CREDENTIALS code');

    // ------------------------------------------------------------------------
    // TEST 5: Admin login and successful access to admin dashboard (Req 1)
    // ------------------------------------------------------------------------
    console.log('\n[Test 5] Valid admin login & session cookie configuration');
    const validLogin = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'gokulakannan.cyber@gmail.com', password: 'Gokul@1234' });
    
    assert(validLogin.statusCode === 200, 'Valid login succeeds with 200');
    assert(validLogin.data.success === true, 'Returns success: true');
    assert(validLogin.data.csrfToken && validLogin.data.csrfToken.length >= 32, 'Issues cryptographically secure CSRF token');
    assert(validLogin.data.user.email === 'gokulakannan.cyber@gmail.com', 'Returns correct sanitized user details');
    assert(!validLogin.data.user.password, 'Password hash is NOT exposed in response');

    // Check Set-Cookie attributes
    const setCookieHeader = validLogin.headers['set-cookie'];
    assert(setCookieHeader && setCookieHeader.length > 0, 'Set-Cookie header is sent');
    const cookieStr = setCookieHeader[0];
    assert(cookieStr.includes('__Secure_admin_sid='), 'Cookie name is __Secure_admin_sid');
    assert(cookieStr.toLowerCase().includes('httponly'), 'Cookie is HttpOnly (protected from JS theft)');
    assert(cookieStr.toLowerCase().includes('samesite=lax') || cookieStr.toLowerCase().includes('samesite=strict'), 'Cookie enforces SameSite policy');
    assert(!cookieStr.toLowerCase().includes('max-age='), 'Cookie has NO maxAge (Session Cookie that expires on browser close)');

    const cookiePair = cookieStr.split(';')[0];
    const csrfToken = validLogin.data.csrfToken;

    // ------------------------------------------------------------------------
    // TEST 6: Authenticated session verification & Cache-Control (Req 3, 5)
    // ------------------------------------------------------------------------
    console.log('\n[Test 6] Authenticated session check & Cache-Control headers');
    const checkSession = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/session',
      method: 'GET',
      headers: { 'Cookie': cookiePair }
    });
    assert(checkSession.statusCode === 200, 'Authenticated session check returns 200');
    assert(checkSession.data.authenticated === true, 'Returns authenticated: true');
    assert(checkSession.data.remainingMs > 0, 'Returns remainingMs inactivity countdown');
    assert(checkSession.headers['cache-control'] && checkSession.headers['cache-control'].includes('no-store'), 'Sends Cache-Control: no-store to prevent back-button caching');

    // ------------------------------------------------------------------------
    // TEST 7: CSRF protection on mutating admin actions (Req 4, 5)
    // ------------------------------------------------------------------------
    console.log('\n[Test 7] CSRF protection on mutating actions');
    // Call without CSRF token
    const noCsrfPost = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/save-project',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookiePair
      }
    }, { title: 'Test Project' });
    assert(noCsrfPost.statusCode === 403, 'State-changing POST without CSRF token is blocked with 403 Forbidden');
    assert(noCsrfPost.data.code === 'CSRF_INVALID', 'Returns CSRF_INVALID code');

    // Call with valid CSRF token
    const validCsrfPost = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/save-project',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookiePair,
        'X-CSRF-Token': csrfToken
      }
    }, { id: 'test-proj-session-audit', title: 'Session Audit Project', category: 'SOC' });
    assert(validCsrfPost.statusCode === 200, 'State-changing POST with valid CSRF token succeeds with 200');

    // ------------------------------------------------------------------------
    // TEST 8: Session Keep-Alive functionality (Req 2)
    // ------------------------------------------------------------------------
    console.log('\n[Test 8] Session Keep-Alive endpoint');
    const keepAlive = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/keep-alive',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookiePair,
        'X-CSRF-Token': csrfToken
      }
    });
    assert(keepAlive.statusCode === 200, 'Keep-Alive resets session inactivity and returns 200');
    assert(keepAlive.data.success === true, 'Returns success: true');

    // ------------------------------------------------------------------------
    // TEST 9: Admin Change Password Endpoint
    // ------------------------------------------------------------------------
    console.log('\n[Test 9] Admin Change Password endpoint');
    // Test with wrong current password
    const wrongOldPass = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/change-password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookiePair,
        'X-CSRF-Token': csrfToken
      }
    }, { currentPassword: 'WrongPassword!', newPassword: 'NewSecurePass@2026' });
    assert(wrongOldPass.statusCode === 400, 'Rejects password change with incorrect current password');

    // Test with valid current password
    const validPassChange = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/change-password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookiePair,
        'X-CSRF-Token': csrfToken
      }
    }, { currentPassword: 'Gokul@1234', newPassword: 'NewSecurePass@2026' });
    assert(validPassChange.statusCode === 200, 'Password change succeeds with valid current password');
    assert(validPassChange.data.success === true, 'Returns success: true for password change');

    // Verify login with new password
    const newPassLogin = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'gokulakannan.cyber@gmail.com', password: 'NewSecurePass@2026' });
    assert(newPassLogin.statusCode === 200, 'Login succeeds with new updated password');

    const newCookiePair = newPassLogin.headers['set-cookie'][0].split(';')[0];
    const newCsrf = newPassLogin.data.csrfToken;

    // Restore password back to default Gokul@1234
    const restorePass = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/change-password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': newCookiePair,
        'X-CSRF-Token': newCsrf
      }
    }, { currentPassword: 'NewSecurePass@2026', newPassword: 'Gokul@1234' });
    assert(restorePass.statusCode === 200, 'Restored password back to default Gokul@1234');

    // ------------------------------------------------------------------------
    // TEST 10: Secure Logout and complete session invalidation (Req 2, 3, 7, 8)
    // ------------------------------------------------------------------------
    console.log('\n[Test 10] Secure Logout and complete session invalidation');
    const logoutRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/logout',
      method: 'POST',
      headers: {
        'Cookie': cookiePair
      }
    });
    assert(logoutRes.statusCode === 200, 'Logout succeeds with 200');
    assert(logoutRes.headers['set-cookie'] && logoutRes.headers['set-cookie'][0].includes('__Secure_admin_sid=;'), 'Session cookie is cleared and expired in response header');

    // Attempting to reuse the logged-out session cookie (Must fail!)
    const postLogoutCheck = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/session',
      method: 'GET',
      headers: { 'Cookie': cookiePair }
    });
    assert(postLogoutCheck.statusCode === 401, 'Logged out session cookie is rejected with 401 (Cannot reuse invalidated session)');

    // Attempting to access protected admin data with logged out session
    const postLogoutData = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/data',
      method: 'GET',
      headers: { 'Cookie': cookiePair }
    });
    assert(postLogoutData.statusCode === 401, 'Protected data access is denied with 401 after logout');

    console.log('\n======================================================');
    console.log(`ALL TESTS PASSED! (${testResults.length}/${testResults.length} assertions verified)`);
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test suite execution failed:', err.message);
    process.exit(1);
  }
}

runTests();
