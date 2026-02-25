require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI;

async function debugLogin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected...\n');

    const testEmail = 'admin@campus.com';
    const testPassword = 'admin123';

    const user = await User.findOne({ email: testEmail }).select('+password');
    console.log('User found:', user ? 'Yes' : 'No');
    if (user) {
      console.log('Email:', user.email);
      console.log('Hashed password length:', user.password.length);
      console.log('Hash starts with:', user.password.substring(0, 10));

      // Test comparison
      const isMatch = await bcrypt.compare(testPassword, user.password);
      console.log('\nPassword match:', isMatch ? 'YES ✓' : 'NO ✗');

      // Try using model method
      const modelMatch = await user.comparePassword(testPassword);
      console.log('Model method match:', modelMatch ? 'YES ✓' : 'NO ✗');

      // Create new hash to compare
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('\nNew hash starts with:', newHash.substring(0, 10));
      console.log('New hash matches old:', await bcrypt.compare(testPassword, newHash) ? 'YES' : 'NO');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

debugLogin();
