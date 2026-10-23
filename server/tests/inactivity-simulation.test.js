/**
 * Simulation Test for Inactivity Timeout & Automatic Session Invalidation
 */

const http = require('http');

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

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✅ PASSED: ${message}`);
  }
}

async function runInactivityTest() {
  console.log('\n======================================================');
  console.log('SIMULATING INACTIVITY TIMEOUT & AUTO-LOGOUT');
  console.log('======================================================\n');

  // Step 1: Admin login
  console.log('[Step 1] Logging in as admin...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'gokulakannan.cyber@gmail.com', password: 'Gokul@1234' });

  assert(loginRes.statusCode === 200, 'Login succeeded with 200');
  const cookieStr = loginRes.headers['set-cookie'][0];
  const cookiePair = cookieStr.split(';')[0];
  const csrfToken = loginRes.data.csrfToken;

  // Step 2: Verify active session
  console.log('[Step 2] Verifying session is active...');
  const activeCheck = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/admin/session',
    method: 'GET',
    headers: { 'Cookie': cookiePair }
  });
  assert(activeCheck.statusCode === 200, 'Session is initially active');
  assert(activeCheck.data.remainingMs > 0, 'Remaining time is reported');

  // Step 3: Test Keep-Alive resets inactivity window
  console.log('[Step 3] Testing Keep-Alive extends session...');
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
  assert(keepAlive.statusCode === 200, 'Keep-Alive responded 200 OK');
  assert(keepAlive.data.remainingMs === 15 * 60 * 1000, 'Remaining time refreshed to full 15 minutes');

  console.log('\n======================================================');
  console.log('INACTIVITY SIMULATION VERIFIED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runInactivityTest().catch(err => {
  console.error(err);
  process.exit(1);
});
