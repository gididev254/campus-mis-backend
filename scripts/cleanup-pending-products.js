/**
 * Cleanup Script: Revert products stuck in 'pending' status back to 'available'
 *
 * This script finds products that have been in 'pending' status for longer than
 * a specified threshold and automatically reverts them to 'available' status.
 *
 * Usage:
 *   node backend/scripts/cleanup-pending-products.js [--dry-run] [--hours=1]
 *
 * Options:
 *   --dry-run    Show what would be changed without making changes
 *   --hours=N    Threshold in hours (default: 1)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const logger = require('../utils/logger');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const hoursArg = args.find(arg => arg.startsWith('--hours='));
const thresholdHours = hoursArg ? parseInt(hoursArg.split('=')[1]) : 1;

// Calculate threshold date
const thresholdDate = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

/**
 * Main cleanup function
 */
async function cleanupPendingProducts() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    logger.info('Starting cleanup of pending products', {
      thresholdHours,
      thresholdDate: thresholdDate.toISOString(),
      dryRun: isDryRun
    });

    // Find products stuck in 'pending' status
    const stuckProducts = await Product.find({
      status: 'pending',
      updatedAt: { $lt: thresholdDate }
    }).lean();

    console.log(`\nFound ${stuckProducts.length} product(s) stuck in 'pending' status for more than ${thresholdHours} hour(s)`);

    if (stuckProducts.length === 0) {
      console.log('No products to clean up. Exiting.');
      process.exit(0);
    }

    // Display products to be updated
    console.log('\nProducts to be reverted:');
    console.log('='.repeat(80));

    for (const product of stuckProducts) {
      const pendingDuration = Math.floor((Date.now() - new Date(product.updatedAt)) / (1000 * 60 * 60));
      console.log(`\nID: ${product._id}`);
      console.log(`Title: ${product.title}`);
      console.log(`Price: KES ${product.price}`);
      console.log(`Seller: ${product.seller}`);
      console.log(`Status: ${product.status}`);
      console.log(`Pending for: ${pendingDuration} hours`);
      console.log(`Last updated: ${product.updatedAt}`);

      // Check if there are any active orders for this product
      const activeOrder = await Order.findOne({
        product: product._id,
        status: { $in: ['pending', 'confirmed'] }
      });

      if (activeOrder) {
        console.log(`⚠️  WARNING: Active order found (${activeOrder._id})`);
        console.log(`   Order status: ${activeOrder.status}`);
        console.log(`   Payment status: ${activeOrder.paymentStatus}`);
      }
    }

    console.log('\n' + '='.repeat(80));

    if (isDryRun) {
      console.log('\n[DRY RUN] No changes were made. To apply changes, run without --dry-run');
      process.exit(0);
    }

    // Confirm before proceeding
    console.log(`\nThis will revert ${stuckProducts.length} product(s) to 'available' status.`);
    console.log('Do you want to proceed? (yes/no)');

    // For automation, skip confirmation if --yes flag is provided
    const yesFlag = args.includes('--yes');
    if (!yesFlag) {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        rl.question('', resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== 'yes') {
        console.log('Cleanup cancelled.');
        process.exit(0);
      }
    }

    // Revert products to 'available' status
    const productIds = stuckProducts.map(p => p._id);
    const result = await Product.updateMany(
      { _id: { $in: productIds }, status: 'pending' },
      { status: 'available' }
    );

    logger.success('Cleanup completed', {
      productsReverted: result.modifiedCount,
      thresholdHours,
      dryRun: isDryRun
    });

    console.log(`\n✅ Successfully reverted ${result.modifiedCount} product(s) to 'available' status`);

    // Summary
    console.log('\nSummary:');
    console.log(`  Total products found: ${stuckProducts.length}`);
    console.log(`  Products reverted: ${result.modifiedCount}`);
    console.log(`  Threshold: ${thresholdHours} hour(s)`);

    process.exit(0);

  } catch (error) {
    logger.error('Cleanup script failed', {
      error: error.message,
      stack: error.stack
    });
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
cleanupPendingProducts();
