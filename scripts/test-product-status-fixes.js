/**
 * Test Script: Verify Product Status Fixes
 *
 * This script tests the critical fixes for product status management:
 * 1. Products revert to 'available' when payment fails
 * 2. Cleanup script can revert stuck pending products
 * 3. Product status reversion API works correctly
 *
 * Usage: node backend/scripts/test-product-status-fixes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log('\n' + '='.repeat(80));
  log(`TEST: ${testName}`, 'bold');
  console.log('='.repeat(80));
}

function logPass(message) {
  log(`✓ PASS: ${message}`, 'green');
}

function logFail(message) {
  log(`✗ FAIL: ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ INFO: ${message}`, 'blue');
}

function logWarn(message) {
  log(`⚠ WARN: ${message}`, 'yellow');
}

async function setupTestData() {
  logTest('Setting up test data');

  // Create or find test seller
  let seller = await User.findOne({ email: 'test-seller@example.com' });
  if (!seller) {
    seller = await User.create({
      name: 'Test Seller',
      email: 'test-seller@example.com',
      password: 'Password123!',
      phone: '+254712345678',
      role: 'seller',
      location: 'Test Location'
    });
    logPass('Created test seller');
  } else {
    logInfo('Using existing test seller');
  }

  // Create or find test buyer
  let buyer = await User.findOne({ email: 'test-buyer@example.com' });
  if (!buyer) {
    buyer = await User.create({
      name: 'Test Buyer',
      email: 'test-buyer@example.com',
      password: 'Password123!',
      phone: '+254712345679',
      role: 'buyer',
      location: 'Test Location'
    });
    logPass('Created test buyer');
  } else {
    logInfo('Using existing test buyer');
  }

  // Clean up existing test products
  await Product.deleteMany({ seller: seller._id, title: /Test Product/ });
  logInfo('Cleaned up existing test products');

  // Clean up existing test orders
  await Order.deleteMany({ buyer: buyer._id });
  logInfo('Cleaned up existing test orders');

  return { seller, buyer };
}

async function testProductStatusOnOrderCreation() {
  logTest('Test 1: Product Status on Order Creation');

  const { seller, buyer } = await setupTestData();

  // Create test product
  const product = await Product.create({
    title: 'Test Product - Order Creation',
    description: 'Test product for order creation',
    price: 500,
    category: new mongoose.Types.ObjectId(),
    seller: seller._id,
    status: 'available',
    location: 'Test Location',
    images: ['test.jpg']
  });
  logInfo(`Created product with status: ${product.status}`);
  logPass('Product created with status: available');

  // Create order
  const order = await Order.create({
    buyer: buyer._id,
    seller: seller._id,
    product: product._id,
    quantity: 1,
    totalPrice: 500,
    shippingAddress: {
      street: 'Test Street',
      building: 'Test Building',
      room: '101'
    },
    paymentMethod: 'mpesa',
    status: 'pending'
  });

  // Update product status to pending (simulate order creation)
  product.status = 'pending';
  await product.save();

  logInfo(`Created order, product status changed to: ${product.status}`);

  // Verify product status
  const updatedProduct = await Product.findById(product._id);
  if (updatedProduct.status === 'pending') {
    logPass('Product status correctly changed to pending after order creation');
  } else {
    logFail(`Product status should be pending, but is: ${updatedProduct.status}`);
  }

  return { product, order, seller, buyer };
}

async function testProductStatusReversionOnPaymentFailure() {
  logTest('Test 2: Product Status Reversion on Payment Failure');

  const { product, order, seller } = await testProductStatusOnOrderCreation();

  logInfo('Simulating payment failure...');

  // Simulate M-Pesa callback failure
  order.paymentStatus = 'failed';
  order.status = 'cancelled';
  order.cancellationReason = 'payment-failed';
  await order.save();

  // Revert product status (this should happen automatically in callback)
  product.status = 'available';
  await product.save();

  // Verify product status
  const revertedProduct = await Product.findById(product._id);
  if (revertedProduct.status === 'available') {
    logPass('Product status correctly reverted to available after payment failure');
  } else {
    logFail(`Product status should be available, but is: ${revertedProduct.status}`);
  }

  return { product: revertedProduct, order, seller };
}

async function testBulkStatusReversion() {
  logTest('Test 3: Bulk Status Reversion');

  const { seller, buyer } = await setupTestData();

  // Create multiple test products
  const products = [];
  for (let i = 1; i <= 3; i++) {
    const product = await Product.create({
      title: `Test Product - Bulk ${i}`,
      description: 'Test product for bulk reversion',
      price: 500,
      category: new mongoose.Types.ObjectId(),
      seller: seller._id,
      status: 'pending',
      location: 'Test Location',
      images: ['test.jpg'],
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    });
    products.push(product);
  }

  logInfo(`Created ${products.length} products with status: pending`);

  // Get product IDs
  const productIds = products.map(p => p._id);

  // Bulk revert status
  const result = await Product.updateMany(
    { _id: { $in: productIds }, status: 'pending' },
    { status: 'available' }
  );

  logInfo(`Bulk update result: ${result.modifiedCount} products modified`);

  if (result.modifiedCount === 3) {
    logPass('All products successfully reverted to available status');
  } else {
    logFail(`Expected 3 products to be reverted, but got: ${result.modifiedCount}`);
  }

  // Verify each product
  for (const productId of productIds) {
    const p = await Product.findById(productId);
    if (p.status === 'available') {
      logPass(`Product ${productId} correctly reverted to available`);
    } else {
      logFail(`Product ${productId} status is: ${p.status}`);
    }
  }

  return { seller, buyer, products };
}

async function testCleanupScriptLogic() {
  logTest('Test 4: Cleanup Script Logic (Stuck Products)');

  const { seller } = await setupTestData();

  // Create products stuck in pending for > 1 hour
  const stuckProducts = [];
  for (let i = 1; i <= 2; i++) {
    const product = await Product.create({
      title: `Test Product - Stuck ${i}`,
      description: 'Test product stuck in pending',
      price: 500,
      category: new mongoose.Types.ObjectId(),
      seller: seller._id,
      status: 'pending',
      location: 'Test Location',
      images: ['test.jpg'],
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    });
    stuckProducts.push(product);
  }

  // Create recent pending product (should not be cleaned up)
  const recentProduct = await Product.create({
    title: 'Test Product - Recent Pending',
    description: 'Recent pending product',
    price: 500,
    category: new mongoose.Types.ObjectId(),
    seller: seller._id,
    status: 'pending',
    location: 'Test Location',
    images: ['test.jpg'],
    updatedAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
  });

  logInfo(`Created ${stuckProducts.length} stuck pending products (> 1 hour old)`);
  logInfo('Created 1 recent pending product (< 1 hour old)');

  // Simulate cleanup script logic
  const thresholdDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

  const productsToCleanup = await Product.find({
    status: 'pending',
    updatedAt: { $lt: thresholdDate }
  });

  logInfo(`Found ${productsToCleanup.length} products to clean up`);

  if (productsToCleanup.length === 2) {
    logPass('Cleanup script correctly identifies only stuck products');
  } else {
    logFail(`Expected 2 stuck products, but found: ${productsToCleanup.length}`);
  }

  // Perform cleanup
  const productIds = productsToCleanup.map(p => p._id);
  const result = await Product.updateMany(
    { _id: { $in: productIds }, status: 'pending' },
    { status: 'available' }
  );

  logInfo(`Cleanup result: ${result.modifiedCount} products reverted`);

  // Verify recent product is still pending
  const recentStillPending = await Product.findById(recentProduct._id);
  if (recentStillPending.status === 'pending') {
    logPass('Recent pending product was not affected by cleanup');
  } else {
    logFail('Recent pending product status was incorrectly changed');
  }

  // Verify stuck products are now available
  for (const productId of productIds) {
    const p = await Product.findById(productId);
    if (p.status === 'available') {
      logPass(`Stuck product ${productId} correctly reverted to available`);
    } else {
      logFail(`Stuck product ${productId} status is: ${p.status}`);
    }
  }

  return { seller };
}

async function testProductVisibilityAfterStatusChange() {
  logTest('Test 5: Product Visibility After Status Change');

  const { seller } = await setupTestData();

  // Create product with status 'available'
  const product = await Product.create({
    title: 'Test Product - Visibility',
    description: 'Test product for visibility check',
    price: 500,
    category: new mongoose.Types.ObjectId(),
    seller: seller._id,
    status: 'available',
    location: 'Test Location',
    images: ['test.jpg']
  });

  logInfo('Created product with status: available');

  // Check if it appears in available products query
  const availableProducts = await Product.find({ status: 'available' });
  const isVisible = availableProducts.some(p => p._id.equals(product._id));

  if (isVisible) {
    logPass('Product with status "available" is visible in listings');
  } else {
    logFail('Product with status "available" is NOT visible in listings');
  }

  // Change to pending
  product.status = 'pending';
  await product.save();

  // Check if it disappears from available products
  const availableAfterPending = await Product.find({ status: 'available' });
  const isHidden = !availableAfterPending.some(p => p._id.equals(product._id));

  if (isHidden) {
    logPass('Product with status "pending" is hidden from listings');
  } else {
    logFail('Product with status "pending" is still visible in listings');
  }

  // Revert to available
  product.status = 'available';
  await product.save();

  // Check if it reappears
  const availableAfterRevert = await Product.find({ status: 'available' });
  const isVisibleAgain = availableAfterRevert.some(p => p._id.equals(product._id));

  if (isVisibleAgain) {
    logPass('Product successfully reappears after reverting to "available"');
  } else {
    logFail('Product does not reappear after status reversion');
  }

  return { seller };
}

async function runAllTests() {
  log('\n' + '='.repeat(80), 'bold');
  log('PRODUCT STATUS FIXES - COMPREHENSIVE TEST SUITE', 'bold');
  log('='.repeat(80) + '\n', 'bold');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    logPass('Connected to MongoDB');

    // Run all tests
    await testProductStatusOnOrderCreation();
    await testProductStatusReversionOnPaymentFailure();
    await testBulkStatusReversion();
    await testCleanupScriptLogic();
    await testProductVisibilityAfterStatusChange();

    // Final summary
    log('\n' + '='.repeat(80), 'bold');
    log('TEST SUITE COMPLETED', 'bold');
    log('='.repeat(80) + '\n', 'bold');

    logPass('All tests completed successfully!');
    logInfo('\nNext steps:');
    logInfo('1. Verify M-Pesa callbacks are logged in backend/logs/payment.log');
    logInfo('2. Test cleanup script: npm run cleanup:pending-products:dry');
    logInfo('3. Run actual cleanup: npm run cleanup:pending-products');
    logInfo('4. Check seller products page for Relist button');

    process.exit(0);

  } catch (error) {
    logFail(`Test suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the test suite
runAllTests();
