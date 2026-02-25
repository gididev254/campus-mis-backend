/**
 * Test Request Logging
 *
 * This script demonstrates and tests the comprehensive request logging implementation
 * Run this to see sample log outputs
 */

const logger = require('../utils/logger');
const {
  sanitizeBody,
  parseUserAgent,
  getRequestStats
} = require('../middleware/requestLogger');

console.log('==========================================');
console.log('Request Logging Test Suite');
console.log('==========================================\n');

// Test 1: Sanitize Body
console.log('Test 1: Body Sanitization');
console.log('----------------------------');
const sampleBody = {
  email: 'test@example.com',
  password: 'supersecret123',
  name: 'John Doe',
  currentPassword: 'oldpass',
  cardNumber: '4111111111111111',
  cvv: '123',
  normalField: 'keep this'
};

console.log('Original body:', JSON.stringify(sampleBody, null, 2));
console.log('\nSanitized body:', JSON.stringify(sanitizeBody(sampleBody), null, 2));
console.log('\n');

// Test 2: User Agent Parsing
console.log('Test 2: User Agent Parsing');
console.log('----------------------------');
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
];

userAgents.forEach(ua => {
  const parsed = parseUserAgent(ua);
  console.log(`${parsed.device} - ${parsed.browser} on ${parsed.os}`);
  console.log(`  Raw: ${parsed.raw.substring(0, 50)}...`);
});
console.log('\n');

// Test 3: Log Level Examples
console.log('Test 3: Log Level Examples');
console.log('----------------------------');

logger.info('User login successful', {
  userId: 'user_123',
  email: 'user@example.com',
  timestamp: new Date().toISOString()
});

logger.warn('High memory usage detected', {
  heapUsed: '500MB',
  heapTotal: '1GB',
  percentage: 50
});

logger.error('Database connection failed', {
  host: 'localhost',
  port: 27017,
  retryAttempts: 3
}, new Error('Connection timeout'));

logger.success('Order created successfully', {
  orderId: 'order_456',
  amount: 1500,
  currency: 'KES'
});

logger.debug('Cache hit', {
  key: 'products:page:1',
  ttl: 3600
});

console.log('\n');

// Test 4: Auth Logging
console.log('Test 4: Authentication Logging');
console.log('----------------------------');

logger.auth('login_attempt', {
  userId: 'user_123',
  email: 'user@example.com',
  role: 'buyer',
  ip: '127.0.0.1',
  userAgent: 'Mozilla/5.0...',
  success: true
});

logger.auth('login_failed', {
  userId: null,
  email: 'hacker@evil.com',
  role: null,
  ip: '192.168.1.100',
  userAgent: 'curl/7.68.0',
  success: false
});

console.log('\n');

// Test 5: API Request Logging
console.log('Test 5: API Request Logging');
console.log('----------------------------');

// Simulate request object
const mockReq = {
  method: 'POST',
  originalUrl: '/api/v1/auth/login',
  ip: '127.0.0.1',
  id: 'req_abc123',
  user: { id: 'user_123' },
  get: (header) => header === 'user-agent' ? 'Mozilla/5.0...' : null,
  body: { email: 'user@example.com', password: '[REDACTED]' }
};

// Simulate response object
const mockRes = {
  statusCode: 200,
  get: (header) => header === 'content-length' ? '1234' : null
};

logger.apiRequest(mockReq, mockRes, 45);

console.log('\n');

// Test 6: Payment Logging
console.log('Test 6: Payment Logging');
console.log('----------------------------');

logger.payment('stk_push_initiated', {
  orderId: 'order_789',
  amount: 2500,
  phone: '0712345678',
  success: true
});

logger.payment('callback_received', {
  orderId: 'order_789',
  amount: 2500,
  phone: '0712345678',
  mpesaReceipt: 'QEI4XW7Q3R',
  resultDesc: 'The service request is processed successfully.',
  resultDesc: '0',
  success: true
});

logger.payment('payment_failed', {
  orderId: 'order_999',
  amount: 1000,
  phone: '0723456789',
  resultDesc: 'Request cancelled by user',
  resultDesc: '1032',
  success: false
});

console.log('\n');

// Test 7: Security Logging
console.log('Test 7: Security Logging');
console.log('----------------------------');

logger.security('sql_injection_attempt', {
  ip: '192.168.1.50',
  userId: 'anonymous',
  details: 'Pattern detected in query string',
  url: '/api/v1/products?id=1\' OR \'1\'=\'1'
});

logger.security('rate_limit_exceeded', {
  ip: '10.0.0.5',
  userId: 'user_456',
  details: '20 requests in 1 minute',
  endpoint: '/api/v1/auth/login'
});

logger.security('brute_force_detected', {
  ip: '172.16.0.10',
  userId: null,
  details: '10 failed login attempts',
  endpoint: '/api/v1/auth/login'
});

console.log('\n');

// Test 8: File Upload Logging
console.log('Test 8: File Upload Logging');
console.log('----------------------------');

logger.fileUpload({
  fileName: 'product-image.jpg',
  fileSize: '2.5MB',
  mimeType: 'image/jpeg',
  userId: 'user_789',
  uploadType: 'product',
  success: true
});

logger.fileUpload({
  fileName: 'document.pdf',
  fileSize: '15MB',
  mimeType: 'application/pdf',
  userId: 'user_789',
  uploadType: 'unknown',
  success: false
});

console.log('\n');

// Test 9: Socket Logging
console.log('Test 9: Socket Logging');
console.log('----------------------------');

logger.socket('connect', {
  socketId: 'socket_xyz',
  userId: 'user_123'
});

logger.socket('disconnect', {
  socketId: 'socket_xyz',
  userId: 'user_123',
  reason: 'transport close'
});

logger.socket('join_conversation', {
  socketId: 'socket_abc',
  userId: 'user_123',
  conversationWith: 'user_456'
});

console.log('\n');

// Test 10: Request Statistics
console.log('Test 10: Request Statistics');
console.log('----------------------------');
const stats = getRequestStats();
console.log('Active requests:', stats.activeRequests);
console.log('Max concurrent requests:', stats.maxActiveRequests);

console.log('\n');

// Test 11: Large Body Truncation
console.log('Test 11: Large Body Truncation');
console.log('----------------------------');
const largeBody = {
  field1: 'x'.repeat(5000),
  field2: 'y'.repeat(5000),
  field3: 'z'.repeat(5000)
};

const sanitizedLarge = sanitizeBody(largeBody);
console.log('Truncated body:', JSON.stringify(sanitizedLarge, null, 2));

console.log('\n==========================================');
console.log('Test Suite Complete!');
console.log('==========================================');
console.log('\nCheck the backend/logs directory for generated log files:');
console.log('  - combined.log  (all logs)');
console.log('  - error.log     (error level)');
console.log('  - warn.log      (warning level)');
console.log('  - auth.log      (authentication events)');
console.log('  - api.log       (API requests)');
console.log('  - api-errors.log (API errors)');
console.log('  - payment.log   (payment events)');
console.log('  - security.log  (security events)');
console.log('  - socket.log    (socket.io events)');
console.log('  - upload.log    (file uploads)');
