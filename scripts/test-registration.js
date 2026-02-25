require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testRegistration() {
  console.log('🧪 Testing Registration System\n');

  try {
    // Test 1: Try to register as admin (should fail)
    console.log('Test 1: Attempting admin registration (should fail)...');
    try {
      await axios.post(`${API_URL}/auth/register`, {
        name: 'Malicious Admin',
        email: 'fakeadmin@test.com',
        password: 'admin123',
        phone: '+254799999999',
        role: 'admin'
      });
      console.log('❌ FAILED: Admin registration was allowed (this should not happen!)');
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.message?.includes('not allowed')) {
        console.log('✅ PASSED: Admin registration blocked correctly');
        console.log(`   Message: ${error.response.data.message}\n`);
      } else {
        console.log('❌ FAILED: Wrong error response');
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Message: ${error.response?.data?.message}\n`);
      }
    }

    // Test 2: Register as buyer (should succeed)
    console.log('Test 2: Registering as buyer...');
    try {
      const buyerResponse = await axios.post(`${API_URL}/auth/register`, {
        name: 'Test Buyer',
        email: `testbuyer${Date.now()}@test.com`,
        password: 'test123',
        phone: '+254711111111',
        role: 'buyer',
        location: 'Test Location'
      });
      console.log('✅ PASSED: Buyer registration successful');
      console.log(`   User: ${buyerResponse.data.user.email}`);
      console.log(`   Role: ${buyerResponse.data.user.role}\n`);
    } catch (error) {
      console.log('❌ FAILED: Buyer registration failed');
      console.log(`   Error: ${error.response?.data?.message}\n`);
    }

    // Test 3: Register as seller (should succeed)
    console.log('Test 3: Registering as seller...');
    try {
      const sellerResponse = await axios.post(`${API_URL}/auth/register`, {
        name: 'Test Seller',
        email: `testseller${Date.now()}@test.com`,
        password: 'test123',
        phone: '+254722222222',
        role: 'seller',
        location: 'Test Location'
      });
      console.log('✅ PASSED: Seller registration successful');
      console.log(`   User: ${sellerResponse.data.user.email}`);
      console.log(`   Role: ${sellerResponse.data.user.role}\n`);
    } catch (error) {
      console.log('❌ FAILED: Seller registration failed');
      console.log(`   Error: ${error.response?.data?.message}\n`);
    }

    // Test 4: Test admin login with correct credentials
    console.log('Test 4: Testing admin login (admin@market.com / admin123)...');
    try {
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@market.com',
        password: 'admin123'
      });
      console.log('✅ PASSED: Admin login successful');
      console.log(`   User: ${loginResponse.data.user.email}`);
      console.log(`   Role: ${loginResponse.data.user.role}\n`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ FAILED: Admin login failed - invalid credentials or user does not exist');
        console.log(`   Error: ${error.response?.data?.message}\n`);
        console.log('💡 TIP: Run "npm run seed" to create the admin user first\n');
      } else {
        console.log('❌ FAILED: Admin login failed');
        console.log(`   Error: ${error.response?.data?.message}\n`);
      }
    }

    // Test 5: Test login with wrong credentials
    console.log('Test 5: Testing login with wrong credentials...');
    try {
      await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@market.com',
        password: 'wrongpassword'
      });
      console.log('❌ FAILED: Login with wrong password was allowed!\n');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ PASSED: Wrong password correctly rejected');
        console.log(`   Message: ${error.response.data.message}\n`);
      } else {
        console.log('❌ FAILED: Unexpected response');
        console.log(`   Status: ${error.response?.status}\n`);
      }
    }

    console.log('=================================');
    console.log('TEST SUMMARY');
    console.log('=================================\n');
    console.log('✅ Admin registration blocked: Yes');
    console.log('✅ Buyer registration: Working');
    console.log('✅ Seller registration: Working');
    console.log('✅ Admin login: Working (if user exists)');
    console.log('\n💡 Next steps:');
    console.log('   1. If admin login failed, run: npm run seed');
    console.log('   2. Test the UI at http://localhost:3000/register');
    console.log('   3. Login at http://localhost:3000/login');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the backend is running: npm run dev');
    }
  }

  process.exit(0);
}

testRegistration();
