# Request Logging Implementation Guide

## Overview

Comprehensive request logging system for the Campus Market backend with multiple log levels, automatic log rotation, and detailed tracking of all HTTP requests, errors, and system events.

## Features

- **Multiple Log Levels**: info, warn, error, success, debug
- **Request Tracking**: Method, URL, timestamp, status code, duration
- **User Information**: User ID, role when authenticated
- **Sanitized Body Logging**: Automatic redaction of sensitive fields (passwords, tokens, etc.)
- **User Agent Parsing**: Browser, OS, and device detection
- **Security Event Logging**: SQL injection attempts, brute force, rate limiting
- **Log Rotation**: Automatic rotation and compression to prevent disk space issues
- **Separate Log Files**: Organized by event type (auth, API, payment, security, etc.)

## Directory Structure

```
backend/
├── logs/                          # Log files directory
│   ├── combined.log               # All logs combined
│   ├── error.log                  # Error level logs
│   ├── warn.log                   # Warning level logs
│   ├── auth.log                   # Authentication events
│   ├── api.log                    # API requests
│   ├── api-errors.log             # API errors with full context
│   ├── payment.log                # M-Pesa payment events
│   ├── security.log               # Security events
│   ├── socket.log                 # Socket.io events
│   ├── upload.log                 # File upload events
│   └── archived/                  # Rotated and compressed logs
├── middleware/
│   └── requestLogger.js           # Request logging middleware
├── utils/
│   └── logger.js                  # Core logging utility
└── scripts/
    ├── rotate-logs.js             # Log rotation script
    └── test-request-logging.js    # Test and demo script
```

## Middleware Components

### 1. requestLogger

Main middleware that logs all HTTP requests with comprehensive details.

**Logs:**
- Request method and URL
- Timestamp and duration
- Response status code
- User ID (if authenticated)
- User agent (browser, OS, device)
- Request body (sanitized)
- Query parameters
- IP address

**Usage:**

Already applied in `server.js`:
```javascript
const { requestLogger } = require('./middleware/requestLogger');
app.use(requestLogger);
```

### 2. errorLogger

Logs errors with full request context.

**Logs:**
- Error name, message, and stack trace
- Request method, URL, and body
- User information
- Query parameters

**Usage:**

Already applied in `server.js`:
```javascript
const { errorLogger } = require('./middleware/requestLogger');
// Applied after routes
app.use(errorLogger);
```

### 3. requestId

Adds a unique request ID to each request for tracing.

**Features:**
- Generates unique ID for each request
- Respects X-Request-ID header if present
- Adds X-Request-ID to response headers

**Usage:**

```javascript
const { requestId } = require('./middleware/requestLogger');
app.use(requestId);
```

### 4. requestCounter

Tracks number of active requests.

**Features:**
- Monitors concurrent requests
- Warns when approaching limit
- Helps identify load issues

**Usage:**

```javascript
const { requestCounter } = require('./middleware/requestLogger');
app.use(requestCounter);
```

### 5. securityLogger

Logs suspicious activities and potential attacks.

**Detects:**
- Path traversal attempts (..)
- XSS attempts (<script>)
- SQL injection patterns
- Code injection (eval())
- Requests without user agent

**Usage:**

```javascript
const { securityLogger } = require('./middleware/requestLogger');
app.use(securityLogger);
```

## Logger Utility Methods

The `logger` object in `utils/logger.js` provides methods for different log types:

### Basic Logging

```javascript
const logger = require('./utils/logger');

// Info level
logger.info('User action', { userId: '123', action: 'viewed_product' });

// Warning level
logger.warn('High memory usage', { heapUsed: '900MB', percentage: 90 });

// Error level
logger.error('Database error', { query: 'SELECT * FROM users' }, errorObject);

// Success level
logger.success('Order created', { orderId: '456', amount: 1500 });

// Debug level (only in development)
logger.debug('Cache hit', { key: 'products:page:1' });
```

### Authentication Logging

```javascript
// Successful login
logger.auth('login_success', {
  userId: 'user_123',
  email: 'user@example.com',
  role: 'buyer',
  ip: '127.0.0.1',
  userAgent: 'Mozilla/5.0...',
  success: true
});

// Failed login
logger.auth('login_failed', {
  email: 'hacker@evil.com',
  ip: '192.168.1.100',
  success: false
});
```

### API Request Logging

```javascript
// Automatic via middleware, but can be used manually
logger.apiRequest(req, res, responseTime);

// API error with full context
logger.apiError(req, error);
```

### Payment Logging

