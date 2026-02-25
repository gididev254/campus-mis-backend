# Logging Quick Reference

## Quick Start

### Basic Logging

```javascript
const logger = require('./utils/logger');

// Info
logger.info('Message', { key: 'value' });

// Warning
logger.warn('Warning message', { key: 'value' });

// Error
logger.error('Error message', { key: 'value' }, errorObject);

// Success
logger.success('Success message', { key: 'value' });

// Debug (dev only)
logger.debug('Debug message', { key: 'value' });
```

## Specialized Logging

### Authentication

```javascript
logger.auth('login_success', {
  userId: 'user_123',
  email: 'user@example.com',
  role: 'buyer',
  ip: '127.0.0.1',
  success: true
});
```

### Payment

```javascript
logger.payment('stk_push_initiated', {
  orderId: 'order_789',
  amount: 2500,
  phone: '0712345678',
  success: true
});
```

### Security

```javascript
logger.security('sql_injection_attempt', {
  ip: '192.168.1.50',
  details: 'Pattern detected in query string'
});
```

## Log Files

```
backend/logs/
├── combined.log      # All logs
├── error.log         # Errors only
├── warn.log          # Warnings only
├── auth.log          # Authentication
├── api.log           # API requests
├── payment.log       # M-Pesa payments
├── security.log      # Security events
└── socket.log        # Socket.io
```

## NPM Scripts

```bash
npm run test:logging      # Generate sample logs
npm run logs:rotate       # Rotate logs
npm run logs:rotate:dry   # Preview rotation
```

## Full Documentation

See `REQUEST-LOGGING-GUIDE.md` for complete documentation.
