/**
 * Comprehensive Integration Test - Fixed
 * Tests all buttons with real data and correct API structures
 */

const axios = require('axios');

const API = 'http://localhost:5000/api';

async function test(name, fn) {
  try {
    await fn();
    console.log('✅', name);
    return true;
  } catch (e) {
    console.log('❌', name, '-', e.response?.data?.message || e.message);
    return false;
  }
}

async function runIntegrationTest() {
  console.log('=== 🧪 COMPREHENSIVE INTEGRATION TEST (FIXED) ===\n');

  const results = [];
  let adminToken, sellerToken, buyerToken, productId, orderId, categoryId, sellerId;

  // ========== AUTHENTICATION ==========
  console.log('📱 AUTHENTICATION\n');

  results.push(await test('Login - Admin', async () => {
    const r = await axios.post(`${API}/auth/login`, {
      email: 'admin@market.com',
      password: 'admin123'
    });
    adminToken = r.data.token;
  }));

  results.push(await test('Login - Seller', async () => {
    const r = await axios.post(`${API}/auth/login`, {
      email: 'testseller@example.com',
      password: 'password123'
    });
    sellerToken = r.data.token;
  }));

  results.push(await test('Login - Buyer', async () => {
    const r = await axios.post(`${API}/auth/login`, {
      email: 'testbuyer@example.com',
      password: 'password123'
    });
    buyerToken = r.data.token;
  }));

  // Get seller ID
  results.push(await test('Get Seller Profile', async () => {
    const r = await axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${sellerToken}` }
    });
    sellerId = r.data.user.id;
    console.log('   Seller ID:', sellerId);
  }));

  // ========== GET CATEGORY ==========
  console.log('\n📂 GET CATEGORY FOR PRODUCT\n');

  results.push(await test('Get Categories', async () => {
    const r = await axios.get(`${API}/categories`);
    // Use first category or create one
    if (r.data.categories && r.data.categories.length > 0) {
      categoryId = r.data.categories[0]._id;
      console.log('   Using category:', r.data.categories[0].name);
    }
  }));

  if (!categoryId) {
    console.log('⚠️ No categories found, skipping product creation tests');
    return results;
  }

  // ========== SELLER: CREATE PRODUCT ==========
  console.log('\n📊 SELLER: CREATE TEST PRODUCT\n');

  results.push(await test('Seller - Create Product', async () => {
    const r = await axios.post(`${API}/products`, {
      title: 'Integration Test Product',
      description: 'Product for testing all buttons',
      price: 150,
      category: categoryId,
      condition: 'new',
      location: 'Campus',
      stock: 5
    }, { headers: { Authorization: `Bearer ${sellerToken}` } });
    productId = r.data.product._id;
    console.log('   Created product ID:', productId);
  }));

  // ========== BUYER: PRODUCT ACTIONS ==========
  console.log('\n🛍️ BUYER: PRODUCT ACTIONS\n');

  results.push(await test('Product - Like Product', async () => {
    await axios.post(`${API}/products/${productId}/like`, {},
      { headers: { Authorization: `Bearer ${buyerToken}` } });
  }));

  results.push(await test('Cart - Add to Cart', async () => {
    await axios.post(`${API}/cart/items`, {
      productId: productId,
      quantity: 2
    }, { headers: { Authorization: `Bearer ${buyerToken}` } });
  }));

  // ========== CART ACTIONS ==========
  console.log('\n🛒 CART ACTIONS\n');

  results.push(await test('Cart - View Cart', async () => {
    await axios.get(`${API}/cart`, { headers: { Authorization: `Bearer ${buyerToken}` } });
  }));

  results.push(await test('Cart - Update Quantity', async () => {
    await axios.put(`${API}/cart/items/${productId}`, { quantity: 3 },
      { headers: { Authorization: `Bearer ${buyerToken}` } });
  }));

  // ========== WISHLIST ACTIONS ==========
  console.log('\n❤️ WISHLIST ACTIONS\n');

  results.push(await test('Wishlist - Add Product', async () => {
    await axios.post(`${API}/wishlist/${productId}`, {},
      { headers: { Authorization: `Bearer ${buyerToken}` } });
  }));

  results.push(await test('Wishlist - View Wishlist', async () => {
    await axios.get(`${API}/wishlist`, { headers: { Authorization: `Bearer ${buyerToken}` } });
  }));

  results.push(await test('Wishlist - Remove Product', async () => {
    await axios.delete(`${API}/wishlist/${productId}`,
      { headers: { Authorization: `Bearer ${buyerToken}` } });
  }));

  // ========== CREATE ORDER ==========
  console.log('\n💳 CREATE ORDER\n');

  results.push(await test('Orders - Create Direct Order', async () => {
    const r = await axios.post(`${API}/orders`, {
      productId: productId,
      quantity: 1,
      shippingAddress: {
        street: 'Campus Road',
        building: 'Test Building',
        room: '101'
      }
    }, { headers: { Authorization: `Bearer ${buyerToken}` } });
    orderId = r.data.order._id;
    console.log('   Created order ID:', orderId);
  }));

  // ========== ORDER ACTIONS ==========
  console.log('\n📦 ORDER ACTIONS\n');

  results.push(await test('Orders - View My Orders', async () => {
    await axios.get(`${API}/orders`, { headers: { Authorization: `Bearer ${buyerToken}` } });
  }));

  if (orderId) {
    results.push(await test('Orders - View Single Order', async () => {
      await axios.get(`${API}/orders/${orderId}`, { headers: { Authorization: `Bearer ${buyerToken}` } });
    }));
  }

  // ========== SELLER: VIEW PRODUCTS ==========
  console.log('\n📊 SELLER: VIEW PRODUCTS\n');

  results.push(await test('Seller - View My Products', async () => {
    await axios.get(`${API}/products/seller/${sellerId}`,
      { headers: { Authorization: `Bearer ${sellerToken}` } });
  }));

  // ========== MESSAGING ==========
  console.log('\n💬 MESSAGING\n');

  results.push(await test('Messages - View Conversations', async () => {
    await axios.get(`${API}/messages/conversations`,
      { headers: { Authorization: `Bearer ${buyerToken}` } });
  }));

  results.push(await test('Messages - Send Message', async () => {
    await axios.post(`${API}/messages`, {
      receiver: sellerId,
      content: 'Test message from integration test'
    }, { headers: { Authorization: `Bearer ${buyerToken}` } });
  }));

  // ========== ADMIN ACTIONS ==========
  console.log('\n🔐 ADMIN ACTIONS\n');

  results.push(await test('Admin - View All Users', async () => {
    await axios.get(`${API}/users`, { headers: { Authorization: `Bearer ${adminToken}` } });
  }));

  results.push(await test('Admin - View All Products', async () => {
    await axios.get(`${API}/products`, { headers: { Authorization: `Bearer ${adminToken}` } });
  }));

  results.push(await test('Admin - View All Orders', async () => {
    await axios.get(`${API}/orders`, { headers: { Authorization: `Bearer ${adminToken}` } });
  }));

  // ========== CLEANUP ==========
  console.log('\n🧹 CLEANUP\n');

  results.push(await test('Cleanup - Remove from Cart', async () => {
    await axios.delete(`${API}/cart/items/${productId}`,
      { headers: { Authorization: `Bearer ${buyerToken}` } });
  }));

  results.push(await test('Cleanup - Seller Delete Product', async () => {
    await axios.delete(`${API}/products/${productId}`,
      { headers: { Authorization: `Bearer ${sellerToken}` } });
  }));

  // ========== SUMMARY ==========
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${results.filter(r => r).length}`);
  console.log(`❌ Failed: ${results.filter(r => !r).length}`);
  console.log(`Success Rate: ${((results.filter(r => r).length / results.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  return results;
}

runIntegrationTest().catch(console.error);
