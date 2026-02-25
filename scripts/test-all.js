#!/usr/bin/env node

require('dotenv').config();
const http = require('http');

const BASE_HOST = 'localhost';
const BASE_PORT = 5000;
const API_BASE = '/api';

// Test credentials
const users = {
  admin: { email: 'admin@campus.com', password: 'admin123' },
  seller: { email: 'seller@campus.com', password: 'seller123' },
  buyer: { email: 'buyer@campus.com', password: 'buyer123' }
};

let tokens = {};
let vulnerabilities = [];

function request(method, endpoint, body = null, token = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: BASE_HOST,
      port: BASE_PORT,
      path: `${API_BASE}${endpoint}`,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data: json });
        } catch {
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data: {} });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ status: 0, ok: false, error: error.message });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function log(role, action, result, details = '') {
  const status = result.ok ? '✓' : '✗';
  const color = result.ok ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m [${role.toUpperCase()}] ${action} ${details}`);
  if (!result.ok && result.data && result.data.message) {
    console.log(`  Error: ${result.data.message}`);
  }
}

function recordVulnerability(severity, title, description, endpoint) {
  vulnerabilities.push({ severity, title, description, endpoint });
  console.log(`\n\x1b[33m⚠ VULNERABILITY FOUND:\x1b[0m [${severity.toUpperCase()}] ${title}`);
  console.log(`  Description: ${description}`);
  console.log(`  Endpoint: ${endpoint}\n`);
}

async function login(role) {
  const user = users[role];
  const result = await request('POST', '/auth/login', user);

  if (result.ok && result.data.token) {
    tokens[role] = result.data.token;
    log(role, 'Login', result);
    return true;
  } else {
    log(role, 'Login', result);
    return false;
  }
}

async function testAuth() {
  console.log('\n=== TESTING AUTHENTICATION ===\n');

  // Test valid logins
  await login('admin');
  await login('seller');
  await login('buyer');

  // Test invalid login
  const invalidLogin = await request('POST', '/auth/login', {
    email: 'invalid@test.com',
    password: 'wrong'
  });
  log('TEST', 'Invalid login attempt', { ok: !invalidLogin.ok }, 'Should fail');
}

async function testProducts() {
  console.log('\n=== TESTING PRODUCTS ===\n');

  // Get all products
  const getProducts = await request('GET', '/products');
  log('SELLER', 'Get all products', getProducts);

  // Get product by ID
  if (getProducts.ok && getProducts.data.data && getProducts.data.data.length > 0) {
    const productId = getProducts.data.data[0]._id;
    const getProduct = await request('GET', `/products/${productId}`);
    log('SELLER', 'Get product by ID', getProduct);

    // Test like functionality as buyer
    const toggleLike = await request('POST', `/products/${productId}/like`, null, tokens.buyer);
    log('BUYER', 'Toggle like on product', toggleLike);

    // Test related products
    const related = await request('GET', `/products/${productId}/related`);
    log('BUYER', 'Get related products', related);
  }
}

async function testCart() {
  console.log('\n=== TESTING CART ===\n');

  // Get cart
  let getCart = await request('GET', '/cart', null, tokens.buyer);
  log('BUYER', 'Get cart', getCart);

  // Get products first to find a valid product ID
  const getProducts = await request('GET', '/products');
  if (getProducts.ok && getProducts.data.data && getProducts.data.data.length > 0) {
    const productId = getProducts.data.data[0]._id;

    // Add to cart
    const addToCart = await request('POST', '/cart/items', { productId, quantity: 2 }, tokens.buyer);
    log('BUYER', 'Add item to cart', addToCart);

    // Get cart again
    getCart = await request('GET', '/cart', null, tokens.buyer);
    log('BUYER', 'Get cart after adding', getCart);

    // Update quantity
    const updateQty = await request('PUT', `/cart/items/${productId}`, { quantity: 1 }, tokens.buyer);
    log('BUYER', 'Update cart quantity', updateQty);

    // Remove from cart
    const removeFromCart = await request('DELETE', `/cart/items/${productId}`, null, tokens.buyer);
    log('BUYER', 'Remove item from cart', removeFromCart);
  }

  // Clear cart
  const clearCart = await request('DELETE', '/cart', null, tokens.buyer);
  log('BUYER', 'Clear cart', clearCart);
}

async function testWishlist() {
  console.log('\n=== TESTING WISHLIST ===\n');

  // Get wishlist
  let getWishlist = await request('GET', '/wishlist', null, tokens.buyer);
  log('BUYER', 'Get wishlist', getWishlist);

  // Get products first
  const getProducts = await request('GET', '/products');
  if (getProducts.ok && getProducts.data.data && getProducts.data.data.length > 0) {
    const productId = getProducts.data.data[0]._id;

    // Add to wishlist
    const addToWishlist = await request('POST', `/wishlist/${productId}`, null, tokens.buyer);
    log('BUYER', 'Add to wishlist', addToWishlist);

    // Check if in wishlist
    const checkWishlist = await request('GET', `/wishlist/check/${productId}`, null, tokens.buyer);
    log('BUYER', 'Check if in wishlist', checkWishlist);

    // Remove from wishlist
    const removeFromWishlist = await request('DELETE', `/wishlist/${productId}`, null, tokens.buyer);
    log('BUYER', 'Remove from wishlist', removeFromWishlist);
  }
}

async function testNotifications() {
  console.log('\n=== TESTING NOTIFICATIONS ===\n');

  // Get notifications
  const getNotifications = await request('GET', '/notifications', null, tokens.buyer);
  log('BUYER', 'Get notifications', getNotifications);

  // Get unread count
  const unreadCount = await request('GET', '/notifications/unread-count', null, tokens.buyer);
  log('BUYER', 'Get unread count', unreadCount);

  if (getNotifications.ok && getNotifications.data.data && getNotifications.data.data.length > 0) {
    const notificationId = getNotifications.data.data[0]._id;

    // Mark as read
    const markRead = await request('PUT', `/notifications/${notificationId}/read`, null, tokens.buyer);
    log('BUYER', 'Mark notification as read', markRead);

    // Delete notification
    const deleteNotif = await request('DELETE', `/notifications/${notificationId}`, null, tokens.buyer);
    log('BUYER', 'Delete notification', deleteNotif);
  }

  // Mark all as read
  const markAllRead = await request('PUT', '/notifications/mark-all-read', null, tokens.buyer);
  log('BUYER', 'Mark all as read', markAllRead);
}

async function testAuthorization() {
  console.log('\n=== TESTING AUTHORIZATION & VULNERABILITIES ===\n');

  // Test: Buyer trying to create product (should fail)
  const unauthorizedCreate = await request('POST', '/products', {
    title: 'Unauthorized Product',
    description: 'Test',
    price: 100,
    category: 'electronics',
    location: 'Test'
  }, tokens.buyer);

  if (!unauthorizedCreate.ok || unauthorizedCreate.status === 403) {
    log('BUYER', 'Attempt to create product (should fail)', { ok: unauthorizedCreate.status === 403 });
  } else {
    recordVulnerability('HIGH', 'Authorization Bypass', 'Buyer can create products', '/products POST');
  }
}

async function testInjectionAttacks() {
  console.log('\n=== TESTING INJECTION ATTACKS ===\n');

  // Test NoSQL injection in login
  const nosqlLogin = await request('POST', '/auth/login', {
    email: { $ne: null },
    password: { $ne: null }
  });
  if (nosqlLogin.ok) {
    recordVulnerability('CRITICAL', 'NoSQL Injection', 'Login bypass possible with NoSQL injection', '/auth/login');
  } else {
    log('TEST', 'NoSQL injection attempt', { ok: !nosqlLogin.ok }, 'Correctly blocked');
  }

  // Test XSS in search
  const xssSearch = await request('GET', '/products?search=<script>alert(1)</script>');
  if (xssSearch.ok && JSON.stringify(xssSearch.data).includes('<script>')) {
    recordVulnerability('MEDIUM', 'XSS', 'Search parameter not sanitized, reflected in response', '/products?search=');
  }

  // Test path traversal
  const pathTraversal = await request('GET', '/products/../../../etc/passwd');
  if (pathTraversal.ok || pathTraversal.status !== 404) {
    recordVulnerability('HIGH', 'Path Traversal', 'Path traversal attempt not properly handled', '/products/{id}');
  }
}

async function testRateLimiting() {
  console.log('\n=== TESTING RATE LIMITING ===\n');

  // Make multiple rapid requests
  let rateLimitHit = false;
  for (let i = 0; i < 110; i++) {
    const response = await request('GET', '/products');
    if (response.status === 429) {
      rateLimitHit = true;
      log('TEST', `Request ${i + 1} - Rate limit hit`, { ok: false });
      break;
    }
  }

  if (!rateLimitHit) {
    recordVulnerability('MEDIUM', 'Missing Rate Limiting', 'No rate limiting detected on public endpoint', '/products');
  }
}

async function printVulnerabilityReport() {
  console.log('\n' + '='.repeat(60));
  console.log('VULNERABILITY REPORT');
  console.log('='.repeat(60) + '\n');

  if (vulnerabilities.length === 0) {
    console.log('✓ No vulnerabilities detected!\n');
  } else {
    const bySeverity = {
      CRITICAL: vulnerabilities.filter(v => v.severity === 'CRITICAL'),
      HIGH: vulnerabilities.filter(v => v.severity === 'HIGH'),
      MEDIUM: vulnerabilities.filter(v => v.severity === 'MEDIUM'),
      LOW: vulnerabilities.filter(v => v.severity === 'LOW')
    };

    for (const [severity, vulns] of Object.entries(bySeverity)) {
      if (vulns.length > 0) {
        const color = severity === 'CRITICAL' ? '\x1b[31m' : severity === 'HIGH' ? '\x1b[33m' : '\x1b[36m';
        console.log(`${color}${severity}\x1b[0m (${vulns.length})`);
        vulns.forEach((v, i) => {
          console.log(`  ${i + 1}. ${v.title}`);
          console.log(`     Description: ${v.description}`);
          console.log(`     Endpoint: ${v.endpoint}\n`);
        });
      }
    }
  }
}

async function runTests() {
  console.log('\n🧪 CAMPUS MARKET - SECURITY & FUNCTIONALITY TESTS\n');
  console.log('='.repeat(60));

  try {
    await testAuth();
    await testProducts();
    await testCart();
    await testWishlist();
    await testNotifications();
    await testAuthorization();
    await testInjectionAttacks();
    await testRateLimiting();

    await printVulnerabilityReport();

  } catch (error) {
    console.error('\n\x1b[31mTest suite error:\x1b[0m', error.message);
  }

  process.exit(0);
}

runTests();