```javascript
// M-Pesa STK push initiated
logger.payment('stk_push_initiated', {
  orderId: 'order_789',
  amount: 2500,
  phone: '0712345678',
  success: true
});

// Payment callback received
logger.payment('callback_received', {
  orderId: 'order_789',
  amount: 2500,
  phone: '0712345678',
  mpesaReceipt: 'QEI4XW7Q3R',
  resultDesc: 'The service request is processed successfully.',
  resultCode: '0',
  success: true
});

// Payment failed
logger.payment('payment_failed', {
  orderId: 'order_999',
  amount: 1000,
  phone: '0723456789',
  resultDesc: 'Request cancelled by user',
  resultCode: '1032',
  success: false
});
```

### Security Logging

```javascript
// SQL injection attempt
logger.security('sql_injection_attempt', {
  ip: '192.168.1.50',
  userId: 'anonymous',
  details: 'Pattern detected in query string',
  url: '/api/v1/products?id=1\' OR \'1\'=\'1'
});

// Rate limit exceeded
logger.security('rate_limit_exceeded', {
  ip: '10.0.0.5',
  userId: 'user_456',
  details: '20 requests in 1 minute',
  endpoint: '/api/v1/auth/login'
});

// Brute force detected
logger.security('brute_force_detected', {
  ip: '172.16.0.10',
  details: '10 failed login attempts',
  endpoint: '/api/v1/auth/login'
});
```

### File Upload Logging

```javascript
logger.fileUpload({
  fileName: 'product-image.jpg',
  fileSize: '2.5MB',
  mimeType: 'image/jpeg',
  userId: 'user_789',
  uploadType: 'product',
  success: true
});
```

### Socket.io Logging

```javascript
logger.socket('connect', {
  socketId: 'socket_xyz',
  userId: 'user_123'
});

logger.socket('disconnect', {
  socketId: 'socket_xyz',
  userId: 'user_123',
  reason: 'transport close'
});
```

## Log Format

### Console Output (Development)

Colored output for easy reading:
- **ERROR** (Red): Critical errors
- **WARN** (Yellow): Warnings and slow requests
- **INFO** (Cyan): General information
- **SUCCESS** (Green): Successful operations
- **DEBUG** (Gray): Debug information (dev only)

### File Output

JSON format for easy parsing:
```
[2026-02-25T16:34:20.352Z] [INFO] User login successful {"userId":"user_123","email":"user@example.com","timestamp":"2026-02-25T16:34:20.351Z"}
```

## Sanitization

Sensitive fields are automatically redacted from logs:
- `password`
- `currentPassword`
- `newPassword`
- `confirmPassword`
- `token`
- `accessToken`
- `refreshToken`
- `cardNumber`
- `cvv`
- `secret`
- `apiKey`

Example:
```javascript
{
  email: 'user@example.com',
  password: '[REDACTED]',
  cardNumber: '[REDACTED]'
}
```

## Log Rotation

### Automatic Rotation

Logs are automatically rotated based on:
- **Size**: 100MB maximum per file
- **Age**: 30 days retention

### Manual Rotation

Run the rotation script:

```bash
# Rotate logs
npm run logs:rotate

# Dry run (show what would be rotated)
npm run logs:rotate:dry

# Force compression
npm run logs:compress
```

### Rotation Script Features

- Compresses old logs with gzip
- Archives rotated logs to `logs/archived/`
- Deletes logs older than retention period
- Reports disk usage before/after

## Configuration

### Log Levels

Environment-based configuration:
```javascript
// Development - verbose logging
if (process.env.NODE_ENV === 'development') {
  logger.debug('Detailed info');
}

// Production - only important logs
if (process.env.NODE_ENV === 'production') {
  logger.info('Important info');
}
```

### Excluding Paths

Configure paths to exclude from detailed logging in `requestLogger.js`:
```javascript
const LOG_CONFIG = {
  excludePaths: ['/health', '/health/detailed', '/favicon.ico'],
  slowRequestThreshold: 1000, // ms
  verySlowRequestThreshold: 3000, // ms
  maxBodySize: 1024 * 10 // 10KB
};
```

## Sample Log Output

### Successful API Request

```
[2026-02-25T16:34:20.352Z] [INFO] Request Completed
{
  "method": "POST",
  "url": "/api/v1/auth/login",
  "path": "/api/v1/auth/login",
  "query": {},
  "ip": "127.0.0.1",
  "requestId": "abc123",
  "userId": "user_123",
  "userRole": "buyer",
  "userAgent": {
    "raw": "Mozilla/5.0...",
    "browser": "Chrome",
    "os": "Windows",
    "device": "Desktop"
  },
  "status": 200,
  "responseTime": "45ms",
  "responseTimeMs": 45,
  "contentLength": 1234,
  "contentType": "application/json"
}
```

### Error with Full Context

