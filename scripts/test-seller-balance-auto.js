/**
 * Test script for automatic seller balance updates on payment completion
 * Run with: node backend/scripts/test-seller-balance-auto.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

// Import all models to ensure schema registration
require('../models/User');
require('../models/Product');
const Order = require('../models/Order');
const SellerBalance = require('../models/SellerBalance');
const { updateSellerBalanceOnPayment } = require('../utils/sellerBalance');

// ANSI color codes for console output
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

async function testSellerBalanceUpdate() {
  log('\n=== Testing Automatic Seller Balance Update ===\n', 'cyan');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    log('✓ Connected to database', 'green');

    // Find any completed order with a valid seller reference
    const order = await Order.findOne({
      paymentStatus: 'completed',
      seller: { $exists: true, $ne: null }
    });

    if (!order) {
      log('✗ No completed orders found with valid seller', 'red');
      log('\nPlease create a test order first:', 'yellow');
      log('1. Create a product as a seller', 'yellow');
      log('2. Add to cart as buyer', 'yellow');
      log('3. Checkout with testMode=true', 'yellow');
      process.exit(1);
    }

    if (!order.seller) {
      log('✗ Order has no seller reference', 'red');
      process.exit(1);
    }

    log('Found test order:', 'yellow');
    log(`  Order ID: ${order._id}`, 'reset');
    log(`  Order Number: ${order.orderNumber || 'N/A'}`, 'reset');
    log(`  Product ID: ${order.product}`, 'reset');
    log(`  Amount: KES ${order.totalPrice}`, 'reset');
    log(`  Seller ID: ${order.seller}`, 'reset');
    log(`  Buyer ID: ${order.buyer}`, 'reset');
    log(`  Payment Status: ${order.paymentStatus}`, 'reset');
    log(`  Seller Paid: ${order.sellerPaid ? 'Yes' : 'No'}`, 'reset');
    log(`  Seller Paid At: ${order.sellerPaidAt || 'Not yet'}`, 'reset');

    // Get initial balance state
    const initialBalance = await SellerBalance.findOne({ seller: order.seller._id });
    const initialBalanceAmount = initialBalance?.currentBalance || 0;
    const initialLedgerLength = initialBalance?.ledger?.length || 0;

    log(`\nInitial seller balance: KES ${initialBalanceAmount}`, 'yellow');
    log(`Initial ledger entries: ${initialLedgerLength}`, 'yellow');

    // Test the balance update function
    log('\n--- Testing updateSellerBalanceOnPayment() ---\n', 'cyan');
    const result = await updateSellerBalanceOnPayment(order._id);

    log('Function result:', 'yellow');
    log(JSON.stringify(result, null, 2), 'reset');

    // Verify the order was marked as paid
    const updatedOrder = await Order.findById(order._id);
    log(`\n✓ Order sellerPaid flag: ${updatedOrder.sellerPaid}`, updatedOrder.sellerPaid ? 'green' : 'red');
    log(`✓ Order sellerPaidAt: ${updatedOrder.sellerPaidAt}`, updatedOrder.sellerPaidAt ? 'green' : 'red');

    // Verify balance was updated
    const finalBalance = await SellerBalance.findOne({ seller: order.seller._id });

    if (!finalBalance) {
      log('\n✗ Seller balance not found after update!', 'red');
      process.exit(1);
    }

    log('\n--- Final Seller Balance ---', 'cyan');
    log(`✓ Seller: ${order.seller}`, 'green');
    log(`✓ Current Balance: KES ${finalBalance.currentBalance}`, 'green');
    log(`✓ Total Earnings: KES ${finalBalance.totalEarnings}`, 'green');
    log(`✓ Total Orders: ${finalBalance.totalOrders}`, 'green');
    log(`✓ Ledger Entries: ${finalBalance.ledger?.length || 0}`, 'green');

    // Calculate expected balance
    let expectedBalance = initialBalanceAmount;
    let expectedOrders = initialBalance?.totalOrders || 0;

    if (!order.sellerPaid || !result.alreadyProcessed) {
      expectedBalance += order.totalPrice;
      expectedOrders += 1;
    }

    const balanceMatches = finalBalance.currentBalance === expectedBalance;
    const ordersMatch = finalBalance.totalOrders === expectedOrders;

    if (balanceMatches) {
      log(`\n✓ Balance is correct (expected: KES ${expectedBalance})`, 'green');
    } else {
      log(`\n✗ Balance mismatch! Expected: KES ${expectedBalance}, Got: KES ${finalBalance.currentBalance}`, 'red');
    }

    if (ordersMatch) {
      log(`✓ Order count is correct (expected: ${expectedOrders})`, 'green');
    } else {
      log(`✗ Order count mismatch! Expected: ${expectedOrders}, Got: ${finalBalance.totalOrders}`, 'red');
    }

    // Verify ledger entry
    const ledgerLength = finalBalance.ledger?.length || 0;
    if (ledgerLength > initialLedgerLength) {
      log('\n--- New Ledger Entry ---', 'cyan');
      const lastLedgerEntry = finalBalance.ledger[ledgerLength - 1];
      log(`✓ Type: ${lastLedgerEntry.type}`, 'green');
      log(`✓ Amount: KES ${lastLedgerEntry.amount}`, 'green');
      log(`✓ Order ID: ${lastLedgerEntry.orderId}`, 'green');
      log(`✓ Product: ${lastLedgerEntry.productTitle}`, 'green');
      log(`✓ Buyer: ${lastLedgerEntry.buyerName}`, 'green');
      log(`✓ Status: ${lastLedgerEntry.status}`, 'green');
      log(`✓ Date: ${lastLedgerEntry.date}`, 'green');
      log(`✓ Description: ${lastLedgerEntry.description}`, 'green');
    } else if (result.alreadyProcessed) {
      log('\n--- Ledger ---', 'cyan');
      log('ℹ No new entry (already processed)', 'yellow');

      if (finalBalance.ledger?.length > 0) {
        log('\nShowing most recent ledger entry:', 'yellow');
        const lastEntry = finalBalance.ledger[finalBalance.ledger.length - 1];
        log(`  Type: ${lastEntry.type}`, 'reset');
        log(`  Amount: KES ${lastEntry.amount}`, 'reset');
        log(`  Date: ${lastEntry.date}`, 'reset');
        log(`  Status: ${lastEntry.status}`, 'reset');
      }
    } else {
      log('\n⚠ Warning: Ledger entry not created', 'yellow');
    }

    // Test duplicate prevention
    log('\n--- Testing Duplicate Prevention ---\n', 'cyan');
    log('Calling updateSellerBalanceOnPayment() again...', 'yellow');
    const duplicateResult = await updateSellerBalanceOnPayment(order._id);

    if (duplicateResult.alreadyProcessed) {
      log('✓ Duplicate prevention works! Balance was not updated again.', 'green');
    } else if (duplicateResult.success) {
      log('⚠ Warning: Duplicate update was allowed', 'yellow');
    } else {
      log(`✗ Unexpected result: ${JSON.stringify(duplicateResult)}`, 'red');
    }

    // Final balance should be unchanged
    const finalBalanceAfterDupTest = await SellerBalance.findOne({ seller: order.seller._id });
    if (finalBalanceAfterDupTest?.currentBalance === finalBalance?.currentBalance) {
      log('✓ Balance unchanged after duplicate call', 'green');
    } else {
      log('✗ Balance changed! Duplicate prevention failed.', 'red');
    }

    // Summary
    log('\n=== Test Summary ===\n', 'cyan');
    log(`✓ Automatic balance update: ${result.success || result.alreadyProcessed ? 'PASS' : 'FAIL'}`,
      result.success || result.alreadyProcessed ? 'green' : 'red');
    log(`✓ Duplicate prevention: ${duplicateResult.alreadyProcessed ? 'PASS' : 'FAIL'}`,
      duplicateResult.alreadyProcessed ? 'green' : 'red');
    log(`✓ Ledger tracking: ${ledgerLength > 0 ? 'PASS' : 'FAIL'}`,
      ledgerLength > 0 ? 'green' : 'red');

    if ((result.success || result.alreadyProcessed) && duplicateResult.alreadyProcessed && ledgerLength > 0) {
      log('\n=== All Tests Passed ===\n', 'green');
    } else {
      log('\n=== Some Tests Failed ===\n', 'red');
    }

  } catch (error) {
    log('\n✗ Test failed:', 'red');
    log(error.message, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log('Disconnected from database\n', 'reset');
  }
}

// Run the test
testSellerBalanceUpdate();
