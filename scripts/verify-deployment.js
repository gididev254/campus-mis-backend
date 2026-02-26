#!/usr/bin/env node

/**
 * Deployment Verification Script
 *
 * This script verifies that the backend deployment is working correctly
 * by checking the health endpoint and essential functionality.
 */

const axios = require('axios');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
};

async function checkHealth(baseUrl) {
  try {
    log.info(`Checking health endpoint: ${baseUrl}/health`);
    const response = await axios.get(`${baseUrl}/health`, { timeout: 10000 });

    if (response.status === 200 && response.data.success === true) {
      log.success('Health check passed');
      log.info(`Response: ${JSON.stringify(response.data)}`);
      return true;
    } else {
      log.error('Health check failed');
      log.info(`Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    log.error('Health check failed');
    if (error.response) {
      log.info(`Status: ${error.response.status}`);
      log.info(`Response: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      log.error('No response received - server may be down');
    } else {
      log.error(`Error: ${error.message}`);
    }
    return false;
  }
}

async function checkDetailedHealth(baseUrl) {
  try {
    log.info(`Checking detailed health: ${baseUrl}/health/detailed`);
    const response = await axios.get(`${baseUrl}/health/detailed`, { timeout: 10000 });

    if (response.status === 200 && response.data.success === true) {
      log.success('Detailed health check passed');
      log.info(`Response: ${JSON.stringify(response.data, null, 2)}`);
      return true;
    } else {
      log.error('Detailed health check failed');
      return false;
    }
  } catch (error) {
    log.error('Detailed health check failed');
    return false;
  }
}

async function checkCors(baseUrl) {
  try {
    log.info('Checking CORS configuration...');
    const response = await axios.options(`${baseUrl}/health`, {
      headers: {
        Origin: 'https://campus-mis-frontend.vercel.app',
      },
      timeout: 10000,
    });

    const corsHeaders = response.headers['access-control-allow-origin'];
    if (corsHeaders) {
      log.success(`CORS configured: ${corsHeaders}`);
      return true;
    } else {
      log.warn('CORS headers not found');
      return false;
    }
  } catch (error) {
    log.warn('CORS check failed (may not be critical)');
    return false;
  }
}

async function main() {
  const baseUrl = process.argv[2] || process.env.API_URL || 'http://localhost:5000';

  log.header('=== Backend Deployment Verification ===');
  log.info(`Testing backend at: ${baseUrl}`);
  log.header('========================================\n');

  const healthOk = await checkHealth(baseUrl);
  const detailedHealthOk = await checkDetailedHealth(baseUrl);
  const corsOk = await checkCors(baseUrl);

  log.header('\n=== Summary ===');
  log.info(`Health Check: ${healthOk ? colors.green + 'PASS' + colors.reset : colors.red + 'FAIL' + colors.reset}`);
  log.info(`Detailed Health: ${detailedHealthOk ? colors.green + 'PASS' + colors.reset : colors.red + 'FAIL' + colors.reset}`);
  log.info(`CORS: ${corsOk ? colors.green + 'PASS' + colors.reset : colors.yellow + 'WARN' + colors.reset}`);

  if (healthOk && detailedHealthOk) {
    log.success('\n✓ Backend deployment is working correctly!');
    process.exit(0);
  } else {
    log.error('\n✗ Backend deployment has issues');
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  log.error(`Script error: ${error.message}`);
  process.exit(1);
});
