require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./models/User');
  const admin = await User.findOne({ role: 'admin' });
  if (admin) {
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    admin.password = hashedPassword;
    admin.markModified('password');
    await admin.save();
    console.log('Password reset to: Admin@123');
  }
  await mongoose.connection.close();
}).catch(console.error);
