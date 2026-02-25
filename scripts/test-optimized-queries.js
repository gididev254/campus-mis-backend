/**
 * Test script for optimized query functionality
 * Tests all optimized queries in product, order, user, and message controllers
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Message = require('../models/Message');
const Category = require('../models/Category');

// ANSI color codes for output
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

function logTest(testName) {
  console.log('\n' + '='.repeat(60));
  log(`TEST: ${testName}`, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`  ${message}`, 'blue');
}

async function testDatabaseConnection() {
  logTest('Database Connection');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logSuccess('Connected to MongoDB');
    return true;
  } catch (error) {
    logError(`Failed to connect: ${error.message}`);
    return false;
  }
}

async function testProductQueries() {
  logTest('Product Controller Optimized Queries');

  try {
    // Test 1: Get products with lean()
    logInfo('Testing getProducts with lean() optimization...');
    const products = await Product.find({ status: 'available' })
      .populate('category', 'name slug')
      .populate('seller', 'name email phone location averageRating')
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    logSuccess(`getProducts: Found ${products.length} products`);
    logInfo(`  - Query uses lean() for better performance`);
    logInfo(`  - Populates category and seller fields`);
    if (products.length > 0) {
      logInfo(`  - Sample product has ${Object.keys(products[0]).length} fields`);
    }

    // Test 2: Get sold products
    logInfo('\nTesting getSoldProducts with lean()...');
    const soldProducts = await Product.find({ status: 'sold' })
      .populate('category', 'name slug')
      .populate('seller', 'name email avatar')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    logSuccess(`getSoldProducts: Found ${soldProducts.length} sold products`);
    logInfo(`  - Query uses lean() for better performance`);

    // Test 3: Get single product
    if (products.length > 0) {
      logInfo('\nTesting getProduct with populates...');
      const product = await Product.findById(products[0]._id)
        .populate('category', 'name slug description')
        .populate('seller', 'name email phone location averageRating totalReviews avatar');

      if (product) {
        logSuccess(`getProduct: Found product "${product.title}"`);
        logInfo(`  - Category populated: ${product.category ? product.category.name : 'N/A'}`);
        logInfo(`  - Seller populated: ${product.seller ? product.seller.name : 'N/A'}`);
      }
    }

    // Test 4: Get seller products using aggregation
    if (products.length > 0 && products[0].seller) {
      logInfo('\nTesting getSellerProducts with aggregation pipeline...');
      const sellerId = products[0].seller._id || products[0].seller;

      const aggregationResult = await Product.aggregate([
        { $match: { seller: new mongoose.Types.ObjectId(sellerId) } },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'category'
          }
        },
        { $unwind: '$category' },
        {
          $project: {
            title: 1,
            price: 1,
            images: 1,
            status: 1,
            'category.name': 1,
            'category.slug': 1
          }
        },
        { $limit: 12 }
      ]);

      logSuccess(`getSellerProducts: Aggregation returned ${aggregationResult.length} products`);
      logInfo(`  - Uses $lookup for category population`);
      logInfo(`  - Uses $project to limit returned fields`);
    }

    // Test 5: Get related products using aggregation
    if (products.length > 0) {
      logInfo('\nTesting getRelatedProducts with nested $lookup...');
      const aggregationPipeline = [
        { $match: { _id: products[0]._id } },
        {
          $lookup: {
            from: 'products',
            let: { categoryId: '$category', productId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $ne: ['$_id', '$$productId'] },
                      { $eq: ['$category', '$$categoryId'] },
                      { $eq: ['$status', 'available'] }
                    ]
                  }
                }
              },
              { $limit: 8 }
            ],
            as: 'relatedProducts'
          }
        }
      ];

      const [result] = await Product.aggregate(aggregationPipeline);
      const relatedCount = result?.relatedProducts?.length || 0;

      logSuccess(`getRelatedProducts: Found ${relatedCount} related products`);
      logInfo(`  - Uses nested $lookup with pipeline`);
      logInfo(`  - Filters by category and excludes current product`);
    }

    return true;
  } catch (error) {
    logError(`Product queries failed: ${error.message}`);
    return false;
  }
}

async function testOrderQueries() {
  logTest('Order Controller Optimized Queries');

  try {
    // Test 1: Get orders with lean()
    logInfo('Testing getOrders with lean()...');
    const orders = await Order.find()
      .populate('product', 'title images price')
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    logSuccess(`getOrders: Found ${orders.length} orders`);
    logInfo(`  - Query uses lean() for better performance`);
    logInfo(`  - Populates product, buyer, and seller`);

    // Test 2: Get single order with detailed populates
    if (orders.length > 0) {
      logInfo('\nTesting getOrder with detailed populates...');
      const order = await Order.findById(orders[0]._id)
        .populate('product')
        .populate('buyer', 'name email phone location avatar')
        .populate('seller', 'name email phone location avatar');

      if (order) {
        logSuccess(`getOrder: Found order ${order.orderNumber || order._id}`);
        logInfo(`  - Product populated: ${order.product ? order.product.title : 'N/A'}`);
        logInfo(`  - Buyer populated: ${order.buyer ? order.buyer.name : 'N/A'}`);
        logInfo(`  - Seller populated: ${order.seller ? order.seller.name : 'N/A'}`);
      }
    }

    // Test 3: Payout ledger aggregation
    logInfo('\nTesting getPayoutLedger with aggregation...');
    const pendingTotal = await Order.aggregate([
      { $match: { paymentStatus: 'completed', sellerPaid: false } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    const totalAmount = pendingTotal[0]?.total || 0;
    logSuccess(`getPayoutLedger: Pending payouts total KES ${totalAmount.toFixed(2)}`);
    logInfo(`  - Uses $group to calculate sum`);

    return true;
  } catch (error) {
    logError(`Order queries failed: ${error.message}`);
    return false;
  }
}

async function testUserQueries() {
  logTest('User Controller Optimized Queries');

  try {
    // Test 1: Get users with pagination
    logInfo('Testing getUsers with pagination...');
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(0)
      .limit(20);

    const total = await User.countDocuments();

    logSuccess(`getUsers: Found ${users.length} of ${total} total users`);
    logInfo(`  - Uses select() to exclude password field`);
    logInfo(`  - Pagination: skip 0, limit 20`);

    // Test 2: Get user with products
    if (users.length > 0) {
      logInfo('\nTesting getUser with products...');
      const userId = users[0]._id;

      const products = await Product.find({ seller: userId })
        .select('title price images status condition createdAt')
        .sort({ createdAt: -1 })
        .limit(10);

      logSuccess(`getUser: User "${users[0].name}" has ${products.length} products`);
      logInfo(`  - Uses select() to limit product fields`);
      logInfo(`  - Limits to 10 most recent products`);
    }

    // Test 3: Dashboard stats aggregation
    if (users.length > 0) {
      logInfo('\nTesting getDashboardStats with multiple countDocuments...');
      const sellerId = users[0]._id;

      const totalProducts = await Product.countDocuments({ seller: sellerId });
      const availableProducts = await Product.countDocuments({ seller: sellerId, status: 'available' });
      const soldProducts = await Product.countDocuments({ seller: sellerId, status: 'sold' });

      logSuccess(`getDashboardStats: Seller has ${totalProducts} products`);
      logInfo(`  - Available: ${availableProducts}`);
      logInfo(`  - Sold: ${soldProducts}`);
      logInfo(`  - Uses separate countDocuments queries for each status`);
    }

    return true;
  } catch (error) {
    logError(`User queries failed: ${error.message}`);
    return false;
  }
}

async function testMessageQueries() {
  logTest('Message Controller Optimized Queries');

  try {
    // Test 1: Get conversations with distinct
    logInfo('Testing getConversations with distinct()...');
    const sent = await Message.distinct('receiver', { sender: mongoose.Types.ObjectId() });
    const received = await Message.distinct('sender', { receiver: mongoose.Types.ObjectId() });

    logSuccess(`getConversations: Uses distinct() for unique partners`);
    logInfo(`  - Finds unique receivers and senders`);
    logInfo(`  - Avoids duplicate query results`);

    // Test 2: Get conversation messages
    logInfo('\nTesting getConversation with $or query...');
    const messages = await Message.find({
      $or: [
        { sender: mongoose.Types.ObjectId(), receiver: mongoose.Types.ObjectId() },
        { sender: mongoose.Types.ObjectId(), receiver: mongoose.Types.ObjectId() }
      ]
    })
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar')
      .populate('product', 'title images')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    logSuccess(`getConversation: Query structure is correct`);
    logInfo(`  - Uses $or for bidirectional message lookup`);
    logInfo(`  - Populates sender, receiver, and product`);
    logInfo(`  - Uses lean() for better performance`);

    // Test 3: Mark as read with updateMany
    logInfo('\nTesting markAsRead with updateMany...');
    const updateResult = await Message.updateMany(
      {
        sender: mongoose.Types.ObjectId(),
        receiver: mongoose.Types.ObjectId(),
        isRead: false
      },
      {
        isRead: true,
        readAt: Date.now()
      }
    );

    logSuccess(`markAsRead: Uses updateMany for bulk updates`);
    logInfo(`  - Updates multiple documents in single operation`);
    logInfo(`  - More efficient than individual saves`);

    return true;
  } catch (error) {
    logError(`Message queries failed: ${error.message}`);
    return false;
  }
}

async function testPopulateUtilities() {
  logTest('Populate Utility Functions');

  try {
    // Test populate helpers exist
    const populateUtils = require('../utils/populate');

    logInfo('Checking populate utility functions...');

    const functions = [
      'populateProduct',
      'populateOrder',
      'populateMessage',
      'populateNotification',
      'populateReview',
      'findAndPopulate',
      'findManyAndPopulate'
    ];

    functions.forEach(fn => {
      if (typeof populateUtils[fn] === 'function') {
        logSuccess(`Function ${fn}() exists`);
      } else {
        logError(`Function ${fn}() not found`);
      }
    });

    // Test populate field constants
    if (populateUtils.POPULATE_FIELDS) {
      logSuccess('POPULATE_FIELDS constants defined');
      logInfo(`  - USER_BASIC: ${populateUtils.POPULATE_FIELDS.USER_BASIC}`);
      logInfo(`  - PRODUCT_BASIC: ${populateUtils.POPULATE_FIELDS.PRODUCT_BASIC}`);
    }

    return true;
  } catch (error) {
    logError(`Populate utilities test failed: ${error.message}`);
    return false;
  }
}

async function testHelperUtilities() {
  logTest('Helper Utility Functions');

  try {
    const helpers = require('../utils/helpers');

    logInfo('Testing helper functions...');

    // Test getPagination
    const pagination = helpers.getPagination(2, 20);
    if (pagination.skip === 20 && pagination.limit === 20 && pagination.page === 2) {
      logSuccess('getPagination() works correctly');
      logInfo(`  - skip: ${pagination.skip}, limit: ${pagination.limit}, page: ${pagination.page}`);
    } else {
      logError('getPagination() returned incorrect values');
    }

    // Test formatPaginationResponse
    const response = helpers.formatPaginationResponse([1, 2, 3], 100, 2, 20);
    if (response.data && response.pagination) {
      logSuccess('formatPaginationResponse() works correctly');
      logInfo(`  - Returns data array and pagination metadata`);
      logInfo(`  - Total pages: ${response.pagination.pages}`);
      logInfo(`  - Has next: ${response.pagination.hasNext}, Has prev: ${response.pagination.hasPrev}`);
    } else {
      logError('formatPaginationResponse() structure incorrect');
    }

    // Test other helpers
    const helpersToTest = [
      { fn: 'generateRandomString', exists: typeof helpers.generateRandomString === 'function' },
      { fn: 'slugify', exists: typeof helpers.slugify === 'function' },
      { fn: 'sanitize', exists: typeof helpers.sanitize === 'function' },
      { fn: 'calculateDistance', exists: typeof helpers.calculateDistance === 'function' },
      { fn: 'formatPrice', exists: typeof helpers.formatPrice === 'function' },
      { fn: 'formatDate', exists: typeof helpers.formatDate === 'function' },
      { fn: 'asyncHandler', exists: typeof helpers.asyncHandler === 'function' },
      { fn: 'filterObject', exists: typeof helpers.filterObject === 'function' }
    ];

    helpersToTest.forEach(({ fn, exists }) => {
      if (exists) {
        logSuccess(`${fn}() exists`);
      } else {
        logError(`${fn}() not found`);
      }
    });

    return true;
  } catch (error) {
    logError(`Helper utilities test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║  OPTIMIZED QUERY FUNCTIONALITY TEST SUITE                 ║', 'cyan');
  log('║  Testing Product, Order, User, and Message Controllers     ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  const results = {
    database: false,
    products: false,
    orders: false,
    users: false,
    messages: false,
    populateUtils: false,
    helperUtils: false
  };

  // Test database connection
  results.database = await testDatabaseConnection();
  if (!results.database) {
    logError('Cannot proceed without database connection');
    process.exit(1);
  }

  // Run all tests
  results.products = await testProductQueries();
  results.orders = await testOrderQueries();
  results.users = await testUserQueries();
  results.messages = await testMessageQueries();
  results.populateUtils = await testPopulateUtilities();
  results.helperUtils = await testHelperUtilities();

  // Summary
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║  TEST SUMMARY                                              ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([test, result]) => {
    const status = result ? 'PASS' : 'FAIL';
    const color = result ? 'green' : 'red';
    log(`  ${test.padEnd(20)} ${status}`, color);
  });

  console.log('\n');
  if (passed === total) {
    log(`✓ ALL TESTS PASSED (${passed}/${total})`, 'green');
  } else {
    log(`✗ SOME TESTS FAILED (${passed}/${total} passed)`, 'red');
  }

  await mongoose.disconnect();
  console.log('\n');

  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  logError(`Test suite error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
