# Backend Scripts

This directory contains utility scripts for the Campus Market backend.

## Health Check Test Script

### `test-health.js`

Tests the health check endpoints to ensure they're working correctly.

#### Usage

```bash
# From backend directory
node scripts/test-health.js

# With custom API URL
API_URL=http://localhost:5000 node scripts/test-health.js
```

#### What It Tests

1. **Basic Health Check** (`GET /health`)
   - Validates response structure
   - Checks system status
   - Verifies database connection
   - Confirms uptime formatting

2. **Detailed Health Check** (`GET /health/detailed`)
   - Validates comprehensive response
   - Checks API information
   - Verifies socket connection counts
   - Confirms database statistics

#### Output

The script provides:
- Color-coded pass/fail indicators
- Detailed error messages
- Response structure validation
- Sample response data (in development)
- Summary statistics

#### Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

#### Example Output

```
╔════════════════════════════════════════════════╗
║   Health Check Endpoint Test Suite          ║
╚════════════════════════════════════════════════╝

Testing API at: http://localhost:5000

▶ Basic Health Check
  Returns basic system health information
  ✓ Status: 200
  ✓ Response received successfully
  ✓ Response structure valid
  ✓ System Status: ok
  ✓ Database Status: connected
  ✓ Uptime: 1h 0m 0s

▶ Detailed Health Check
  Returns comprehensive system health information
  ✓ Status: 200
  ✓ Response received successfully
  ✓ Response structure valid
  ✓ API Version: 1.0.0
  ✓ Socket Connections: 5
  ✓ Database Collections: 10

╔════════════════════════════════════════════════╗
║   Test Summary                                ║
╚════════════════════════════════════════════════╝

  Total Tests: 2
  Passed: 2
  Failed: 0

✓ All health check endpoints are working correctly!
```

## Other Scripts

This directory may contain additional utility scripts for:
- Database seeding
- Data migration
- Testing utilities
- Deployment helpers

For more information on health checks, see:
- `../../HEALTH-CHECK-IMPLEMENTATION.md` - Complete implementation guide
- `../../HEALTH-CHECK-QUICK-REF.md` - Quick reference guide
