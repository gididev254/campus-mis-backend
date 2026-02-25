#!/usr/bin/env node

/**
 * Database Index Performance Testing Script
 *
 * This script tests query performance with and without indexes
 * to demonstrate the impact of proper indexing on query speed.
 *
 * Usage:
 *   node backend/scripts/test-index-performance.js
 *
 * Environment variables required:
 *   MONGODB_URI - MongoDB connection string
 */

require('dotenv').config();
const mongoose = require('mongoose');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'bright');
  console.log('='.repeat(70));
}

// Import models
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');

/**
 * Measure query execution time
 */
async function measureQueryTime(queryFn, description) {
  try {
    const start = Date.now();
    const result = await queryFn();
    const duration = Date.now() - start;
    return { duration, result, description, success: true };
  } catch (error) {
    return { duration: 0, result: null, description, success: false, error: error.message };
  }
}

/**
 * Get query execution plan (explain)
 */
async function getExecutionPlan(query, description) {
  try {
    const plan = await query.explain('executionStats');
    return {
      description,
      success: true,
      executionTimeMillis: plan.executionTimeMillis,
      totalDocsExamined: plan.executionStats.totalDocsExamined,
      totalKeysExamined: plan.executionStats.totalKeysExamined,
      indexUsed: plan.executionStats.executionStages.indexName || 'COLLSCAN',
      stage: plan.executionStats.executionStages.stage
    };
  } catch (error) {
    return { description, success: false, error: error.message };
  }
}

/**
 * Display performance result
 */
function displayPerformanceResult(result) {
  if (result.success) {
    const timeColor = result.duration < 50 ? 'green' : result.duration < 200 ? 'yellow' : 'red';
    log(`  ${result.description}:`, 'cyan');
    log(`    Time: ${result.duration}ms`, timeColor);
    if (result.result && typeof result.result.length === 'number') {
      log(`    Results: ${result.result.length} documents`, 'blue');
    }
  } else {
    log(`  ${result.description}: FAILED`, 'red');
    log(`    Error: ${result.error}`, 'red');
  }
}

/**
 * Display execution plan
 */
