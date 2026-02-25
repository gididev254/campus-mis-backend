# Campus Market Logging Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Incoming Requests                        │
│                    (HTTP, WebSocket)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Server                            │
│                  (backend/server.js)                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Request ID Middleware                              │    │
│  │  - Generate unique request ID                       │    │
│  │  - Add to response header (X-Request-ID)            │    │
│  └────────────────────────────────────────────────────┘    │
│                       │                                     │
│                       ▼                                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Morgan HTTP Logger                                 │    │
│  │  - Log all HTTP requests                            │    │
│  │  - Development: Colored console output              │    │
│  │  - Production: File with rotation                   │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│              (Controllers & Utils)                           │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Auth      │  │   Payment   │  │   Upload    │        │
│  │ Controller  │  │    (M-Pesa) │  │ Controller  │        │
│  │             │  │             │  │             │        │
│  │ logger.auth()│  │logger.     │  │logger.      │        │
│  │             │  │ payment()   │  │fileUpload() │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │
│         └────────────────┴────────────────┘                │
│                          │                                 │
│                          ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Custom Logger Utility                        │   │
│  │         (utils/logger.js)                            │   │
│  │                                                      │   │
│  │  Methods:                                            │   │
│  │  - logger.error()    → error.log + combined.log      │   │
│  │  - logger.warn()     → warn.log + combined.log       │   │
│  │  - logger.info()     → combined.log                  │   │
│  │  - logger.success()  → combined.log                  │   │
│  │  - logger.debug()    → combined.log (dev only)       │   │
│  │  - logger.auth()     → auth.log + combined.log       │   │
│  │  - logger.payment()  → payment.log + combined.log    │   │
│  │  - logger.socket()   → socket.log + combined.log     │   │
│  │  - logger.fileUpload() → upload.log + combined.log   │   │
│  │  - logger.security() → security.log + combined.log   │   │
│  └──────────────────────┬──────────────────────────────┘   │
└─────────────────────────┼──────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Log Storage                               │
│                  (backend/logs/)                             │
│                                                              │
│  Log Files:                                                  │
│  ├── access.log          ← HTTP requests (Morgan)           │
│  ├── error.log           ← Error events with stack traces   │
│  ├── warn.log            ← Warning events                   │
│  ├── combined.log        ← All events combined              │
│  ├── auth.log            ← Authentication events            │
│  ├── payment.log         ← Payment/M-Pesa events            │
│  ├── socket.log          ← Socket.io events                 │
│  ├── upload.log          ← File upload events               │
│  └── security.log        ← Security events                  │
│                                                              │
│  Rotation:                                                   │
│  - Daily rotation (every 24 hours)                          │
│  - Size-based (10MB threshold)                              │
│  - Compression: gzip                                        │
│  - Retention: 30 days                                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Log Consumers                               │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Console    │  │  Log Files   │  │  Monitoring  │     │
│  │  (Development│  │  (Production │  │  Services    │     │
│  │   Only)      │  │   & Archival)│  │  (Optional)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                          │                  │
│                                          ▼                  │
│                              ┌─────────────────────┐        │
│                              │   Integration Ready │        │
│                              │                     │        │
│                              │  - ELK Stack        │        │
│                              │  - CloudWatch       │        │
│                              │  - Splunk           │        │
│                              │  - Graylog          │        │
│                              │  - Loggly           │        │
│                              └─────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. HTTP Request Flow

```
Client Request
    ↓
Express Server
    ↓
Request ID Middleware (assigns unique ID)
    ↓
Morgan (logs HTTP details)
    ↓
Route Handler
    ↓
Controller (uses logger for app events)
    ↓
Response (with X-Request-ID header)
```

### 2. Authentication Event Flow

```
Login/Register Request
    ↓
Auth Controller
    ↓
Validate credentials
    ↓
logger.auth() called
    ↓
Writes to:
  - auth.log (specialized)
  - combined.log (all events)
  - console (development)
```

### 3. Payment Event Flow

```
Order Creation
    ↓
Initiate M-Pesa STK Push
    ↓
M-Pesa Utility
    ↓
logger.payment() called
    ↓
Writes to:
  - payment.log (specialized)
  - combined.log (all events)
  - console (development)
```

