const axios = require('axios');

const API = 'http://localhost:5000/api';
let buyerToken, sellerToken, adminToken;

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

async function runTests() {
  console.log('=== COMPREHENSIVE BUTTON TEST REPORT ===\n');

  const results = [];

  // ========== AUTHENTICATION ==========
  console.log('📱 AUTHENTICATION BUTTONS\n');

  results.push(await test('Register - Create Account (Buyer)', async () => {
    const r = await axios.post(`${API}/auth/register`, {
      name: 'Test Buyer',
      email: `buyer${Date.now()}@test.com`,
      password: 'Test123!',
      phone: '0712345678',
      role: 'buyer',
      location: 'Campus'
    });
  }));

  results.push(await test('Register - Create Account (Seller)', async () => {
    const r = await axios.post(`${API}/auth/register`, {
      name: 'Test Seller',
      email: `seller${Date.now()}@test.com`,
      password: 'Test123!',
      phone: '0712345679',
      role: 'seller',
      location: 'Campus'
    });
  }));

  results.push(await test('Login - Sign In (Invalid credentials rejected)', async () => {
    const err = await axios.post(`${API}/auth/login`, { email: 'wrong@test.com', password: 'wrong' })
      .catch(e => e);
    if (err.response?.status !== 401) throw new Error('Should reject invalid credentials');
  }));

  results.push(await test('Login - Sign In (Admin)', async () => {
    const r = await axios.post(`${API}/auth/login`, {
      email: 'admin@market.com',
      password: 'admin123'
    });
    adminToken = r.data.token;
  }));

  results.push(await test('Login - Sign In (Buyer)', async () => {
    const r = await axios.post(`${API}/auth/login`, {
      email: 'testbuyer@example.com',
      password: 'password123'
    });
    buyerToken = r.data.token;
  }));

  // ========== PRODUCT CARD BUTTONS ==========
  console.log('\n🛍️ PRODUCT CARD BUTTONS\n');

  results.push(await test('Product Listing - Load Products', async () => {
    await axios.get(`${API}/products`);
  }));

  if (buyerToken) {
    results.push(await test('Product Card - Add to Cart', async () => {
      await axios.post(`${API}/cart/items`, {
        productId: '67a5d7603d5e9c0012e34567',
        quantity: 1
      }, { headers: { Authorization: `Bearer ${buyerToken}` } });
    }));

    results.push(await test('Product Card - Like Product', async () => {
      await axios.post(`${API}/products/67a5d7603d5e9c0012e34567/like`, {},
        { headers: { Authorization: `Bearer ${buyerToken}` } });
    }));
  }

  // ========== SHOPPING CART ==========
  console.log('\n🛒 SHOPPING CART BUTTONS\n');

  if (buyerToken) {
    results.push(await test('Cart - View Cart', async () => {
      await axios.get(`${API}/cart`, { headers: { Authorization: `Bearer ${buyerToken}` } });
    }));

    results.push(await test('Cart - Update Quantity', async () => {
      await axios.put(`${API}/cart/items/67a5d7603d5e9c0012e34567`, { quantity: 2 },
        { headers: { Authorization: `Bearer ${buyerToken}` } });
    }));

    results.push(await test('Cart - Remove Item', async () => {
      await axios.delete(`${API}/cart/items/67a5d7603d5e9c0012e34567`,
        { headers: { Authorization: `Bearer ${buyerToken}` } });
    }));
  }

  // ========== CHECKOUT ==========
  console.log('\n💳 CHECKOUT BUTTONS\n');

  if (buyerToken) {
    results.push(await test('Checkout - Place Order', async () => {
      await axios.post(`${API}/orders`, {
        productId: '67a5d7603d5e9c0012e34567',
        quantity: 1,
        shippingAddress: 'Campus Room 101'
      }, { headers: { Authorization: `Bearer ${buyerToken}` } });
    }));

    results.push(await test('Cart - Checkout All Items', async () => {
      await axios.post(`${API}/orders/checkout-cart`, {
        shippingAddress: {
          street: 'Campus Road',
          building: 'Main Building',
          room: '101'
        },
        phoneNumber: '+254700000000'
      }, { headers: { Authorization: `Bearer ${buyerToken}` } });
    }));
  }

  // ========== ORDERS ==========
  console.log('\n📦 ORDERS BUTTONS\n');

  if (buyerToken) {
    results.push(await test('Orders - View My Orders', async () => {
      await axios.get(`${API}/orders`, { headers: { Authorization: `Bearer ${buyerToken}` } });
    }));

    results.push(await test('Orders - Cancel Order', async () => {
      await axios.put(`${API}/orders/67a5d7603d5e9c0012e34567/cancel`, {},
        { headers: { Authorization: `Bearer ${buyerToken}` } });
    }));
  }

  // ========== SELLER PRODUCTS ==========
  console.log('\n📊 SELLER DASHBOARD BUTTONS\n');

  if (sellerToken || buyerToken) {
    const token = sellerToken || buyerToken;
    results.push(await test('Seller - Create Product', async () => {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('title', 'Test Product');
      form.append('description', 'Test description');
      form.append('price', '100');
      form.append('category', 'books');
      form.append('condition', 'new');
      form.append('location', 'Campus');
      form.append('isNegotiable', 'true');
      await axios.post(`${API}/products`, form, {
        headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() }
      });
    }));

    results.push(await test('Seller - View My Products', async () => {
      await axios.get(`${API}/products/seller/john123`, { headers: { Authorization: `Bearer ${token}` } });
    }));

    results.push(await test('Seller - Delete Product', async () => {
      await axios.delete(`${API}/products/67a5d7603d5e9c0012e34567`,
        { headers: { Authorization: `Bearer ${token}` } });
    }));
  }

  // ========== ADMIN BUTTONS ==========
  console.log('\n🔐 ADMIN DASHBOARD BUTTONS\n');

  if (adminToken) {
    results.push(await test('Admin - View All Users', async () => {
      await axios.get(`${API}/users`, { headers: { Authorization: `Bearer ${adminToken}` } });
    }));

    results.push(await test('Admin - Delete User', async () => {
      await axios.delete(`${API}/users/67a5d7603d5e9c0012e34567`,
        { headers: { Authorization: `Bearer ${adminToken}` } });
    }));
  }

  // ========== MESSAGES ==========
  console.log('\n💬 MESSAGING BUTTONS\n');

  if (buyerToken) {
    results.push(await test('Messages - View Conversations', async () => {
      await axios.get(`${API}/messages/conversations`, { headers: { Authorization: `Bearer ${buyerToken}` } });
    }));

    results.push(await test('Messages - Send Message', async () => {
      await axios.post(`${API}/messages`, {
        receiver: '67a5d7603d5e9c0012e34567',
        content: 'Test message'
      }, { headers: { Authorization: `Bearer ${buyerToken}` } });
    }));
  }

  // ========== WISHLIST ==========
  console.log('\n❤️ WISHLIST BUTTONS\n');

  if (buyerToken) {
    results.push(await test('Wishlist - View Wishlist', async () => {
      await axios.get(`${API}/wishlist`, { headers: { Authorization: `Bearer ${buyerToken}` } });
    }));

    results.push(await test('Wishlist - Remove from Wishlist', async () => {
      await axios.delete(`${API}/wishlist/67a5d7603d5e9c0012e34567`,
        { headers: { Authorization: `Bearer ${buyerToken}` } });
    }));
  }

  // ========== SUMMARY ==========
  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));
  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
}

runTests().catch(console.error);
