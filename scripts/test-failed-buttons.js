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

async function runTests() {
  console.log('=== TESTING FAILED BUTTONS ===\n');

  const results = [];

  // Login first
  const login = await axios.post(`${API}/auth/login`, {
    email: 'testbuyer@example.com',
    password: 'password123'
  });
  const buyerToken = login.data.token;

  // Seller login
  const sellerLogin = await axios.post(`${API}/auth/login`, {
    email: 'testseller@example.com',
    password: 'password123'
  });
  const sellerToken = sellerLogin.data.token;

  // Admin login
  const adminLogin = await axios.post(`${API}/auth/login`, {
    email: 'admin@market.com',
    password: 'admin123'
  });
  const adminToken = adminLogin.data.token;

  console.log('🛒 CART BUTTONS\n');
  results.push(await test('Cart - View Cart', async () => {
    await axios.get(`${API}/cart`, { headers: { Authorization: 'Bearer ' + buyerToken } });
  }));

  console.log('\n💳 CHECKOUT BUTTONS\n');
  results.push(await test('Checkout - Cart Checkout Route', async () => {
    await axios.post(`${API}/orders/checkout-cart`, {
      shippingAddress: {
        street: 'Campus Road',
        building: 'Main Building',
        room: '101'
      },
      phoneNumber: '+254700000000'
    }, { headers: { Authorization: 'Bearer ' + buyerToken } });
  }));

  console.log('\n📦 ORDERS BUTTONS\n');
  results.push(await test('Orders - View My Orders', async () => {
    await axios.get(`${API}/orders`, { headers: { Authorization: 'Bearer ' + buyerToken } });
  }));

  // Get first order ID for more tests
  try {
    const orders = await axios.get(`${API}/orders`, { headers: { Authorization: 'Bearer ' + buyerToken } });
    const orderId = orders.data.data?.[0]?._id || '67a5d7603d5e9c0012e34567';

    results.push(await test('Orders - Cancel Order', async () => {
      await axios.put(`${API}/orders/${orderId}/cancel`, {}, {
        headers: { Authorization: 'Bearer ' + buyerToken }
      });
    }));
  } catch (e) {
    console.log('⚠️ No orders found to test cancellation');
  }

  console.log('\n📊 SELLER DASHBOARD BUTTONS\n');

  // Get seller user info
  const sellerProfile = await axios.get(`${API}/auth/me`, {
    headers: { Authorization: 'Bearer ' + sellerToken }
  });
  const sellerId = sellerProfile.data.data.id;

  results.push(await test('Seller - View My Products', async () => {
    await axios.get(`${API}/products/seller/${sellerId}`, {
      headers: { Authorization: 'Bearer ' + sellerToken }
    });
  }));

  results.push(await test('Seller - Create Product', async () => {
    await axios.post(`${API}/products`, {
      title: 'Test Product',
      description: 'Test description for product',
      price: 100,
      category: 'Books',
      location: 'Campus',
      stock: 10,
      condition: 'new'
    }, { headers: { Authorization: 'Bearer ' + sellerToken } });
  }));

  console.log('\n🔐 ADMIN DASHBOARD BUTTONS\n');
  results.push(await test('Admin - View All Users', async () => {
    await axios.get(`${API}/users`, { headers: { Authorization: 'Bearer ' + adminToken } });
  }));

  // Get first user ID
  try {
    const users = await axios.get(`${API}/users`, { headers: { Authorization: 'Bearer ' + adminToken } });
    const userId = users.data.data?.[0]?._id || '67a5d7603d5e9c0012e34567';

    results.push(await test('Admin - Delete User', async () => {
      await axios.delete(`${API}/users/${userId}`, {
        headers: { Authorization: 'Bearer ' + adminToken }
      });
    }));
  } catch (e) {
    console.log('⚠️ Could not test delete user');
  }

  console.log('\n💬 MESSAGING BUTTONS\n');
  results.push(await test('Messages - View Conversations', async () => {
    await axios.get(`${API}/messages/conversations`, {
      headers: { Authorization: 'Bearer ' + buyerToken }
    });
  }));

  console.log('\n❤️ WISHLIST BUTTONS\n');
  results.push(await test('Wishlist - View Wishlist', async () => {
    await axios.get(`${API}/wishlist`, { headers: { Authorization: 'Bearer ' + buyerToken } });
  }));

  // Get products for wishlist test
  const products = await axios.get(`${API}/products`);
  const productId = products.data.data?.[0]?._id || '67a5d7603d5e9c0012e34567';

  results.push(await test('Wishlist - Add to Wishlist', async () => {
    await axios.post(`${API}/wishlist/${productId}`, {}, {
      headers: { Authorization: 'Bearer ' + buyerToken }
    });
  }));

  results.push(await test('Wishlist - Remove from Wishlist', async () => {
    await axios.delete(`${API}/wishlist/${productId}`, {
      headers: { Authorization: 'Bearer ' + buyerToken }
    });
  }));

  console.log('\n' + '='.repeat(50));
  console.log('RESULTS: ' + results.filter(r => r).length + '/' + results.length + ' passed');
  console.log('='.repeat(50));
}

runTests().catch(console.error);
