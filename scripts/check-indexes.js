/**
 * Check Existing Database Indexes
 *
 * This script displays all existing indexes on the main collections:
 * - Products
 * - Orders
 * - Users
 * - Messages
 * - Reviews
 *
 * Usage:
 *   node backend/scripts/check-indexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkIndexes() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Check Product indexes
    console.log('\n📦 Products Collection Indexes:');
    console.log('═'.repeat(60));
    const productIndexes = await db.collection('products').indexes();
    productIndexes.forEach((index, i) => {
      console.log(`\n${i + 1}. Index: ${index.name}`);
      console.log(`   Keys: ${JSON.stringify(index.key)}`);
      if (index.unique) console.log('   Unique: true');
      if (index.sparse) console.log('   Sparse: true');
      if (index.background) console.log('   Background: true');
    });

    // Check Order indexes
    console.log('\n\n🛒 Orders Collection Indexes:');
    console.log('═'.repeat(60));
    const orderIndexes = await db.collection('orders').indexes();
    orderIndexes.forEach((index, i) => {
      console.log(`\n${i + 1}. Index: ${index.name}`);
      console.log(`   Keys: ${JSON.stringify(index.key)}`);
      if (index.unique) console.log('   Unique: true');
      if (index.sparse) console.log('   Sparse: true');
      if (index.background) console.log('   Background: true');
    });

    // Check User indexes
    console.log('\n\n👥 Users Collection Indexes:');
    console.log('═'.repeat(60));
    const userIndexes = await db.collection('users').indexes();
    userIndexes.forEach((index, i) => {
      console.log(`\n${i + 1}. Index: ${index.name}`);
      console.log(`   Keys: ${JSON.stringify(index.key)}`);
      if (index.unique) console.log('   Unique: true');
      if (index.sparse) console.log('   Sparse: true');
      if (index.background) console.log('   Background: true');
    });

    // Check Message indexes
    const collections = await db.listCollections().toArray();
    const hasMessages = collections.some(c => c.name === 'messages');
    if (hasMessages) {
      console.log('\n\n💬 Messages Collection Indexes:');
      console.log('═'.repeat(60));
      const messageIndexes = await db.collection('messages').indexes();
      messageIndexes.forEach((index, i) => {
        console.log(`\n${i + 1}. Index: ${index.name}`);
        console.log(`   Keys: ${JSON.stringify(index.key)}`);
        if (index.unique) console.log('   Unique: true');
        if (index.sparse) console.log('   Sparse: true');
        if (index.background) console.log('   Background: true');
      });
    }

    // Check Review indexes
    const hasReviews = collections.some(c => c.name === 'reviews');
    if (hasReviews) {
      console.log('\n\n⭐ Reviews Collection Indexes:');
      console.log('═'.repeat(60));
      const reviewIndexes = await db.collection('reviews').indexes();
      reviewIndexes.forEach((index, i) => {
        console.log(`\n${i + 1}. Index: ${index.name}`);
        console.log(`   Keys: ${JSON.stringify(index.key)}`);
        if (index.unique) console.log('   Unique: true');
        if (index.sparse) console.log('   Sparse: true');
        if (index.background) console.log('   Background: true');
      });
    }

    // Check Category indexes (if exists)
    const hasCategories = collections.some(c => c.name === 'categories');
    let categoryCount = 0;
    if (hasCategories) {
      console.log('\n\n🏷️  Categories Collection Indexes:');
      console.log('═'.repeat(60));
      const categoryIndexes = await db.collection('categories').indexes();
      categoryCount = categoryIndexes.length;
      categoryIndexes.forEach((index, i) => {
        console.log(`\n${i + 1}. Index: ${index.name}`);
        console.log(`   Keys: ${JSON.stringify(index.key)}`);
        if (index.unique) console.log('   Unique: true');
        if (index.sparse) console.log('   Sparse: true');
        if (index.background) console.log('   Background: true');
      });
    }

    // Summary
    console.log('\n\n📊 Index Summary:');
    console.log('═'.repeat(60));
    console.log(`Products: ${productIndexes.length} indexes`);
    console.log(`Orders: ${orderIndexes.length} indexes`);
    console.log(`Users: ${userIndexes.length} indexes`);
    if (hasMessages) console.log(`Messages: ${(await db.collection('messages').indexes()).length} indexes`);
    if (hasReviews) console.log(`Reviews: ${(await db.collection('reviews').indexes()).length} indexes`);
    if (hasCategories) console.log(`Categories: ${categoryCount} indexes`);

    console.log('\n\n💡 Tips:');
    console.log('   - Each index uses disk space and slows down writes');
    console.log('   - Only create indexes for queries you actually run');
    console.log('   - Compound indexes support queries on prefix fields');
    console.log('   - Use explain() to see if queries use indexes efficiently');

  } catch (error) {
    console.error('❌ Error checking indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the check
checkIndexes();