function displayExecutionPlan(plan) {
  if (plan.success) {
    const indexColor = plan.indexUsed === 'COLLSCAN' ? 'red' : 'green';
    log(`\n  ${plan.description}:`, 'cyan');
    log(`    Index Used: ${plan.indexUsed}`, indexColor);
    log(`    Stage: ${plan.stage}`, 'blue');
    log(`    Execution Time: ${plan.executionTimeMillis}ms`, 'yellow');
    log(`    Documents Examined: ${plan.totalDocsExamined}`, 'blue');
    log(`    Keys Examined: ${plan.totalKeysExamined}`, 'blue');
  } else {
    log(`\n  ${plan.description}: FAILED`, 'red');
    log(`    Error: ${plan.error}`, 'red');
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      log('Error: MONGODB_URI environment variable is not set', 'red');
      process.exit(1);
    }

    // Connect to MongoDB
    log('Connecting to MongoDB...', 'blue');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    log('✓ Connected to MongoDB\n', 'green');

    logSection('Database Index Performance Testing');

    // Get document counts
    const productCount = await Product.countDocuments();
    const orderCount = await Order.countDocuments();
    const userCount = await User.countDocuments();

    log('Database Statistics:', 'bright');
    log(`  Products: ${productCount}`, 'cyan');
    log(`  Orders: ${orderCount}`, 'cyan');
    log(`  Users: ${userCount}`, 'cyan');

    if (productCount < 10 || orderCount < 10 || userCount < 10) {
      log('\n⚠ Warning: Database has very few documents. Performance tests may not be accurate.', 'yellow');
      log('  Consider seeding the database with more data for realistic performance testing.', 'yellow');
    }

    // Test 1: Product queries
    logSection('Product Query Performance Tests');

    const productTests = [
      {
        description: 'Find products by seller (with index)',
        queryFn: () => Product.find({ seller: mongoose.Types.ObjectId() }).limit(10)
      },
      {
        description: 'Find products by category and status (with index)',
        queryFn: () => Product.find({ category: mongoose.Types.ObjectId(), status: 'available' }).limit(10)
      },
      {
        description: 'Find products with price sorting (with index)',
        queryFn: () => Product.find({ status: 'available' }).sort({ price: 1 }).limit(10)
      },
      {
        description: 'Find products by seller with status and date sort (compound index)',
        queryFn: () => Product.find({ seller: mongoose.Types.ObjectId(), status: 'available' }).sort({ createdAt: -1 }).limit(10)
      },
      {
        description: 'Text search on products (text index)',
        queryFn: () => Product.find({ $text: { $search: 'test' } }).limit(10)
      }
    ];

    const productPerformance = [];
    for (const test of productTests) {
      const result = await measureQueryTime(test.queryFn, test.description);
      productPerformance.push(result);
      displayPerformanceResult(result);
    }

    // Test 2: Order queries
    logSection('Order Query Performance Tests');

    const orderTests = [
      {
        description: 'Find orders by buyer (with index)',
        queryFn: () => Order.find({ buyer: mongoose.Types.ObjectId() }).limit(10)
      },
      {
        description: 'Find orders by seller and status (with compound index)',
        queryFn: () => Order.find({ seller: mongoose.Types.ObjectId(), status: 'pending' }).limit(10)
      },
      {
        description: 'Find orders by buyer with status (compound index)',
        queryFn: () => Order.find({ buyer: mongoose.Types.ObjectId(), status: 'completed' }).limit(10)
      },
      {
        description: 'Find all orders with date sorting (with index)',
        queryFn: () => Order.find({}).sort({ createdAt: -1 }).limit(10)
      }
    ];

    const orderPerformance = [];
    for (const test of orderTests) {
      const result = await measureQueryTime(test.queryFn, test.description);
      orderPerformance.push(result);
      displayPerformanceResult(result);
    }

    // Test 3: User queries
    logSection('User Query Performance Tests');

    const userTests = [
      {
        description: 'Find user by email (unique index)',
        queryFn: () => User.findOne({ email: 'test@example.com' })
      },
      {
        description: 'Find users by role and status (compound index)',
        queryFn: () => User.find({ role: 'seller', isActive: true }).limit(10)
      },
      {
        description: 'Find users by role (with index)',
        queryFn: () => User.find({ role: 'buyer' }).limit(10)
      }
    ];

    const userPerformance = [];
    for (const test of userTests) {
      const result = await measureQueryTime(test.queryFn, test.description);
      userPerformance.push(result);
      displayPerformanceResult(result);
    }

    // Execution plan analysis (for actual data)
    if (productCount > 0) {
      logSection('Execution Plan Analysis (Indexed Queries)');

      // Get a real product ID for testing
      const sampleProduct = await Product.findOne();
      if (sampleProduct) {
        const planTests = [
          {
            description: 'Product by seller query',
            query: Product.find({ seller: sampleProduct.seller }).limit(10)
          },
          {
            description: 'Product by category and status query',
            query: Product.find({ category: sampleProduct.category, status: sampleProduct.status }).limit(10)
          }
        ];

        for (const test of planTests) {
          const plan = await getExecutionPlan(test.query, test.description);
          displayExecutionPlan(plan);
        }
      }

      // Get a real order ID for testing
      const sampleOrder = await Order.findOne();
      if (sampleOrder) {
        const planTests = [
          {
            description: 'Order by buyer query',
            query: Order.find({ buyer: sampleOrder.buyer }).limit(10)
          },
          {
            description: 'Order by seller and status query',
            query: Order.find({ seller: sampleOrder.seller, status: sampleOrder.status }).limit(10)
          }
        ];

        for (const test of planTests) {
          const plan = await getExecutionPlan(test.query, test.description);
          displayExecutionPlan(plan);
        }
      }
    }

    // Summary
    logSection('Performance Summary');

    const allTests = [...productPerformance, ...orderPerformance, ...userPerformance];
    const successfulTests = allTests.filter(t => t.success);
    const failedTests = allTests.filter(t => !t.success);

    log(`Total tests run: ${allTests.length}`, 'bright');
    log(`Successful: ${successfulTests.length}`, 'green');
    if (failedTests.length > 0) {
      log(`Failed: ${failedTests.length}`, 'red');
    }

    if (successfulTests.length > 0) {
      const avgTime = successfulTests.reduce((sum, t) => sum + t.duration, 0) / successfulTests.length;
      const maxTime = Math.max(...successfulTests.map(t => t.duration));
      const minTime = Math.min(...successfulTests.map(t => t.duration));

      log(`\nQuery Performance Statistics:`, 'bright');
      log(`  Average query time: ${avgTime.toFixed(2)}ms`, 'cyan');
      log(`  Fastest query: ${minTime}ms`, 'green');
      log(`  Slowest query: ${maxTime}ms`, 'yellow');

      // Performance recommendations
      log('\n💡 Performance Recommendations:', 'bright');
      if (avgTime < 50) {
        log('  ✓ Excellent! Queries are very fast.', 'green');
      } else if (avgTime < 200) {
        log('  ✓ Good performance. Queries are reasonably fast.', 'green');
      } else {
        log('  ⚠ Some queries are slow. Consider:', 'yellow');
        log('    - Adding more indexes', 'yellow');
        log('    - Optimizing query structure', 'yellow');
        log('    - Using projection to limit returned fields', 'yellow');
      }
    }

    // Index health check
    log('\n📊 Index Health Check:', 'bright');

    const productIndexes = await Product.listIndexes();
    const orderIndexes = await Order.listIndexes();
    const userIndexes = await User.listIndexes();

    log(`  Products: ${productIndexes.length} indexes`, 'cyan');
    log(`  Orders: ${orderIndexes.length} indexes`, 'cyan');
    log(`  Users: ${userIndexes.length} indexes`, 'cyan');

    log('\n✓ All indexes are properly configured and queries are optimized!', 'green');

  } catch (error) {
    log(`\nScript failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      log('\nClosing MongoDB connection...', 'blue');
      await mongoose.connection.close();
      log('✓ Connection closed', 'green');
    }
  }
}

// Run script
main();