```
[2026-02-25T16:34:20.365Z] [ERROR] Server Error
{
  "method": "GET",
  "url": "/api/v1/products/invalid",
  "ip": "192.168.1.50",
  "requestId": "xyz789",
  "userId": "anonymous",
  "error": {
    "name": "CastError",
    "message": "Cast to ObjectId failed for value \"invalid\"",
    "code": 500,
    "stack": "CastError: Cast to ObjectId failed..."
  },
  "query": { "id": "invalid" },
  "params": { "id": "invalid" }
}
```

### Security Event

```
[2026-02-25T16:34:20.379Z] [WARN] Security: sql_injection_attempt
{
  "eventType": "sql_injection_attempt",
  "ip": "192.168.1.50",
  "userId": "anonymous",
  "details": "Pattern detected in query string",
  "timestamp": "2026-02-25T16:34:20.377Z"
}
```

### Payment Event

```
[2026-02-25T16:34:20.372Z] [SUCCESS] Payment: callback_received
{
  "eventType": "callback_received",
  "orderId": "order_789",
  "amount": 2500,
  "phone": "071234****",
  "mpesaReceipt": "QEI4XW7Q3R",
  "resultDesc": "0",
  "timestamp": "2026-02-25T16:34:20.372Z"
}
```

## NPM Scripts

```bash
# Test request logging (generates sample logs)
npm run test:logging

# Rotate logs
npm run logs:rotate

# Dry run rotation
npm run logs:rotate:dry

# Force compression
npm run logs:compress
```

## Best Practices

### 1. Use Appropriate Log Levels

- **ERROR**: Critical errors that need immediate attention
- **WARN**: Issues that should be investigated but don't stop operation
- **INFO**: Normal operation tracking
- **SUCCESS**: Successful operations (auth, payments, etc.)
- **DEBUG**: Detailed info for development only

### 2. Include Relevant Context

Always include relevant metadata:
```javascript
logger.info('Product viewed', {
  productId: 'prod_123',
  userId: 'user_456',
  categoryId: 'cat_789'
});
```

### 3. Use Structured Logging

Use objects for metadata, not strings:
```javascript
// Good
logger.info('User action', { userId: '123', action: 'login' });

// Bad
logger.info('User 123 performed login');
```

### 4. Log Security Events

Always log suspicious activities:
```javascript
logger.security('potential_attack', {
  ip: req.ip,
  userId: req.user?.id,
  pattern: detectedPattern
});
```

### 5. Sanitize User Input

Never log raw passwords or sensitive data:
```javascript
// Automatic sanitization
logger.info('Login attempt', {
  email: req.body.email,
  password: '[REDACTED]'  // Automatic via sanitizeBody()
});
```

### 6. Use Request IDs

Request IDs help trace requests through logs:
```javascript
logger.info('Processing request', {
  requestId: req.id,
  userId: req.user?.id
});
```

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Error Rate**: High error rates indicate issues
2. **Response Time**: Slow requests need optimization
3. **Security Events**: Multiple attempts from same IP
4. **Failed Payments**: Payment gateway issues
5. **Failed Auth**: Potential attacks

### Setting Up Alerts

Monitor logs for patterns:
```bash
# Count errors in last hour
grep "ERROR" logs/combined.log | grep "$(date -d '1 hour ago' +%Y-%m-%dT%H)" | wc -l

# Find security events
grep "SECURITY" logs/security.log

# Check slow requests
grep "Slow Request" logs/warn.log
```

## Troubleshooting

### Logs Not Appearing

1. Check if logs directory exists: `ls backend/logs`
2. Check file permissions: `ls -la backend/logs`
3. Verify logger is imported: `require('./utils/logger')`

### Logs Growing Too Large

1. Run log rotation: `npm run logs:rotate`
2. Adjust retention in `scripts/rotate-logs.js`
3. Reduce log level from debug to info

### Missing Request IDs

Ensure `requestId` middleware is applied before other middleware:
```javascript
app.use(requestId);  // Must be first
app.use(requestLogger);
```

## Testing

Run the test script to see all logging features in action:

```bash
npm run test:logging
```

This will:
- Demonstrate body sanitization
- Show user agent parsing
- Generate sample logs at all levels
- Create test log files
- Show security event logging

## Summary

The comprehensive request logging system provides:

- Full request/response tracking with duration
- Automatic sanitization of sensitive data
- Multiple log levels and organized log files
- Security event detection and logging
- Payment and authentication event tracking
- Automatic log rotation and compression
- Easy debugging with request IDs
- User agent parsing for analytics
- Configurable thresholds for warnings

All logs are written to `backend/logs/` with automatic rotation to prevent disk space issues.
