# Campus Market Backend Logging System

## Overview

The Campus Market backend implements a comprehensive logging system using **Morgan** for HTTP request logging and a **custom logger utility** for application-level events.

## Features

- **HTTP Request Logging**: Automatic logging of all HTTP requests with Morgan
- **Log Rotation**: Automatic daily rotation with size-based rotation (10MB)
- **Log Levels**: Error, Warn, Info, Success, Debug
- **Specialized Loggers**: Authentication, Payment, Socket, File Upload, Security events
- **Color-Coded Console Output**: Easy-to-read colored logs in development
- **File-Based Logging**: Persistent logs stored in `/backend/logs/` directory
- **Request Tracing**: Unique request IDs for tracing requests through the system

## Installation

```bash
cd backend
npm install morgan rotating-file-stream
```

## Log Files

All logs are stored in `/backend/logs/` directory:

- `access.log` - HTTP access logs (combined format, rotated daily)
- `error.log` - Error-level logs with stack traces
- `warn.log` - Warning-level logs
- `combined.log` - All logs combined
- `auth.log` - Authentication events (login, register, logout)
- `payment.log` - Payment events (M-Pesa transactions)
- `socket.log` - Socket.io connection events
- `upload.log` - File upload events
- `security.log` - Security-related events

## Log Rotation Configuration

- **Rotation Interval**: Daily (every 24 hours)
- **Size-Based Rotation**: When file reaches 10MB
- **Compression**: Gzip compression for rotated files
- **Retention**: Last 30 days of logs

## Usage

### Basic Logging

```javascript
const logger = require('../utils/logger');

// Error logging
logger.error('Something went wrong', { userId: user.id }, error);

// Warning logging
logger.warn('Deprecated API usage', { endpoint: '/api/v1/old' });

// Info logging
logger.info('User updated profile', { userId: user.id });

// Success logging
logger.success('Order created', { orderId: order.id });

// Debug logging (only in development)
logger.debug('Database query details', { query: 'SELECT * FROM users' });
```

### Authentication Logging

```javascript
const logger = require('../utils/logger');

// Login success
logger.auth('login_success', {
  userId: user._id,
  email: user.email,
  role: user.role,
  ip: req.ip,
  userAgent: req.get('user-agent'),
  success: true
});

// Login failure
logger.auth('login_failed', {
  email: req.body.email,
  ip: req.ip,
  userAgent: req.get('user-agent'),
  success: false,
  reason: 'Invalid password'
});
```

### Payment Logging

```javascript
const logger = require('../utils/logger');

// STK Push initiated
logger.payment('stk_push_initiated', {
  orderId: orderNumber,
  amount: Math.round(amount),
  phone: phoneNumber,
  checkoutRequestID: response.data.CheckoutRequestID,
  responseCode: response.data.ResponseCode,
  success: true
});

// Payment failed
logger.payment('stk_push_failed', {
  orderId: orderNumber,
  amount: amount,
  phone: phoneNumber,
  error: error.message,
  success: false
});
```

### Socket.io Logging

```javascript
const logger = require('../utils/logger');

// Connection
logger.socket('connect', {
  socketId: socket.id,
  userId: socket.user.id
});

// Disconnect
logger.socket('disconnect', {
  socketId: socket.id,
  userId: socket.user.id,
  reason
});
```

### File Upload Logging

```javascript
const logger = require('../utils/logger');

logger.fileUpload({
  userId: req.user.id,
  fileName: req.file.originalname,
  fileSize: req.file.size,
  mimeType: req.file.mimetype,
  uploadType: 'image',
  success: true
});
```

### Security Logging

```javascript
const logger = require('../utils/logger');

logger.security('potential_sql_injection', {
  ip: req.ip,
  userId: req.user?.id,
  details: 'Suspicious characters detected in input'
});
```

## Log Formats

### Console Output (Development)

```
[2025-02-25T14:30:45.123Z] [ERROR] Request Error
 {
  "method": "POST",
  "url": "/api/v1/auth/login",
  "statusCode": 401,
  "errorMessage": "Invalid credentials",
  "userId": "anonymous",
  "requestId": "a1b2c3d4e",
  "ip": "::1"
}
```

### File Output

```
[2025-02-25T14:30:45.123Z] [ERROR] Request Error {"method":"POST","url":"/api/v1/auth/login",...}
```

## HTTP Request Logging with Morgan

### Development Mode

```javascript
// Color-coded, concise output
app.use(morgan('dev'));
```

Output:
```
POST /api/v1/auth/login 401 45.234 ms - 59
GET /api/v1/products 200 123.456 ms - 8532
```

### Production Mode

```javascript
// Combined Apache format to file
app.use(morgan('combined', { stream: accessLogStream }));
```

Output:
```
::1 - - [25/Feb/2025:14:30:45 +0000] "POST /api/v1/auth/login HTTP/1.1" 401 59 "http://localhost:3000" "Mozilla/5.0..."
```

## Custom Morgan Tokens

Two custom tokens are defined in `server.js`:

### User ID Token

```javascript
morgan.token('user-id', (req) => {
  if (req.user && req.user.id) {
    return `user:${req.user.id}`;
  }
  return 'anonymous';
});
```

### Request ID Token

```javascript
morgan.token('request-id', (req) => {
  return req.id || Math.random().toString(36).substr(2, 9);
});
```

## Request Tracing

Each request gets a unique ID for tracing:

```javascript
// In server.js
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.id);
  next();
});
```

This ID is included in:
- Response headers (`X-Request-ID`)
- All logs for that request
- Error messages

## Environment Configuration

