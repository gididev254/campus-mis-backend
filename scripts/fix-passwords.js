const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function fixPasswords() {
  console.log('🔧 Starting password fix...\n');

  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // IMPORTANT: Select password field explicitly (it has select: false in schema)
    console.log('👥 Fetching all users with passwords...');
    const users = await User.find({}).select('+password');
    console.log(`✅ Found ${users.length} users\n`);

    let fixedCount = 0;
    let alreadyHashedCount = 0;
    let errors = [];

    for (const user of users) {
      try {
        // Check if password exists and is hashed
        if (!user.password) {
          console.log(`⚠️ ${user.email} - No password found, skipping...`);
          errors.push({ email: user.email, error: 'No password' });
          continue;
        }

        const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');

        if (isHashed) {
          console.log(`✅ ${user.email} - Password already hashed`);
          alreadyHashedCount++;
        } else {
          console.log(`🔐 ${user.email} - Hashing password...`);
          
          const plainPassword = user.password;
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(plainPassword, salt);
          
          user.password = hashedPassword;
          await user.save({ validateBeforeSave: false });
          
          console.log(`✅ ${user.email} - Password hashed successfully`);
          fixedCount++;
        }
      } catch (error) {
        console.error(`❌ ${user.email} - Error: ${error.message}`);
        errors.push({ email: user.email, error: error.message });
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Users: ${users.length}`);
    console.log(`✅ Passwords Fixed: ${fixedCount}`);
    console.log(`✅ Already Hashed: ${alreadyHashedCount}`);
    console.log(`❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(err => console.log(`  - ${err.email}: ${err.error}`));
    }

    console.log('\n✅ Password fix completed!');

    // Test logins
    console.log('\n' + '='.repeat(50));
    console.log('🧪 TESTING LOGIN');
    console.log('='.repeat(50));

    const testUsers = [
      { email: 'admin@market.com', password: 'admin123', description: 'Admin User' },
      { email: 'john@example.com', password: 'password123', description: 'Test Buyer' },
      { email: 'admin@embuni.market', password: 'admin123', description: 'Alt Admin' }
    ];

    for (const testUser of testUsers) {
      try {
        const user = await User.findOne({ email: testUser.email }).select('+password');
        if (user) {
          const isMatch = await user.comparePassword(testUser.password);
          if (isMatch) {
            console.log(`✅ ${testUser.description} (${testUser.email}) - Login PASSED`);
          } else {
            console.log(`❌ ${testUser.description} (${testUser.email}) - Password mismatch`);
          }
        } else {
          console.log(`⚠️ ${testUser.description} (${testUser.email}) - User not found`);
        }
      } catch (error) {
        console.log(`❌ ${testUser.description} - Error: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

fixPasswords();
