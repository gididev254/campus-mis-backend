const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGODB_URI = 'mongodb+srv://campus:campus@cluster0.zzigobx.mongodb.net/campus_market_db';

async function checkPassword() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const admin = await User.findOne({ role: 'admin' }).select('+password');
    if (!admin) {
      console.log('No admin user found');
      process.exit(1);
    }

    console.log('\nAdmin User:');
    console.log('Email:', admin.email);
    console.log('Password hash:', admin.password.substring(0, 60) + '...');

    const passwords = ['admin123', 'Admin@123', 'admin', 'Admin123', 'seller123', 'Seller@123'];
    console.log('\nTesting passwords:');

    for (const pwd of passwords) {
      const match = await bcrypt.compare(pwd, admin.password);
      console.log(`  '${pwd}': ${match ? '✓ MATCH' : '✗ no match'}`);
      if (match) {
        console.log(`\n✓ CORRECT PASSWORD IS: ${pwd}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkPassword();
