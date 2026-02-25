const axios = require('axios');

async function testCartAPI() {
  console.log('=== TESTING CART API WITH CORRECT ENDPOINTS ===\n');

  try {
    // Login as buyer
    const login = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'testbuyer@example.com',
      password: 'password123'
    });
    const token = login.data.token;
    console.log('✅ Logged in as buyer');

    // Get products
    const products = await axios.get('http://localhost:5000/api/products');
    const product = products.data.data?.[0];
    if (!product) {
      console.log('⚠️ No products found');
      return;
    }
    console.log('✅ Found product:', product.name);

    // Test 1: Get Cart
    console.log('\n1. GET /api/cart - View Cart');
    try {
      const cart = await axios.get('http://localhost:5000/api/cart', {
        headers: { Authorization: 'Bearer ' + token }
      });
      console.log('✅ GET Cart - Works!');
      console.log('   Cart items:', cart.data.data?.cartItems?.length || 0);
    } catch (e) {
      console.log('❌ GET Cart -', e.response?.data?.message || e.message);
    }

    // Test 2: Add Item
    console.log('\n2. POST /api/cart/items - Add to Cart');
    try {
      const added = await axios.post('http://localhost:5000/api/cart/items', {
        productId: product._id,
        quantity: 1
      }, { headers: { Authorization: 'Bearer ' + token } });
      console.log('✅ Add to Cart - Works!');
    } catch (e) {
      console.log('❌ Add to Cart -', e.response?.data?.message || e.message);
    }

    // Test 3: Update Quantity
    console.log('\n3. PUT /api/cart/items/:productId - Update Quantity');
    try {
      const updated = await axios.put('http://localhost:5000/api/cart/items/' + product._id, {
        quantity: 2
      }, { headers: { Authorization: 'Bearer ' + token } });
      console.log('✅ Update Quantity - Works!');
    } catch (e) {
      console.log('❌ Update Quantity -', e.response?.data?.message || e.message);
    }

    // Test 4: Remove Item
    console.log('\n4. DELETE /api/cart/items/:productId - Remove Item');
    try {
      const removed = await axios.delete('http://localhost:5000/api/cart/items/' + product._id, {
        headers: { Authorization: 'Bearer ' + token }
      });
      console.log('✅ Remove Item - Works!');
    } catch (e) {
      console.log('❌ Remove Item -', e.response?.data?.message || e.message);
    }

    // Test 5: Checkout
    console.log('\n5. POST /api/orders/checkout - Checkout Cart');
    try {
      const checkout = await axios.post('http://localhost:5000/api/orders/checkout', {
        shippingAddress: 'Campus Dorms, Room 123'
      }, { headers: { Authorization: 'Bearer ' + token } });
      console.log('✅ Checkout - Works!');
    } catch (e) {
      console.log('❌ Checkout -', e.response?.data?.message || e.message);
    }

  } catch (e) {
    console.log('❌ Setup failed:', e.message);
  }
}

testCartAPI();
