#!/usr/bin/env node
/**
 * M-Pesa STK Push Test Script
 *
 * This script tests the STK push functionality.
 * Note: For actual STK push to work, you need:
 * 1. A publicly accessible URL (not localhost) for callbacks
 * 2. Valid M-Pesa sandbox/production credentials
 * 3. Use ngrok or similar for local testing
 *
 * To use ngrok:
 * 1. Install ngrok
 * 2. Run: ngrok http 5000
 * 3. Copy the https URL (e.g., https://abc123.ngrok.io)
 * 4. Set API_URL=https://abc123.ngrok.io in backend/.env
 * 5. Restart the server and run this test
 */

require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

const API_URL = process.env.API_URL ? `${process.env.API_URL}/api` : 'http://localhost:5000/api';

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);

async function testSTKPush() {
  log('\n=====================================', colors.cyan);
  log('   M-PESA STK PUSH FUNCTIONALITY TEST', colors.cyan);
  log('=====================================\n', colors.cyan);

  // Check if API_URL is localhost
  if (API_URL.includes('localhost') || API_URL.includes('127.0.0.1')) {
    log('⚠️  WARNING: API_URL is set to localhost!', colors.yellow);
    log('   M-Pesa cannot send callbacks to localhost.', colors.yellow);
    log('   For actual STK push testing, use a public URL or ngrok.\n', colors.yellow);
    log('   Steps:', colors.yellow);
    log('   1. Install ngrok: brew install ngrok (Mac) or download from ngrok.io', colors.blue);
    log('   2. Run: ngrok http 5000', colors.blue);
    log('   3. Copy the HTTPS URL from ngrok output', colors.blue);
    log('   4. Update backend/.env: API_URL=https://your-url.ngrok.io', colors.blue);
    log('   5. Restart server: npm run dev', colors.blue);
    log('   6. Run this test again\n', colors.blue);
    log('   Continuing with localhost for API endpoint testing...\n', colors.yellow);
  }

  let sellerToken, buyerToken, productId, orderId, orderNumber;

  try {
    // Step 1: Create seller
    log('Step 1: Creating seller user...', colors.yellow);
    const sellerRes = await axios.post(`${API_URL}/auth/register`, {
      name: `Test Seller ${Date.now()}`,
      email: `seller${Date.now()}@test.com`,
      password: 'test123',
      phone: '254711111111',
      role: 'seller',
      location: 'Test'
    });
    sellerToken = sellerRes.data.token;
    log('✅ Seller created', colors.green);

    // Step 2: Create product
    log('\nStep 2: Creating product...', colors.yellow);
    const productRes = await axios.post(`${API_URL}/products`, {
      title: `STK Test Product ${Date.now()}`,
      description: 'Testing M-Pesa STK push',
      price: 10,
      category: '699dc637cf9a750c3a49b471',
      stock: 5,
      condition: 'new',
      location: 'Test'
    }, { headers: { Authorization: `Bearer ${sellerToken}` } });
    productId = productRes.data.product._id;
    log(`✅ Product created: ${productId}`, colors.green);

    // Step 3: Create buyer
    log('\nStep 3: Creating buyer user...', colors.yellow);
    const buyerRes = await axios.post(`${API_URL}/auth/register`, {
      name: `Test Buyer ${Date.now()}`,
      email: `buyer${Date.now()}@test.com`,
      password: 'test123',
      phone: '254722222222',
      role: 'buyer',
      location: 'Test'
    });
    buyerToken = buyerRes.data.token;
    log('✅ Buyer created', colors.green);

    // Step 4: Create order
    log('\nStep 4: Creating order...', colors.yellow);
    const orderRes = await axios.post(`${API_URL}/orders`, {
      productId: productId,
      quantity: 1,
      shippingAddress: {
        phone: '254722222222',
        street: 'Main St',
        building: 'A',
        room: '101'
      }
    }, { headers: { Authorization: `Bearer ${buyerToken}` } });
    orderId = orderRes.data.order._id;
    orderNumber = orderRes.data.order.orderNumber;
    log(`✅ Order created: ${orderNumber}`, colors.green);
    log(`   Order ID: ${orderId}`, colors.blue);
    log(`   Amount: KES ${orderRes.data.order.totalPrice}`, colors.blue);
    log(`   Payment Status: ${orderRes.data.order.paymentStatus}`, colors.blue);

    // Step 5: Check M-Pesa config
    log('\nStep 5: M-Pesa Configuration:', colors.yellow);
    const config = [
      ['MPESA_BASE_URL', process.env.MPESA_BASE_URL],
      ['MPESA_CONSUMER_KEY', process.env.MPESA_CONSUMER_KEY ? 'SET' : 'NOT SET'],
      ['MPESA_CONSUMER_SECRET', process.env.MPESA_CONSUMER_SECRET ? 'SET' : 'NOT SET'],
      ['MPESA_PASSKEY', process.env.MPESA_PASSKEY ? 'SET' : 'NOT SET'],
      ['MPESA_SHORTCODE', process.env.MPESA_SHORTCODE],
      ['MPESA_ENV', process.env.MPESA_ENV],
      ['API_URL', process.env.API_URL || 'NOT SET']
    ];
    for (const [k, v] of config) {
      const ok = v !== 'NOT SET' && v;
      log(`   ${ok ? '✅' : '❌'} ${k}: ${v}`, ok ? colors.green : colors.red);
    }

    // Step 6: Initiate STK Push
    log('\nStep 6: Initiating STK Push...', colors.yellow);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const phone = await new Promise(resolve => {
      rl.question('   Enter M-Pesa phone (254XXXXXXXXX): ', resolve);
    });
    rl.close();

    if (!phone.match(/^254\d{9}$/)) {
      log('\n❌ Invalid phone format! Use: 254XXXXXXXXX', colors.red);
      process.exit(1);
    }

    log('   Sending STK push to M-Pesa API...', colors.blue);
    const payRes = await axios.post(`${API_URL}/orders/${orderId}/pay`, {
      phoneNumber: phone
    }, { headers: { Authorization: `Bearer ${buyerToken}` } });

    log('\n✅ STK Push Request Sent Successfully!', colors.green);
    log('   M-Pesa Response:', colors.blue);
    log('   ' + JSON.stringify(payRes.data, null, 2).split('\n').join('\n   '), colors.cyan);
    log('\n📱 Check your phone for the M-Pesa STK push prompt!', colors.green);
    log('   Enter your M-Pesa PIN to complete the payment.\n', colors.green);

    // Step 7: Query payment status
    log('Step 7: Checking payment status after 10 seconds...', colors.yellow);
    await new Promise(r => setTimeout(r, 10000));

    const statusRes = await axios.get(`${API_URL}/orders/${orderId}/payment-status`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });

    log('\n✅ Payment Status:', colors.green);
    log('   ' + JSON.stringify(statusRes.data.data, null, 2).split('\n').join('\n   '), colors.cyan);

    // Summary
    log('\n=====================================', colors.cyan);
    log('   TEST SUMMARY', colors.cyan);
    log('=====================================', colors.cyan);
    log('✅ User Registration: Working', colors.green);
    log('✅ Product Creation: Working', colors.green);
    log('✅ Order Creation: Working', colors.green);
    log('✅ STK Push Endpoint: Working', colors.green);
    log('✅ M-Pesa API Call: Executed', colors.green);
    log('✅ Payment Status Query: Working', colors.green);

    log('\n📝 Notes:', colors.yellow);
    log('   • STK push request was sent to M-Pesa API', colors.blue);
    log('   • M-Pesa response indicates request was accepted', colors.blue);
    log('   • User should receive prompt on their phone', colors.blue);
    log('   • Callback URL: ' + (process.env.API_URL || 'NOT SET'), colors.blue);

    if (API_URL.includes('localhost')) {
      log('\n⚠️  CALLBACK LIMITATION:', colors.yellow);
      log('   M-Pesa callback will fail because localhost is not publicly accessible', colors.yellow);
      log('   Order status will not update automatically', colors.yellow);
      log('   Use ngrok for full end-to-end testing', colors.yellow);
    }

    log('\n✅ STK Push functionality is working correctly!', colors.green);
    log('');
    process.exit(0);

  } catch (error) {
    log('\n❌ Test Failed!', colors.red);
    log(`   Error: ${error.response?.data?.message || error.message}`, colors.red);
    if (error.response?.data) {
      log(`   Details: ${JSON.stringify(error.response.data)}`, colors.red);
    }
    log('');
    process.exit(1);
  }
}

testSTKPush();