### 4. Error Event Flow

```
Error occurs in controller/middleware
    ↓
Error Handler Middleware
    ↓
logger.error() called with error object
    ↓
Writes to:
  - error.log (with stack trace)
  - combined.log (all events)
  - console (development)
```

## Log Format Examples

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

### File Output (Production)

```
[2025-02-25T14:30:45.123Z] [AUTH_SUCCESS] Auth: login_success {"userId":"507f1f77bcf86cd799439011","email":"user@example.com","role":"buyer","ip":"::1","userAgent":"Mozilla/5.0...","success":true,"timestamp":"2025-02-25T14:30:45.123Z"}
```

### Morgan Access Log (Production)

```
::1 - - [25/Feb/2025:14:30:45 +0000] "POST /api/v1/auth/login HTTP/1.1" 401 59 "http://localhost:3000" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
```

## Log Level Priority

```
DEBUG (lowest, development only)
    ↓
INFO
    ↓
SUCCESS
    ↓
WARN
    ↓
ERROR (highest, production critical)
```

## Request Tracing

Every request includes:

```
Request ID: a1b2c3d4e (generated at start)
    ↓
Added to all logs for that request:
  - Morgan access log
  - Controller logs
  - Error logs
  - Database query logs (if added)
    ↓
Returned in response header:
  X-Request-ID: a1b2c3d4e
    ↓
Can be used to trace full request lifecycle
```

## Security & Privacy

### Data Masking

```
Original Phone:  +254712345678
Logged Phone:     254712****678

Original Email:   user@example.com
Logged Email:     user@example.com

Password:         (Never logged)
Token:            (Never logged)
Credit Card:      (Never logged)
```

### Sensitive Events Logged

- Authentication attempts (success/failure)
- Payment transactions (amount, masked phone)
- Security violations
- Failed authorization attempts

### Non-Sensitive Events

- Page views
- Resource access
- Successful operations
- Performance metrics

## Performance Considerations

```
Logging Overhead:
├── Synchronous: Minimal (file writes buffered)
├── Asynchronous: Yes (where possible)
├── Console: Dev only (disabled in production)
└── File I/O: Buffered, rotated during off-hours

Impact on Requests:
├── Additional processing: ~1-5ms per request
├── Memory usage: ~10-20MB for log buffers
└── Disk I/O: Minimal due to buffering
```

## Monitoring & Alerting

### Key Metrics to Track

```
Error Rate:
  - Errors per minute
  - Error rate by endpoint
  - Error rate by user

Authentication:
  - Failed login attempts
  - Failed login rate by IP
  - Registration success rate

Performance:
  - Average response time
  - Slow requests (>1s)
  - Database query times

Security:
  - Injection attempts
  - Rate limit violations
  - Unauthorized access attempts
```

### Alert Thresholds

```
Critical Alerts:
  - Error rate > 100/minute
  - Auth failures > 10/minute from same IP
  - Payment failures > 5 consecutive
  - Disk usage > 90%

Warning Alerts:
  - Error rate > 50/minute
  - Slow requests > 10/minute
  - Disk usage > 75%
```

## Integration Points

### Where Logging is Implemented

```
✓ server.js              - Morgan, request ID, Socket.io
✓ middleware/error.js    - Error handler
✓ controllers/auth.js    - Authentication
✓ utils/mpesa.js         - Payments
✓ controllers/upload.js  - File uploads

Ready to add:
○ controllers/product.js - Product operations
○ controllers/order.js   - Order operations
○ controllers/message.js - Message operations
○ middleware/auth.js     - Authorization events
```

## Future Enhancements

```
Short-term:
  - Add logging to remaining controllers
  - Implement log aggregation service
  - Set up monitoring dashboards

Medium-term:
  - Add performance metrics extraction
  - Implement distributed tracing
  - Create alerting rules

Long-term:
  - Machine learning for anomaly detection
  - Automated incident response
  - Predictive scaling based on logs
```

## Maintenance

```
Daily:
  - Monitor error logs
  - Check disk space
  - Review security events

Weekly:
  - Analyze authentication patterns
  - Review performance metrics
  - Check rotation effectiveness

Monthly:
  - Archive logs if needed
  - Review retention policy
  - Update log rotation config
```
