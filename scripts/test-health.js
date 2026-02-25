#!/usr/bin/env node

/**
 * Health Check Test Script
 *
 * Tests the health check endpoints to ensure they're working properly.
 * Run this script to verify the health monitoring system.
 */

const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:5000';

// Color codes for terminal output
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

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (err) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testHealthEndpoints() {
  log('\n╔════════════════════════════════════════════════╗', 'cyan');
  log('║   Health Check Endpoint Test Suite          ║', 'cyan');
  log('╚════════════════════════════════════════════════╝', 'cyan');
  log(`\nTesting API at: ${API_URL}\n`, 'blue');

  const tests = [
    {
      name: 'Basic Health Check',
      path: '/health',
      description: 'Returns basic system health information'
    },
    {
      name: 'Detailed Health Check',
      path: '/health/detailed',
      description: 'Returns comprehensive system health information'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    log(`\n▶ ${test.name}`, 'yellow');
    log(`  ${test.description}`);

    try {
      const response = await makeRequest(test.path);

      if (response.status === 200) {
        log(`  ✓ Status: ${response.status}`, 'green');
        log(`  ✓ Response received successfully`, 'green');

        // Validate response structure
        if (test.path === '/health') {
          const { status, timestamp, uptime, database, memory } = response.data;
          if (status && timestamp && uptime !== undefined && database && memory) {
            log(`  ✓ Response structure valid`, 'green');
            log(`  ✓ System Status: ${status}`, 'green');
            log(`  ✓ Database Status: ${database.status}`, 'green');
            log(`  ✓ Uptime: ${response.data.uptime_formatted}`, 'green');
            passed++;
          } else {
            log(`  ✗ Response structure invalid`, 'red');
            failed++;
          }
        } else if (test.path === '/health/detailed') {
          const { status, timestamp, api, database, sockets, memory, cpu, process } = response.data;
          if (status && timestamp && api && database && sockets && memory && cpu && process) {
            log(`  ✓ Response structure valid`, 'green');
            log(`  ✓ API Version: ${api.version}`, 'green');
            log(`  ✓ Socket Connections: ${sockets.activeConnections}`, 'green');
            log(`  ✓ Database Collections: ${database.stats?.collections || 'N/A'}`, 'green');
            passed++;
          } else {
            log(`  ✗ Response structure invalid`, 'red');
            failed++;
          }
        }

        // Show sample of response data
        if (process.env.NODE_ENV !== 'production') {
          log(`\n  Sample Response:`, 'blue');
          log(JSON.stringify(response.data, null, 2).split('\n').map(line => '    ' + line).join('\n'), 'reset');
        }
      } else {
        log(`  ✗ Status: ${response.status}`, 'red');
        failed++;
      }
    } catch (error) {
      log(`  ✗ Error: ${error.message}`, 'red');
      if (error.code === 'ECONNREFUSED') {
        log(`  Hint: Make sure the backend server is running on ${API_URL}`, 'yellow');
      }
      failed++;
    }
  }

  // Summary
  log('\n╔════════════════════════════════════════════════╗', 'cyan');
  log('║   Test Summary                                ║', 'cyan');
  log('╚════════════════════════════════════════════════╝', 'cyan');
  log(`\n  Total Tests: ${tests.length}`, 'cyan');
  log(`  Passed: ${passed}`, passed === tests.length ? 'green' : 'yellow');
  log(`  Failed: ${failed}`, failed === 0 ? 'green' : 'red');

  if (failed === 0) {
    log('\n✓ All health check endpoints are working correctly!\n', 'green');
    process.exit(0);
  } else {
    log('\n✗ Some health check endpoints failed. Please check the errors above.\n', 'red');
    process.exit(1);
  }
}

// Run tests
testHealthEndpoints().catch(error => {
  log(`\n✗ Test suite error: ${error.message}`, 'red');
  process.exit(1);
});
