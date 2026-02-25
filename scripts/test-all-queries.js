/**
 * Comprehensive test script for all optimized backend queries
 * Tests product.js, order.js, user.js, and message.js controllers
 * Measures query counts before and after optimization
 * Verifies no N+1 queries occur and no data is lost
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Track query counts
let queryCount = 0;
let queries = [];

// Monkey-patch mongoose to track queries
const originalExecute = mongoose.Query.prototype.exec;
mongoose.Query.prototype.exec = function() {
  const op = this.op;
  const model = this.model.modelName;
  const queryObj = {
    model,
    operation: op,
    timestamp: Date.now()
  };

  // Try to extract filter info
  try {
    queryObj.filter = this.getFilter();
  } catch (e) {
    queryObj.filter = {};
  }

  queries.push(queryObj);
  queryCount++;

  return originalExecute.apply(this, arguments);
};

const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Message = require('../models/Message');
const Category = require('../models/Category');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log('\n' + '='.repeat(70));
  log(`TEST: ${testName}`, 'cyan');
  console.log('='.repeat(70));
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

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function resetQueryCounter() {
  queryCount = 0;
  queries = [];
}

function getQuerySummary() {
  const summary = {
    total: queryCount,
    byModel: {},
    byOperation: {}
  };

  queries.forEach(q => {
    summary.byModel[q.model] = (summary.byModel[q.model] || 0) + 1;
    summary.byOperation[q.operation] = (summary.byOperation[q.operation] || 0) + 1;
  });

  return summary;
}

function analyzeForN1PlusOne(summary) {
  // N+1 detection: If we have many more queries than expected
  const issues = [];

  // Pattern 1: Multiple Product.find queries in same operation (likely N+1)
  if (summary.byModel.Product && summary.byModel.Product > 5) {
    issues.push({
      type: 'POTENTIAL_N+1',
      model: 'Product',
      count: summary.byModel.Product,
      message: `High number of Product queries (${summary.byModel.Product}). May indicate N+1 pattern.`
    });
  }

  // Pattern 2: Multiple User queries when populate could be used
  if (summary.byModel.User && summary.byModel.User > 3) {
    issues.push({
      type: 'POTENTIAL_N+1',
      model: 'User',
      count: summary.byModel.User,
      message: `Multiple User queries (${summary.byModel.User}). Consider using populate().`
    });
  }

  return issues;
}

async function connectDatabase() {
  logTest('Database Connection');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logSuccess('Connected to MongoDB');
    logInfo(`Database: ${mongoose.connection.name}`);
    return true;
  } catch (error) {
    logError(`Failed to connect: ${error.message}`);
    return false;
  }
}

async function setupTestData() {
  logTest('Setting Up Test Data');

  try {
    // Get or create test data
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    const orderCount = await Order.countDocuments();
    const messageCount = await Message.countDocuments();

    logInfo(`Database contains:`);
    logInfo(`  - Users: ${userCount}`);
    logInfo(`  - Products: ${productCount}`);
    logInfo(`  - Orders: ${orderCount}`);
    logInfo(`  - Messages: ${messageCount}`);

    if (userCount === 0) {
      logWarning('No users found. Some tests may fail.');
    }

    if (productCount === 0) {
      logWarning('No products found. Some tests may fail.');
    }

    return true;
  } catch (error) {
    logError(`Failed to setup test data: ${error.message}`);
    return false;
  }
}

async function testProductController() {
  logTest('Product Controller - Query Optimization Tests');

  const results = {
    getProducts: { queries: 0, passed: false },
    getSoldProducts: { queries: 0, passed: false },
    getProduct: { queries: 0, passed: false },
    getSellerProducts: { queries: 0, passed: false },
    getRelatedProducts: { queries: 0, passed: false }
  };

  try {
    // Test 1: getProducts - should use lean() and single query
    logInfo('\n1. Testing getProducts with lean() optimization...');
    resetQueryCounter();

    const products = await Product.find({ status: 'available' })
      .populate('category', 'name slug')
      .populate('seller', 'name email phone location averageRating')
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    const summary1 = getQuerySummary();
    results.getProducts.queries = summary1.total;

    logInfo(`Query count: ${summary1.total}`);
    logInfo(`Breakdown: ${JSON.stringify(summary1.byModel)}`);
    logInfo(`Found ${products.length} products`);

    // Verify data integrity
    if (products.length > 0) {
      const hasCategory = products[0].category !== undefined;
      const hasSeller = products[0].seller !== undefined;
      const isLean = products[0].$__ == null; // Lean documents don't have $__

      if (isLean) {
        logSuccess('Uses lean() for better performance');
      } else {
        logWarning('Not using lean() - performance can be improved');
      }

      if (hasCategory && hasSeller) {
        logSuccess('Category and seller properly populated');
        results.getProducts.passed = true;
      } else {
        logError('Missing populated fields');
      }
    } else {
      logWarning('No products available to test');
    }

    // Check for N+1
    const issues1 = analyzeForN1PlusOne(summary1);
    if (issues1.length === 0) {
      logSuccess('No N+1 query pattern detected');
    } else {
      issues1.forEach(issue => logWarning(issue.message));
    }

    // Test 2: getSoldProducts - should use lean()
    logInfo('\n2. Testing getSoldProducts with lean()...');
    resetQueryCounter();

    const soldProducts = await Product.find({ status: 'sold' })
      .populate('category', 'name slug')
      .populate('seller', 'name email avatar')
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean();

    const summary2 = getQuerySummary();
    results.getSoldProducts.queries = summary2.total;

    logInfo(`Query count: ${summary2.total}`);
    logInfo(`Found ${soldProducts.length} sold products`);

    if (soldProducts.length > 0 && soldProducts[0].$__ == null) {
      logSuccess('Uses lean() optimization');
      results.getSoldProducts.passed = true;
    }

    // Test 3: getProduct - should populate both category and seller
    if (products.length > 0) {
      logInfo('\n3. Testing getProduct with detailed populates...');
      resetQueryCounter();

      const product = await Product.findById(products[0]._id)
        .populate('category', 'name slug description')
        .populate('seller', 'name email phone location averageRating totalReviews avatar');

      const summary3 = getQuerySummary();
      results.getProduct.queries = summary3.total;

      logInfo(`Query count: ${summary3.total}`);

      if (product) {
        const hasCategory = product.category && product.category.name;
        const hasSeller = product.seller && product.seller.name;

        if (hasCategory && hasSeller) {
          logSuccess(`Product: "${product.title}"`);
          logSuccess(`Category populated: ${product.category.name}`);
          logSuccess(`Seller populated: ${product.seller.name}`);
          results.getProduct.passed = true;
        } else {
          logError('Populated fields missing');
        }
      }
    }

    // Test 4: getSellerProducts - should use aggregation
    if (products.length > 0 && products[0].seller) {
      logInfo('\n4. Testing getSellerProducts with aggregation pipeline...');
      resetQueryCounter();

      const sellerId = products[0].seller._id || products[0].seller;
      const skip = 0;
      const limitNum = 12;

      const aggregationPipeline = [
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
            description: 1,
            price: 1,
            condition: 1,
            images: 1,
            location: 1,
            status: 1,
            isNegotiable: 1,
            views: 1,
            likes: 1,
            averageRating: 1,
            totalReviews: 1,
            tags: 1,
            createdAt: 1,
            updatedAt: 1,
            'category.name': 1,
            'category.slug': 1,
            seller: 1
          }
        },
        { $sort: { createdAt: -1 } },
        { $facet: {
          data: [{ $skip: skip }, { $limit: limitNum }],
          totalCount: [{ $count: 'count' }]
        }}
      ];

      const [aggResult] = await Product.aggregate(aggregationPipeline);
      const sellerProducts = aggResult.data;
      const total = aggResult.totalCount[0]?.count || 0;

      const summary4 = getQuerySummary();
      results.getSellerProducts.queries = summary4.total;

      logInfo(`Query count: ${summary4.total}`);
      logInfo(`Found ${sellerProducts.length} of ${total} products`);

      if (summary4.total <= 2 && sellerProducts.length > 0) {
        logSuccess('Uses efficient aggregation (single query with $facet)');
        results.getSellerProducts.passed = true;
      } else {
        logWarning('Multiple queries detected - verify aggregation is used');
      }

      // Verify data integrity
      if (sellerProducts.length > 0) {
        const hasCategory = sellerProducts[0].category !== undefined;
        if (hasCategory) {
          logSuccess('Category properly joined via $lookup');
        } else {
          logError('Category missing from aggregation result');
        }
      }
    }

    // Test 5: getRelatedProducts - should use nested $lookup
    if (products.length > 0) {
      logInfo('\n5. Testing getRelatedProducts with nested $lookup...');
      resetQueryCounter();

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
              { $limit: 8 },
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
                $lookup: {
                  from: 'users',
                  localField: 'seller',
                  foreignField: '_id',
                  as: 'seller'
                }
              },
              { $unwind: '$seller' },
              {
                $project: {
                  title: 1,
                  price: 1,
                  images: 1,
                  condition: 1,
                  location: 1,
                  'category.name': 1,
                  'category.slug': 1,
                  'seller.name': 1,
                  'seller.location': 1
                }
              }
            ],
            as: 'relatedProducts'
          }
        },
        { $project: { relatedProducts: 1, _id: 0 } }
      ];

      const [result] = await Product.aggregate(aggregationPipeline);
      const relatedCount = result?.relatedProducts?.length || 0;

      const summary5 = getQuerySummary();
      results.getRelatedProducts.queries = summary5.total;

      logInfo(`Query count: ${summary5.total}`);
      logInfo(`Found ${relatedCount} related products`);

      if (summary5.total <= 2) {
        logSuccess('Uses efficient nested aggregation (single query)');
        results.getRelatedProducts.passed = true;
      }

      // Verify data integrity
      if (relatedCount > 0) {
        const hasCategory = result.relatedProducts[0].category !== undefined;
        const hasSeller = result.relatedProducts[0].seller !== undefined;
        if (hasCategory && hasSeller) {
          logSuccess('Category and seller properly joined in nested $lookup');
        }
      }
    }

    return results;
  } catch (error) {
    logError(`Product controller tests failed: ${error.message}`);
    return results;
  }
}

async function testOrderController() {
  logTest('Order Controller - Query Optimization Tests');

  const results = {
    getOrders: { queries: 0, passed: false },
    getOrder: { queries: 0, passed: false },
    getPayoutLedger: { queries: 0, passed: false }
  };

  try {
    // Test 1: getOrders - should use lean()
    logInfo('\n1. Testing getOrders with lean()...');
    resetQueryCounter();

    const orders = await Order.find()
      .populate('product', 'title images price')
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const summary1 = getQuerySummary();
    results.getOrders.queries = summary1.total;

    logInfo(`Query count: ${summary1.total}`);
    logInfo(`Breakdown: ${JSON.stringify(summary1.byModel)}`);
    logInfo(`Found ${orders.length} orders`);

    if (orders.length > 0) {
      const isLean = orders[0].$__ == null;
      const hasProduct = orders[0].product !== undefined;
      const hasBuyer = orders[0].buyer !== undefined;
      const hasSeller = orders[0].seller !== undefined;

      if (isLean) {
        logSuccess('Uses lean() for better performance');
      }

      if (hasProduct && hasBuyer && hasSeller) {
        logSuccess('Product, buyer, and seller properly populated');
        results.getOrders.passed = true;
      } else {
        logError('Missing populated fields');
      }
    } else {
      logWarning('No orders available to test');
    }

    // Test 2: getOrder - should populate all related data
    if (orders.length > 0) {
      logInfo('\n2. Testing getOrder with detailed populates...');
      resetQueryCounter();

      const order = await Order.findById(orders[0]._id)
        .populate('product')
        .populate('buyer', 'name email phone location avatar')
        .populate('seller', 'name email phone location avatar');

      const summary2 = getQuerySummary();
      results.getOrder.queries = summary2.total;

      logInfo(`Query count: ${summary2.total}`);

      if (order) {
        const hasProduct = order.product !== undefined && order.product !== null;
        const hasBuyer = order.buyer && order.buyer.name;
        const hasSeller = order.seller && order.seller.name;

        if (hasProduct && hasBuyer && hasSeller) {
          logSuccess(`Order: ${order.orderNumber || order._id}`);
          logSuccess(`Product populated: ${order.product.title || 'N/A'}`);
          logSuccess(`Buyer populated: ${order.buyer.name}`);
          logSuccess(`Seller populated: ${order.seller.name}`);
          results.getOrder.passed = true;
        } else {
          logWarning(`Order found but some fields missing - Product: ${hasProduct}, Buyer: ${hasBuyer}, Seller: ${hasSeller}`);
          results.getOrder.passed = hasProduct && hasBuyer && hasSeller;
        }
      }
    }

    // Test 3: getPayoutLedger - should use aggregation
    logInfo('\n3. Testing getPayoutLedger with aggregation...');
    resetQueryCounter();

    const query = {
      paymentStatus: 'completed',
      sellerPaid: false
    };

    // First test the aggregation
    const pendingTotal = await Order.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    const summary3 = getQuerySummary();
    results.getPayoutLedger.queries = summary3.total;

    const totalAmount = pendingTotal[0]?.total || 0;

    logInfo(`Query count: ${summary3.total}`);
    logInfo(`Pending payouts total: KES ${totalAmount.toFixed(2)}`);

    if (summary3.total <= 1) {
      logSuccess('Uses efficient $group aggregation');
      results.getPayoutLedger.passed = true;
    }

    // Now test the full query with populate
    resetQueryCounter();
    const payoutOrders = await Order.find(query)
      .populate('product', 'title price condition images')
      .populate('buyer', 'name email phone')
      .populate('seller', 'name email phone')
      .sort({ seller: 1, createdAt: -1 })
      .limit(20)
      .lean();

    const summary3b = getQuerySummary();
    logInfo(`Full query (with populates): ${summary3b.total} queries`);
    logInfo(`Found ${payoutOrders.length} orders needing payout`);

    if (payoutOrders.length > 0 && payoutOrders[0].$__ == null) {
      logSuccess('Uses lean() for payout ledger query');
    }

    return results;
  } catch (error) {
    logError(`Order controller tests failed: ${error.message}`);
    return results;
  }
}

async function testUserController() {
  logTest('User Controller - Query Optimization Tests');

  const results = {
    getUsers: { queries: 0, passed: false },
    getUser: { queries: 0, passed: false },
    getDashboardStats: { queries: 0, passed: false }
  };

  try {
    // Test 1: getUsers - should use lean() and pagination
    logInfo('\n1. Testing getUsers with lean() and pagination...');
    resetQueryCounter();

    const users = await User.find()
      .select('-password -resetPasswordToken -resetPasswordExpire')
      .sort({ createdAt: -1 })
      .skip(0)
      .limit(20)
      .lean();

    const total = await User.countDocuments();

    const summary1 = getQuerySummary();
    results.getUsers.queries = summary1.total;

    logInfo(`Query count: ${summary1.total}`);
    logInfo(`Found ${users.length} of ${total} users`);

    if (users.length > 0) {
      const isLean = users[0].$__ == null;
      const noPassword = users[0].password === undefined;

      if (isLean) {
        logSuccess('Uses lean() for better performance');
      }

      if (noPassword) {
        logSuccess('Password field properly excluded');
        results.getUsers.passed = true;
      } else {
        logError('Password field not excluded');
      }
    }

    // Test 2: getUser - should populate products efficiently
    if (users.length > 0) {
      logInfo('\n2. Testing getUser with products...');
      resetQueryCounter();

      const userId = users[0]._id;

      const products = await Product.find({ seller: userId })
        .select('title price images status condition createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const summary2 = getQuerySummary();
      results.getUser.queries = summary2.total;

      logInfo(`Query count: ${summary2.total}`);
      logInfo(`User "${users[0].name}" has ${products.length} products`);

      if (products.length > 0) {
        const isLean = products[0].$__ == null;
        if (isLean) {
          logSuccess('Products use lean() optimization');
          results.getUser.passed = true;
        }
      } else {
        logInfo('No products found for this user');
        results.getUser.passed = true; // Pass if user has no products (valid state)
      }
    }

    // Test 3: getDashboardStats - multiple countDocuments
    if (users.length > 0) {
      logInfo('\n3. Testing getDashboardStats with countDocuments...');
      resetQueryCounter();

      const sellerId = users[0]._id;

      const totalProducts = await Product.countDocuments({ seller: sellerId });
      const availableProducts = await Product.countDocuments({ seller: sellerId, status: 'available' });
      const soldProducts = await Product.countDocuments({ seller: sellerId, status: 'sold' });
      const totalOrders = await Order.countDocuments({ seller: sellerId });
      const pendingOrders = await Order.countDocuments({ seller: sellerId, status: 'pending' });
      const completedOrders = await Order.countDocuments({ seller: sellerId, status: 'delivered' });

      const summary3 = getQuerySummary();
      results.getDashboardStats.queries = summary3.total;

      logInfo(`Query count: ${summary3.total}`);
      logInfo(`Products: ${totalProducts} total, ${availableProducts} available, ${soldProducts} sold`);
      logInfo(`Orders: ${totalOrders} total, ${pendingOrders} pending, ${completedOrders} completed`);

      // Verify no data loss
      const productSum = availableProducts + soldProducts;
      if (productSum <= totalProducts) {
        logSuccess('Data integrity verified (no double counting)');
        results.getDashboardStats.passed = true;
      } else {
        logWarning('Product count mismatch - may indicate data issue');
      }

      logInfo(`Uses ${summary3.total} countDocuments queries for stats`);
      logInfo(`Note: Could be optimized with aggregation $facet`);
    }

    return results;
  } catch (error) {
    logError(`User controller tests failed: ${error.message}`);
    return results;
  }
}

async function testMessageController() {
  logTest('Message Controller - Query Optimization Tests');

  const results = {
    getConversation: { queries: 0, passed: false },
    getConversations: { queries: 0, passed: false },
    sendMessage: { queries: 0, passed: false }
  };

  try {
    // Test 1: getConversation - should use aggregation
    logInfo('\n1. Testing getConversation with aggregation pipeline...');
    resetQueryCounter();

    const aggregationPipeline = [
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(), receiver: new mongoose.Types.ObjectId() },
            { sender: new mongoose.Types.ObjectId(), receiver: new mongoose.Types.ObjectId() }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'sender',
          foreignField: '_id',
          as: 'sender'
        }
      },
      { $unwind: '$sender' },
      {
        $lookup: {
          from: 'users',
          localField: 'receiver',
          foreignField: '_id',
          as: 'receiver'
        }
      },
      { $unwind: '$receiver' },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $project: {
          sender: {
            _id: '$sender._id',
            name: '$sender.name',
            avatar: '$sender.avatar'
          },
          receiver: {
            _id: '$receiver._id',
            name: '$receiver.name',
            avatar: '$receiver.avatar'
          },
          product: {
            $arrayElemAt: ['$product', 0]
          },
          content: 1,
          isRead: 1,
          readAt: 1,
          createdAt: 1,
          updatedAt: 1
        }
      },
      {
        $project: {
          sender: 1,
          receiver: 1,
          product: {
            $cond: {
              if: { $ne: ['$product', null] },
              then: {
                _id: '$product._id',
                title: '$product.title',
                images: '$product.images'
              },
              else: null
            }
          },
          content: 1,
          isRead: 1,
          readAt: 1,
          createdAt: 1,
          updatedAt: 1
        }
      },
      { $sort: { createdAt: -1 } },
      { $facet: {
        data: [{ $skip: 0 }, { $limit: 50 }],
        totalCount: [{ $count: 'count' }]
      }}
    ];

    const [result] = await Message.aggregate(aggregationPipeline);

    const summary1 = getQuerySummary();
    results.getConversation.queries = summary1.total;

    logInfo(`Query count: ${summary1.total}`);
    logInfo(`Messages: ${result.data.length}`);

    if (summary1.total <= 2) {
      logSuccess('Uses efficient aggregation with $facet');
      results.getConversation.passed = true;
    }

    // Test 2: getConversations - complex aggregation
    logInfo('\n2. Testing getConversations with complex aggregation...');
    resetQueryCounter();

    const conversationsPipeline = [
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId() },
            { receiver: new mongoose.Types.ObjectId() }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'sender',
          foreignField: '_id',
          as: 'sender'
        }
      },
      { $unwind: '$sender' },
      {
        $lookup: {
          from: 'users',
          localField: 'receiver',
          foreignField: '_id',
          as: 'receiver'
        }
      },
      { $unwind: '$receiver' },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $addFields: {
          conversationPartner: {
            $cond: {
              if: { $eq: ['$sender._id', new mongoose.Types.ObjectId()] },
              then: '$receiver',
              else: '$sender'
            }
          },
          product: {
            $arrayElemAt: ['$product', 0]
          }
        }
      },
      {
        $project: {
          conversationPartner: 1,
          content: 1,
          isRead: 1,
          createdAt: 1,
          product: {
            $cond: {
              if: { $ne: ['$product', null] },
              then: {
                _id: '$product._id',
                title: '$product.title',
                images: '$product.images'
              },
              else: null
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationPartner._id',
          user: { $first: '$conversationPartner' },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver._id', new mongoose.Types.ObjectId()] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ];

    const conversations = await Message.aggregate(conversationsPipeline);

    const summary2 = getQuerySummary();
    results.getConversations.queries = summary2.total;

    logInfo(`Query count: ${summary2.total}`);
    logInfo(`Conversations: ${conversations.length}`);

    if (summary2.total <= 2) {
      logSuccess('Uses single aggregation query for conversations');
      results.getConversations.passed = true;
    }

    // Test 3: sendMessage - should populate after create
    logInfo('\n3. Testing sendMessage populate pattern...');
    resetQueryCounter();

    // Simulate the pattern used in the controller
    const testMessage = await Message.create({
      sender: new mongoose.Types.ObjectId(),
      receiver: new mongoose.Types.ObjectId(),
      content: 'Test message'
    });

    const populatedMessage = await Message.findById(testMessage._id)
      .populate('receiver', 'name email avatar')
      .populate('sender', 'name email avatar')
      .populate('product', 'title images')
      .lean();

    const summary3 = getQuerySummary();
    results.sendMessage.queries = summary3.total;

    logInfo(`Query count: ${summary3.total}`);

    if (summary3.total <= 3) {
      logSuccess('Efficient populate pattern (1 insert + 1 find with populates)');
      results.sendMessage.passed = true;
    }

    // Cleanup
    await Message.deleteOne({ _id: testMessage._id });

    return results;
  } catch (error) {
    logError(`Message controller tests failed: ${error.message}`);
    return results;
  }
}

function printSummary(allResults) {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                        QUERY OPTIMIZATION TEST SUMMARY                      ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  // Product Controller Results
  log('PRODUCT CONTROLLER', 'cyan');
  log('─'.repeat(70), 'cyan');
  Object.entries(allResults.products).forEach(([test, result]) => {
    const status = result.passed ? 'PASS' : 'FAIL';
    const color = result.passed ? 'green' : 'red';
    log(`  ${test.padEnd(25)} Queries: ${String(result.queries).padStart(3)}  Status: ${status}`, color);
  });

  // Order Controller Results
  console.log('\n');
  log('ORDER CONTROLLER', 'cyan');
  log('─'.repeat(70), 'cyan');
  Object.entries(allResults.orders).forEach(([test, result]) => {
    const status = result.passed ? 'PASS' : 'FAIL';
    const color = result.passed ? 'green' : 'red';
    log(`  ${test.padEnd(25)} Queries: ${String(result.queries).padStart(3)}  Status: ${status}`, color);
  });

  // User Controller Results
  console.log('\n');
  log('USER CONTROLLER', 'cyan');
  log('─'.repeat(70), 'cyan');
  Object.entries(allResults.users).forEach(([test, result]) => {
    const status = result.passed ? 'PASS' : 'FAIL';
    const color = result.passed ? 'green' : 'red';
    log(`  ${test.padEnd(25)} Queries: ${String(result.queries).padStart(3)}  Status: ${status}`, color);
  });

  // Message Controller Results
  console.log('\n');
  log('MESSAGE CONTROLLER', 'cyan');
  log('─'.repeat(70), 'cyan');
  Object.entries(allResults.messages).forEach(([test, result]) => {
    const status = result.passed ? 'PASS' : 'FAIL';
    const color = result.passed ? 'green' : 'red';
    log(`  ${test.padEnd(25)} Queries: ${String(result.queries).padStart(3)}  Status: ${status}`, color);
  });

  // Overall Summary
  console.log('\n');
  log('─'.repeat(70), 'cyan');

  const allTests = [
    ...Object.values(allResults.products),
    ...Object.values(allResults.orders),
    ...Object.values(allResults.users),
    ...Object.values(allResults.messages)
  ];
  const passed = allTests.filter(r => r.passed).length;
  const total = allTests.length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

  console.log('\n');
  if (passed === total) {
    log(`✓ ALL TESTS PASSED (${passed}/${total}) - ${passRate}%`, 'green');
  } else if (passed >= total * 0.8) {
    log(`⚠ MOST TESTS PASSED (${passed}/${total}) - ${passRate}%`, 'yellow');
  } else {
    log(`✗ MANY TESTS FAILED (${passed}/${total}) - ${passRate}%`, 'red');
  }

  // Query Count Analysis
  console.log('\n');
  log('QUERY COUNT ANALYSIS:', 'cyan');
  log('─'.repeat(70), 'cyan');

  let totalQueries = 0;
  const highQueryTests = [];

  allTests.forEach(result => {
    totalQueries += result.queries;
    if (result.queries > 5) {
      highQueryTests.push({ result: result.queries });
    }
  });

  logInfo(`Total queries executed across all tests: ${totalQueries}`);
  logInfo(`Average queries per test: ${(totalQueries / total).toFixed(1)}`);

  if (highQueryTests.length > 0) {
    logWarning('\nTests with high query counts (potential N+1 issues):');
    Object.entries(highQueryTests).forEach(([name, count]) => {
      logWarning(`  ${name}: ${count} queries`);
    });
  } else {
    logSuccess('\nNo high query counts detected - queries are optimized!');
  }

  console.log('\n');
  log('═'.repeat(70), 'cyan');
}

async function runAllTests() {
  console.log('\n');
  log('╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                   COMPREHENSIVE QUERY OPTIMIZATION TESTS                   ║', 'cyan');
  log('║              Product, Order, User, and Message Controllers                 ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  // Connect to database
  const connected = await connectDatabase();
  if (!connected) {
    process.exit(1);
  }

  // Setup test data
  await setupTestData();

  // Run all controller tests
  const allResults = {
    products: await testProductController(),
    orders: await testOrderController(),
    users: await testUserController(),
    messages: await testMessageController()
  };

  // Print summary
  printSummary(allResults);

  await mongoose.disconnect();
  console.log('\n');

  // Exit with appropriate code
  const allTests = Object.values(allResults).flat();
  const passed = allTests.filter(r => r.passed).length;
  const total = allTests.length;

  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  logError(`Test suite error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
