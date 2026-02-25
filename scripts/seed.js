require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');

const MONGODB_URI = process.env.MONGODB_URI;

const users = [
  {
    name: 'Admin User',
    email: 'admin@market.com',
    password: 'admin123',
    role: 'admin',
    phone: '+254700000001',
    location: 'Main Campus',
    isVerified: true
  },
  {
    name: 'John Seller',
    email: 'seller@campus.com',
    password: 'seller123',
    role: 'seller',
    phone: '+254700000002',
    location: 'Hostel A',
    isVerified: true
  },
  {
    name: 'Jane Buyer',
    email: 'buyer@campus.com',
    password: 'buyer123',
    role: 'buyer',
    phone: '+254700000003',
    location: 'Hostel B',
    isVerified: true
  },
  {
    name: 'Test Seller 2',
    email: 'seller2@campus.com',
    password: 'seller123',
    role: 'seller',
    phone: '+254700000004',
    location: 'Off Campus',
    isVerified: true
  },
  {
    name: 'Test Buyer 2',
    email: 'buyer2@campus.com',
    password: 'buyer123',
    role: 'buyer',
    phone: '+254700000005',
    location: 'Main Campus',
    isVerified: true
  }
];

const categories = [
  { name: 'Electronics', slug: 'electronics', icon: '💻', description: 'Phones, laptops, and accessories' },
  { name: 'Books & Study Materials', slug: 'books-study-materials', icon: '📚', description: 'Textbooks, notes, and stationery' },
  { name: 'Clothing & Fashion', slug: 'clothing-fashion', icon: '👕', description: 'Clothes, shoes, and accessories' },
  { name: 'Furniture', slug: 'furniture', icon: '🪑', description: 'Desks, chairs, and room decor' },
  { name: 'Sports & Fitness', slug: 'sports-fitness', icon: '⚽', description: 'Sports equipment and fitness gear' },
  { name: 'Services', slug: 'services', icon: '🔧', description: 'Tutoring, tech support, and more' }
];

const products = [
  {
    title: 'iPhone 11 - Good Condition',
    description: 'Well maintained iPhone 11 with 64GB storage. Comes with charger and case.',
    price: 25000,
    condition: 'good',
    location: 'Hostel A',
    images: ['https://res.cloudinary.com/dllgsojfm/image/upload/v1/sample.jpg'],
    tags: ['iphone', 'apple', 'phone']
  },
  {
    title: 'Engineering Mathematics Textbook',
    description: 'K.A. Stroud Engineering Mathematics - 7th Edition. Like new condition.',
    price: 1500,
    condition: 'like-new',
    location: 'Hostel B',
    images: ['https://res.cloudinary.com/dllgsojfm/image/upload/v1/sample.jpg'],
    tags: ['textbook', 'engineering', 'math']
  },
  {
    title: 'Study Chair with Cushion',
    description: 'Comfortable study chair with back support. Used for 1 semester.',
    price: 3000,
    condition: 'good',
    location: 'Hostel A',
    images: ['https://res.cloudinary.com/dllgsojfm/image/upload/v1/sample.jpg'],
    tags: ['chair', 'furniture', 'study']
  },
  {
    title: 'Nike Hoodie Size L',
    description: 'Black Nike hoodie, worn a few times. Authentic product.',
    price: 2000,
    condition: 'like-new',
    location: 'Main Campus',
    images: ['https://res.cloudinary.com/dllgsojfm/image/upload/v1/sample.jpg'],
    tags: ['hoodie', 'nike', 'clothing']
  },
  {
    title: 'HP Laptop 15-inch',
    description: 'HP Pavilion 15, i5 10th gen, 8GB RAM, 256GB SSD. Good for coding and assignments.',
    price: 45000,
    condition: 'good',
    location: 'Hostel A',
    images: ['https://res.cloudinary.com/dllgsojfm/image/upload/v1/sample.jpg'],
    tags: ['laptop', 'hp', 'computer']
  },
  {
    title: 'Study Table',
    description: 'Wooden study table with drawer. Perfect for hostel room.',
    price: 3500,
    condition: 'fair',
    location: 'Off Campus',
    images: ['https://res.cloudinary.com/dllgsojfm/image/upload/v1/sample.jpg'],
    tags: ['table', 'furniture', 'study']
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected...');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Category.collection.drop().catch(() => {});
    console.log('Cleared existing data...');

    // Create categories
    const createdCategories = [];
    for (const cat of categories) {
      const created = await Category.create(cat);
      createdCategories.push(created);
      console.log(`Created category: ${cat.name}`);
    }

    // Create users
    const createdUsers = [];
    for (const userData of users) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
      const user = await User.create(userData);
      createdUsers.push(user);
    }
    console.log(`Created ${createdUsers.length} users`);

    // Create products for sellers
    const seller1 = createdUsers.find(u => u.email === 'seller@campus.com');
    const seller2 = createdUsers.find(u => u.email === 'seller2@campus.com');

    const productsSeller1 = products.slice(0, 4).map(p => ({
      ...p,
      seller: seller1._id,
      category: createdCategories.find(c => c.slug === 'electronics' || c.slug === 'books-study-materials' || c.slug === 'furniture' || c.slug === 'clothing-fashion')._id
    }));

    const productsSeller2 = products.slice(4, 6).map(p => ({
      ...p,
      seller: seller2._id,
      category: createdCategories.find(c => c.slug === 'electronics' || c.slug === 'furniture')._id
    }));

    const allProducts = [...productsSeller1.map((p, i) => ({...p, category: createdCategories[i%4]._id})),
                          ...productsSeller2.map((p, i) => ({...p, category: createdCategories[(i+2)%4]._id}))];

    await Product.insertMany(allProducts);
    console.log(`Created ${products.length} products`);

    console.log('\n=================================');
    console.log('SEEDING COMPLETE!');
    console.log('=================================\n');
    console.log('TEST ACCOUNTS:');
    console.log('-------------------');
    createdUsers.forEach(user => {
      console.log(`${user.role.toUpperCase()}: ${user.email} / ${user.email.split('@')[0]}`);
    });
    console.log('\nAll passwords: [user]123 pattern');
    console.log('\nExample:');
    console.log('  Admin: admin@market.com / admin123');
    console.log('  Seller: seller@campus.com / seller123');
    console.log('  Buyer: buyer@campus.com / buyer123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