### Development

```bash
NODE_ENV=development
```

- Color-coded console output
- All log levels enabled
- Debug logging active
- No file rotation (logs to console only)

### Production

```bash
NODE_ENV=production
```

- File-based logging with rotation
- Combined Apache format for access logs
- Structured JSON for application logs
- 30-day log retention
- Gzip compression

### Test

```bash
NODE_ENV=test
```

- Minimal logging (`morgan('tiny')`)
- Reduced noise in test output

## Log Analysis Examples

### Count failed login attempts

```bash
grep "login_failed" backend/logs/auth.log | wc -l
```

### Find slow requests (> 1 second)

```bash
grep "response-time" backend/logs/access.log | awk '$NF > 1000' | less
```

### View authentication events for a user

```bash
grep "user:507f1f77bcf86cd799439011" backend/logs/auth.log
```

### Check for security events

```bash
cat backend/logs/security.log
```

### Monitor real-time logs

```bash
tail -f backend/logs/combined.log
```

## Error Stack Traces

Error logs include full stack traces:

```javascript
logger.error('Database connection failed', {
  host: 'localhost',
  port: 27017
}, error);
```

Output includes:
- Error message
- Error name
- Error code
- Full stack trace

## Performance Monitoring

The system logs:
- HTTP response times
- Database query durations
- Slow queries (> 1s)
- API endpoint performance

Example slow query log:

```javascript
logger.database('query', 'Product', {
  operation: 'find',
  duration: 1523, // ms
  slowQuery: true
});
```

## Security Logging

The system tracks:
- Failed authentication attempts
- Suspicious activity
- Rate limit violations
- Authorization failures
- Potential injection attacks

Example:

```javascript
if (req.body.email.includes('$') || req.body.password.includes('{')) {
  logger.security('potential_injection_attempt', {
    ip: req.ip,
    email: req.body.email,
    userAgent: req.get('user-agent')
  });
}
```

## Best Practices

### 1. Use Appropriate Log Levels

- **Error**: Critical issues requiring immediate attention
- **Warn**: Potential issues that don't stop execution
- **Info**: Important events (user actions, state changes)
- **Success**: Successful operations (login, payment, upload)
- **Debug**: Detailed information for development only

### 2. Include Relevant Context

Always include relevant metadata:

```javascript
logger.error('Order creation failed', {
  userId: req.user.id,
  orderId: order._id,
  amount: order.totalAmount,
  error: err.message
}, err);
```

### 3. Mask Sensitive Data

Never log passwords, tokens, or full credit card numbers:

```javascript
logger.payment('transaction', {
  phone: phone.replace(/(\d{6})\d{4}/, '$1****'), // Masked
  amount,
  orderId
  // Never log: password, token, full card number
});
```

### 4. Use Structured Logging

Use objects for metadata instead of strings:

```javascript
// Good
logger.error('User not found', { userId: user.id });

// Bad
logger.error(`User not found: ${user.id}`);
```

### 5. Log Async Operations

Always include success/failure status for async operations:

```javascript
try {
  await sendEmail(user.email);
  logger.success('Email sent', { userId: user.id, email: user.email });
} catch (err) {
  logger.error('Email failed', { userId: user.id, email: user.email }, err);
}
```

## Troubleshooting

### Logs Not Created

1. Check if `/backend/logs/` directory exists
2. Verify write permissions
3. Check disk space

```bash
ls -la backend/logs/
df -h
```

### Missing Log Entries

1. Check log level configuration
2. Verify environment variable (`NODE_ENV`)
3. Check for errors in the logger itself

```bash
NODE_ENV=development node server.js
```

### Log Files Too Large

1. Check rotation configuration in `server.js`
2. Verify `rotating-file-stream` is working
3. Check retention policy (30 days)

```bash
du -sh backend/logs/*
ls -lh backend/logs/
```

## Maintenance

### Clean Old Logs

```bash
# Remove logs older than 30 days
find backend/logs/ -name "*.log" -mtime +30 -delete

# Remove compressed logs older than 90 days
find backend/logs/ -name "*.gz" -mtime +90 -delete
```

### Monitor Disk Usage

```bash
# Check total log size
du -sh backend/logs/

# Find largest log files
du -h backend/logs/*.log | sort -h
```

### Archive Logs

```bash
# Create archive
tar -czf logs-archive-$(date +%Y%m%d).tar.gz backend/logs/

# Transfer to storage
scp logs-archive-*.tar.gz user@storage-server:/logs/
```

## Integration with Monitoring Tools

The log format is compatible with:

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Graylog**
- **Splunk**
- **CloudWatch** (AWS)
- **Loggly**
- **Papertrail**

Example: Send logs to ELK

```bash
# Install Filebeat
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-7.15.0-linux-x86_64.tar.gz

# Configure filebeat.yml
filebeat.inputs:
- type: log
  paths:
    - /path/to/backend/logs/*.log
  json.keys_under_root: true
  json.add_error_key: true

output.elasticsearch:
  hosts: ["localhost:9200"]
```

## Related Files

- `/backend/server.js` - Morgan configuration, request ID middleware
- `/backend/utils/logger.js` - Custom logger utility
- `/backend/middleware/error.js` - Error handler with logging
- `/backend/controllers/auth.js` - Authentication logging examples
- `/backend/utils/mpesa.js` - Payment logging examples
- `/backend/controllers/upload.js` - File upload logging examples

## Support

For issues or questions about the logging system:

1. Check this documentation
2. Review log files in `/backend/logs/`
3. Check server console output
4. Review `backend/utils/logger.js` for available methods
