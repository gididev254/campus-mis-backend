/**
 * Test helper functions
 */

const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const Order = require('../../models/Order');

/**
 * Generate a valid JWT token for testing
 * @param {string} userId - User ID to encode in token
 * @returns {string} JWT token
 */
exports.generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '1h' }
  );
};

/**
 * Create a test user in database
 * @param {Object} overrides - User properties to override defaults
 * @returns {Promise<User>} Created user
 */
exports.createTestUser = async (overrides = {}) => {
  const userData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'TestPassword123!',
    phone: '+254712345678',
    role: 'buyer',
    ...overrides
  };

  // Ensure email is unique
  if (overrides.email) {
    userData.email = overrides.email;
  } else {
    userData.email = `test-${Date.now()}@example.com`;
  }

  const user = await User.create(userData);
  return user;
};

/**
 * Create test users with different roles
 * @returns {Promise<Object>} Object containing buyer, seller, and admin users
 */
exports.createTestUsers = async () => {
  const buyer = await User.create({
    name: 'Test Buyer',
    email: `buyer-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    phone: '+254711111111',
    role: 'buyer',
    location: 'Hostel A'
  });

  const seller = await User.create({
    name: 'Test Seller',
    email: `seller-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    phone: '+254722222222',
    role: 'seller',
    location: 'Hostel B'
  });

  const admin = await User.create({
    name: 'Test Admin',
    email: `admin-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    phone: '+254733333333',
    role: 'admin',
    location: 'Admin Office'
  });

  return { buyer, seller, admin };
};

/**
 * Create a test category
 * @param {Object} overrides - Category properties to override
 * @returns {Promise<Category>} Created category
 */
exports.createTestCategory = async (overrides = {}) => {
  const categoryData = {
    name: 'Test Category',
    slug: `test-category-${Date.now()}`,
    description: 'A test category',
    icon: 'test-icon',
    ...overrides
  };

  const category = await Category.create(categoryData);
  return category;
};

/**
 * Create a test product
 * @param {Object} overrides - Product properties to override
 * @returns {Promise<Product>} Created product
 */
exports.createTestProduct = async (overrides = {}) => {
  // Create seller if not provided
  let seller = overrides.seller;
  if (!seller) {
    seller = await exports.createTestUser({ role: 'seller' });
  }

  // Create category if not provided
  let category = overrides.category;
  if (!category) {
    category = await exports.createTestCategory();
  }

  const productData = {
    title: 'Test Product',
    description: 'A test product description',
    price: 1000,
    seller: seller._id,
    category: category._id,
    location: 'Campus Center',
    images: ['https://example.com/image.jpg'],
    ...overrides
  };

  const product = await Product.create(productData);
  return product;
};

/**
 * Create a test order
 * @param {Object} overrides - Order properties to override
 * @returns {Promise<Order>} Created order
 */
exports.createTestOrder = async (overrides = {}) => {
  // Create buyer and seller if not provided
  let buyer = overrides.buyer;
  if (!buyer) {
    buyer = await exports.createTestUser({ role: 'buyer' });
  }

  let seller = overrides.seller;
  if (!seller) {
    seller = await exports.createTestUser({ role: 'seller' });
  }

  // Create product if not provided
  let product = overrides.product;
  if (!product) {
    product = await exports.createTestProduct({ seller: seller._id });
  }

  const orderData = {
    buyer: buyer._id,
    seller: seller._id,
    product: product._id,
    quantity: 1,
    totalPrice: product.price,
    ...overrides
  };

  const order = await Order.create(orderData);
  return order;
};

/**
 * Create auth headers for requests
 * @param {string} token - JWT token
 * @returns {Object} Headers object with Authorization
 */
exports.authHeaders = (token) => {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Mock Express request object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock request object
 */
exports.mockRequest = (overrides = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
    get: jest.fn((header) => {
      const headers = {
        'user-agent': 'test-agent',
        ...overrides.headers
      };
      return headers[header.toLowerCase()];
    }),
    ...overrides
  };
};

/**
 * Mock Express response object
 * @returns {Object} Mock response object with chained methods
 */
exports.mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Mock Express next function
 * @returns {Function} Mock next function
 */
exports.mockNext = () => jest.fn();
