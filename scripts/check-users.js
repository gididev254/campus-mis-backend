require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI;

async function checkAndFixUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected...');

    const users = await User.find({});
    console.log(`\nFound ${users.length} users:\n`);

    for (const user of users) {
      console.log(`${user.name} (${user.email}) - Role: ${user.role}`);
    }

    // Reset passwords to known values
    console.log('\nResetting passwords...');

    const admin = await User.findOne({ email: 'admin@campus.com' });
    if (admin) {
      admin.password = await bcrypt.hash('admin123', 10);
      await admin.save();
      console.log('✓ Reset admin password');
    }

    const seller = await User.findOne({ email: 'seller@campus.com' });
    if (seller) {
      seller.password = await bcrypt.hash('seller123', 10);
      await seller.save();
      console.log('✓ Reset seller password');
    }

    const buyer = await User.findOne({ email: 'buyer@campus.com' });
    if (buyer) {
      buyer.password = await bcrypt.hash('buyer123', 10);
      await buyer.save();
      console.log('✓ Reset buyer password');
    }

    console.log('\nTest credentials:');
    console.log('  admin@campus.com / admin123');
    console.log('  seller@campus.com / seller123');
    console.log('  buyer@campus.com / buyer123');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndFixUsers();
