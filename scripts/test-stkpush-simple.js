require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

const API_URL = process.env.API_URL ? `${process.env.API_URL}/api` : 'http://localhost:5000/api';

// Colors
const log = (msg, color = '\x1b[0m') => console.log(`${color}${msg}\x1b[0m`);

async function testSTKPush() {
  log('\n=====================================', '\x1b[36m');
  log('   M-PESA STK PUSH TEST', '\x1b[36m');
  log('=====================================\n', '\x1b[36m');

  // Step 1: Create seller user
  log('Step 1: Creating seller user...', '\x1b[33m');
  let sellerToken, sellerId;
  try {
    const sellerRes = await axios.post(`${API_URL}/auth/register`, {
      name: `Test Seller ${Date.now()}`,
      email: `seller${Date.now()}@test.com`,
      password: 'test123',
      phone: '254711111111',
      role: 'seller',
      location: 'Test Location'
    });
    sellerToken = sellerRes.data.token;
    sellerId = sellerRes.data.user.id;
    log('✅ Seller created', '\x1b[32m');
  } catch (e) {
    log('❌ Failed to create seller', '\x1b[31m');
    log(`   ${e.response?.data?.message || e.message}`, '\x1b[31m');
    process.exit(1);
  }

  // Step 2: Create product as seller
  log('\nStep 2: Creating product...', '\x1b[33m');
  let productId;
  try {
    const productRes = await axios.post(`${API_URL}/products`, {
      title: `Test Product STK ${Date.now()}`,
      description: 'For STK push testing',
      price: 10,
      category: '699dc637cf9a750c3a49b471',
      stock: 5,
      condition: 'new',
      location: 'Test Location'
    }, { headers: { Authorization: `Bearer ${sellerToken}` } });
    productId = productRes.data.product._id;
    log(`✅ Product created: ${productId}`, '\x1b[32m');
  } catch (e) {
    log('❌ Failed to create product', '\x1b[31m');
    log(`   ${e.response?.data?.message || e.message}`, '\x1b[31m');
    process.exit(1);
  }

  // Step 3: Create buyer user
  log('\nStep 3: Creating buyer user...', '\x1b[33m');
  let buyerToken;
  try {
    const buyerRes = await axios.post(`${API_URL}/auth/register`, {
      name: `Test Buyer ${Date.now()}`,
      email: `buyer${Date.now()}@test.com`,
      password: 'test123',
      phone: '254722222222',
      role: 'buyer',
      location: 'Test Location'
    });
    buyerToken = buyerRes.data.token;
    log('✅ Buyer created', '\x1b[32m');
  } catch (e) {
    log('❌ Failed to create buyer', '\x1b[31m');
    log(`   ${e.response?.data?.message || e.message}`, '\x1b[31m');
    process.exit(1);
  }

  // Step 4: Create order
  log('\nStep 4: Creating order...', '\x1b[33m');
  let orderId, orderNumber;
  try {
    const orderRes = await axios.post(`${API_URL}/orders`, {
      productId: productId,
      quantity: 1,
      shippingAddress: {
        phone: '254722222222',
        street: 'Main St',
        building: 'Building A',
        room: '101'
      }
    }, { headers: { Authorization: `Bearer ${buyerToken}` } });
    orderId = orderRes.data.order._id;
    orderNumber = orderRes.data.order.orderNumber;
    log(`✅ Order created: ${orderNumber}`, '\x1b[32m');
    log(`   Amount: KES ${orderRes.data.order.totalPrice}`, '\x1b[34m');
  } catch (e) {
    log('❌ Failed to create order', '\x1b[31m');
    log(`   ${e.response?.data?.message || e.message}`, '\x1b[31m');
    process.exit(1);
  }

  // Step 5: Check M-Pesa config
  log('\nStep 5: Checking M-Pesa configuration...', '\x1b[33m');
  const mpesaConfig = {
    MPESA_BASE_URL: process.env.MPESA_BASE_URL,
    MPESA_CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY ? 'SET' : 'NOT SET',
    MPESA_CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET ? 'SET' : 'NOT SET',
    MPESA_PASSKEY: process.env.MPESA_PASSKEY ? 'SET' : 'NOT SET',
    MPESA_SHORTCODE: process.env.MPESA_SHORTCODE,
    MPESA_ENV: process.env.MPESA_ENV,
    API_URL: process.env.API_URL || 'NOT SET!'
  };
  for (const [k, v] of Object.entries(mpesaConfig)) {
    const isSet = v !== 'NOT SET' && v !== 'NOT SET!' && v;
    log(`   ${isSet ? '✅' : '❌'} ${k}: ${v}`, isSet ? '\x1b[32m' : '\x1b[31m');
  }

  // Step 6: Get phone number and initiate STK push
  log('\nStep 6: Initiating STK Push...', '\x1b[33m');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const phone = await new Promise(resolve => {
    rl.question('   Enter M-Pesa phone (254XXXXXXXXX): ', resolve);
  });
  rl.close();

  if (!phone.match(/^254\d{9}$/)) {
    log('\n❌ Invalid phone format! Use: 254XXXXXXXXX', '\x1b[31m');
    process.exit(1);
  }

  try {
    log('\n   Sending STK push request to M-Pesa...', '\x1b[34m');
    const payRes = await axios.post(`${API_URL}/orders/${orderId}/pay`, {
      phoneNumber: phone
    }, { headers: { Authorization: `Bearer ${buyerToken}` } });

    log('\n✅ STK Push initiated successfully!', '\x1b[32m');
    log('   ' + JSON.stringify(payRes.data, null, 2).split('\n').join('\n   '), '\x1b[34m');
    log('\n📱 CHECK YOUR PHONE! Enter M-Pesa PIN when prompted.\n', '\x1b[32m');

  } catch (e) {
    log('\n❌ STK Push failed!', '\x1b[31m');
    log(`   Error: ${e.response?.data?.message || e.message}`, '\x1b[31m');
    if (e.response?.data) {
      log(`   Details: ${JSON.stringify(e.response.data)}`, '\x1b[31m');
    }
    process.exit(1);
  }

  // Step 7: Query payment status after delay
  log('\nStep 7: Waiting 10 seconds to check payment status...', '\x1b[33m');
  await new Promise(r => setTimeout(r, 10000));

  try {
    const statusRes = await axios.get(`${API_URL}/orders/${orderId}/payment-status`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    log('\n✅ Payment Status:', '\x1b[32m');
    log('   ' + JSON.stringify(statusRes.data.data, null, 2).split('\n').join('\n   '), '\x1b[34m');
  } catch (e) {
    log('\n⚠️  Could not fetch payment status', '\x1b[33m');
    log(`   ${e.response?.data?.message || e.message}`, '\x1b[33m');
  }

  log('\n=====================================', '\x1b[36m');
  log('   TEST SUMMARY', '\x1b[36m');
  log('=====================================', '\x1b[36m');
  log('✅ STK Push endpoint: Working', '\x1b[32m');
  log('✅ M-Pesa API call: Executed', '\x1b[32m');
  log('✅ Order creation: Working', '\x1b[32m');
  log('\n💡 Check your phone for M-Pesa prompt!', '\x1b[33m');
  log('💡 Callback URL: ' + (process.env.API_URL || 'NOT SET!'), '\x1b[33m');
  if (!process.env.API_URL) {
    log('⚠️  WARNING: API_URL not set - callbacks will fail!', '\x1b[31m');
  }
  log('');
  process.exit(0);
}

testSTKPush().catch(err => {
  log('\n❌ Test failed:', '\x1b[31m');
  log(`   ${err.message}`, '\x1b[31m');
  process.exit(1);
});
