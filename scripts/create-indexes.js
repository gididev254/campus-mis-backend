#!/usr/bin/env node

/**
 * MongoDB Index Creation Script
 *
 * This script creates all database indexes for the Campus Market application.
 * It ensures indexes are created in the correct order and provides detailed progress.
 *
 * Usage:
 *   node backend/scripts/create-indexes.js
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
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`  ${message}`, 'cyan');
}

// Import all models
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Message = require('../models/Message');
const Review = require('../models/Review');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const Notification = require('../models/Notification');
const SellerBalance = require('../models/SellerBalance');
const Category = require('../models/Category');

/**
 * Creates indexes for a single model and reports results
 */
async function createModelIndexes(Model, modelName, description) {
  logSection(`${modelName} - ${description}`);

  try {
    // createIndexes() returns the model, not the indexes
    await Model.createIndexes();

    // Get the actual indexes to report
    const indexes = await Model.listIndexes();

    logSuccess(`Verified ${indexes.length} indexes for ${modelName}`);

    // List each index
    indexes.forEach((index, i) => {
      const keyStr = JSON.stringify(index.key);
      const unique = index.unique ? ' (unique)' : '';
      const sparse = index.sparse ? ' (sparse)' : '';
      logInfo(`${i + 1}. ${index.name}${unique}${sparse}`);
      logInfo(`   Keys: ${keyStr}`);
    });

    return { success: true, count: indexes.length };
  } catch (error) {
    logError(`Failed to create indexes for ${modelName}: ${error.message}`);
    return { success: false, error: error.message, count: 0 };
  }
}

/**
 * Creates all indexes for all models
 */
async function createAllIndexes() {
  const startTime = Date.now();
  const results = [];

  logSection('MongoDB Index Creation for Campus Market');
  log(`Starting at ${new Date().toISOString()}`, 'blue');

  // Define all models with their descriptions
  const models = [
    { Model: User, name: 'User', description: 'User authentication and lookups' },
    { Model: Product, name: 'Product', description: 'Product search and filtering' },
    { Model: Order, name: 'Order', description: 'Order lookup and dashboard queries' },
    { Model: Message, name: 'Message', description: 'Message conversation retrieval' },
    { Model: Review, name: 'Review', description: 'Review filtering and sorting' },
    { Model: Cart, name: 'Cart', description: 'Cart lookups' },
    { Model: Wishlist, name: 'Wishlist', description: 'Wishlist lookups' },
    { Model: Notification, name: 'Notification', description: 'Notification retrieval' },
    { Model: SellerBalance, name: 'SellerBalance', description: 'Seller balance tracking' },
    { Model: Category, name: 'Category', description: 'Category lookups' }
  ];

  // Create indexes for each model
  for (const { Model, name, description } of models) {
    const result = await createModelIndexes(Model, name, description);
    results.push({ model: name, ...result });
  }

  // Print summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const totalIndexes = results.reduce((sum, r) => sum + (r.count || 0), 0);

  logSection('Summary');
  log(`Total models processed: ${results.length}`, 'bright');
  log(`Total indexes created: ${totalIndexes}`, 'bright');
  logSuccess(`Successful: ${successCount}`);
  if (failCount > 0) {
    logError(`Failed: ${failCount}`);
  }
  log(`\nCompleted in ${duration}s`, 'blue');

  return results;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Get MongoDB URI from environment
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      logError('MONGODB_URI environment variable is not set');
      log('Usage: MONGODB_URI="your_connection_string" node backend/scripts/create-indexes.js', 'yellow');
      process.exit(1);
    }

    // Connect to MongoDB
    log('Connecting to MongoDB...', 'blue');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    logSuccess('Connected to MongoDB');

    // Create indexes
    const results = await createAllIndexes();

    // Exit with appropriate code
    const hasFailures = results.some(r => !r.success);
    process.exit(hasFailures ? 1 : 0);

  } catch (error) {
    logError(`Script failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    // Close connection
    if (mongoose.connection.readyState === 1) {
      log('\nClosing MongoDB connection...', 'blue');
      await mongoose.connection.close();
      logSuccess('Connection closed');
    }
  }
}

// Run script
main();
