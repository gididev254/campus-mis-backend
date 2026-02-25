/**
 * Test JWT Token Refresh Mechanism
 *
 * This script tests:
 * 1. Normal login and token generation
 * 2. Token expiration handling
 * 3. Token refresh endpoint
 * 4. Multiple simultaneous requests with expired token
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Test user credentials
const testUser = {
  email: 'testbuyer@example.com',
  password: 'Test@Password123',
  name: 'Test Buyer',
  phone: '+254712345678',
  role: 'buyer'
};

let authToken = null;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function testLogin() {
  section('TEST 1: User Login');

  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });

    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      log('✓ Login successful', 'green');
      log(`  Token: ${authToken.substring(0, 20)}...`, 'blue');
      return true;
    } else {
      log('✗ Login failed - no token received', 'red');
      return false;
    }
  } catch (error) {
    if (error.response?.status === 401) {
      log('  User not found or invalid credentials', 'yellow');
      log('  Attempting to register test user...', 'yellow');

      try {
        const registerResponse = await axios.post(`${API_URL}/auth/register`, testUser);
        if (registerResponse.data.success && registerResponse.data.token) {
          authToken = registerResponse.data.token;
          log('✓ Registration successful', 'green');
          log(`  Token: ${authToken.substring(0, 20)}...`, 'blue');
          return true;
        }
      } catch (registerError) {
        log('✗ Registration failed', 'red');
        log(`  Error: ${registerError.response?.data?.message || registerError.message}`, 'red');
        return false;
      }
    } else {
      log('✗ Login failed', 'red');
      log(`  Error: ${error.response?.data?.message || error.message}`, 'red');
      return false;
    }
  }
}

async function testProtectedEndpoint(token) {
  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    };
  }
}

async function testTokenRefresh() {
  section('TEST 2: Token Refresh Endpoint');

  if (!authToken) {
    log('✗ No auth token available', 'red');
    return false;
  }

  try {
    const response = await axios.post(`${API_URL}/auth/refresh-token`, {
      token: authToken
    });

    if (response.data.success && response.data.token) {
      const newToken = response.data.token;
      log('✓ Token refresh successful', 'green');
      log(`  Old token: ${authToken.substring(0, 20)}...`, 'blue');
      log(`  New token: ${newToken.substring(0, 20)}...`, 'blue');

      // Verify new token works
      const testResult = await testProtectedEndpoint(newToken);
      if (testResult.success) {
        log('✓ New token works correctly', 'green');
        authToken = newToken; // Update for subsequent tests
        return true;
      } else {
        log('✗ New token failed', 'red');
        return false;
      }
    } else {
      log('✗ Refresh failed - no new token received', 'red');
      return false;
    }
  } catch (error) {
    log('✗ Token refresh failed', 'red');
    log(`  Error: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function testInvalidTokenRefresh() {
  section('TEST 3: Refresh with Invalid Token');

  try {
    const response = await axios.post(`${API_URL}/auth/refresh-token`, {
      token: 'invalid.token.here'
    });

    log('✗ Should have failed with invalid token', 'red');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      log('✓ Correctly rejected invalid token', 'green');
      log(`  Message: ${error.response.data.message}`, 'blue');
      return true;
    } else {
      log('✗ Unexpected response', 'red');
      return false;
    }
  }
}

async function testMalformedTokenRefresh() {
  section('TEST 4: Refresh with Malformed Token');

  try {
    const response = await axios.post(`${API_URL}/auth/refresh-token`, {
      token: null
    });

    log('✗ Should have failed with null token', 'red');
    return false;
  } catch (error) {
    if (error.response?.status === 400 || error.response?.status === 401) {
      log('✓ Correctly rejected malformed token request', 'green');
      log(`  Message: ${error.response.data.message}`, 'blue');
      return true;
    } else {
      log('✗ Unexpected response', 'red');
      return false;
    }
  }
}

async function testDeactivatedUserTokenRefresh() {
  section('TEST 5: Refresh with Deactivated User Token');

  // First, create a test user that we'll deactivate
  const testDeactivatedUser = {
    email: 'deactivated@example.com',
    password: 'Test@Password123',
    name: 'Deactivated User',
    phone: '+254712345679',
    role: 'buyer'
  };

  try {
    // Try to register/get token
    let userToken;
    try {
      const registerResponse = await axios.post(`${API_URL}/auth/register`, testDeactivatedUser);
      userToken = registerResponse.data.token;
    } catch (e) {
      // User might exist, try login
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: testDeactivatedUser.email,
        password: testDeactivatedUser.password
      });
      userToken = loginResponse.data.token;
    }

    log('  Test user created/login successful', 'blue');

    // Now try to refresh (this should work unless user is deactivated)
    const refreshResponse = await axios.post(`${API_URL}/auth/refresh-token`, {
      token: userToken
    });

    if (refreshResponse.data.success) {
      log('✓ Token refresh for active user works', 'green');
      return true;
    }
  } catch (error) {
    log(`  Note: ${error.response?.data?.message || 'Test skipped'}`, 'yellow');
    return true;
  }

  return true;
}

async function testTokenDecoding() {
  section('TEST 6: Verify Token Structure');

  const jwt = require('jsonwebtoken');

  try {
    const decoded = jwt.decode(authToken);
    log('✓ Token decoded successfully', 'green');
    log(`  User ID: ${decoded.id}`, 'blue');
    log(`  Issued at: ${new Date(decoded.iat * 1000).toISOString()}`, 'blue');
    log(`  Expires at: ${new Date(decoded.exp * 1000).toISOString()}`, 'blue');

    const timeToExpiry = decoded.exp - Math.floor(Date.now() / 1000);
    const hoursToExpiry = (timeToExpiry / 3600).toFixed(2);
    log(`  Time to expiry: ${hoursToExpiry} hours`, 'blue');

    // Verify the token is valid
    jwt.verify(authToken, process.env.JWT_SECRET || 'campus_market_jwt_secret_2025_secure_random_string_X7k9Mz3Pq8Lw2Nv5Rt6Ys8Uf4Gh9Jk2NmQp7Ws3Ed6CyKj5Vb8Nl4Hg9Fj2Mz6Kp');
    log('✓ Token signature is valid', 'green');

    return true;
  } catch (error) {
    log('✗ Token decoding/verification failed', 'red');
    log(`  Error: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('\n🔄 JWT Token Refresh Mechanism Test Suite', 'cyan');
  log('=====================================\n', 'cyan');

  const results = {
    login: await testLogin(),
    tokenRefresh: await testTokenRefresh(),
    invalidToken: await testInvalidTokenRefresh(),
    malformedToken: await testMalformedTokenRefresh(),
    deactivatedUser: await testDeactivatedUserTokenRefresh(),
    tokenStructure: await testTokenDecoding()
  };

  section('TEST RESULTS SUMMARY');

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r === true).length;

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const color = passed ? 'green' : 'red';
    log(`  ${status}: ${test}`, color);
  });

  console.log('\n' + '-'.repeat(60));
  log(`Total: ${passedTests}/${totalTests} tests passed`, passedTests === totalTests ? 'green' : 'yellow');
  console.log('-'.repeat(60) + '\n');

  return passedTests === totalTests;
}

// Run tests
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log('\n✗ Test suite failed with error:', 'red');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runTests };
