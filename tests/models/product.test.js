/**
 * Product Model Tests
 */

const Product = require('../../models/Product');
const User = require('../../models/User');
const Category = require('../../models/Category');
const { connect, close, clear } = require('../utils/db');

describe('Product Model', () => {
  let seller, category;

  beforeAll(async () => {
    await connect();

    // Create test seller and category
    seller = await User.create({
      name: 'Test Seller',
      email: 'seller@example.com',
      password: 'ValidPassword123!',
      phone: '+254712345678',
      role: 'seller'
    });

    category = await Category.create({
      name: 'Test Category',
      slug: 'test-category',
      description: 'A test category'
    });
  });

  afterEach(async () => {
    await clear();

    // Recreate seller and category after clearing
    seller = await User.create({
      name: 'Test Seller',
      email: `seller-${Date.now()}@example.com`,
      password: 'ValidPassword123!',
      phone: '+254712345678',
      role: 'seller'
    });

    category = await Category.create({
      name: 'Test Category',
      slug: `test-category-${Date.now()}`,
      description: 'A test category'
    });
  });

  afterAll(async () => {
    await close();
  });

  describe('Product Creation', () => {
    test('should create a valid product', async () => {
      const productData = {
        title: 'Test Product',
        description: 'A test product description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center',
        images: ['https://example.com/image.jpg']
      };

      const product = await Product.create(productData);

      expect(product.title).toBe(productData.title);
      expect(product.description).toBe(productData.description);
      expect(product.price).toBe(productData.price);
      expect(product.location).toBe(productData.location);
      expect(product.status).toBe('available');
    });

    test('should require all required fields', async () => {
      const product = new Product({});

      let validationError;
      try {
        await product.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.title).toBeDefined();
      expect(validationError.errors.description).toBeDefined();
      expect(validationError.errors.price).toBeDefined();
      expect(validationError.errors.seller).toBeDefined();
      expect(validationError.errors.category).toBeDefined();
      expect(validationError.errors.location).toBeDefined();
    });

    test('should validate title max length', async () => {
      const product = new Product({
        title: 'A'.repeat(101), // Exceeds 100 character limit
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center'
      });

      let validationError;
      try {
        await product.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.title).toBeDefined();
    });

    test('should validate description max length', async () => {
      const product = new Product({
        title: 'Valid Title',
        description: 'A'.repeat(2001), // Exceeds 2000 character limit
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center'
      });

      let validationError;
      try {
        await product.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.description).toBeDefined();
    });

    test('should validate price is non-negative', async () => {
      const product = new Product({
        title: 'Valid Title',
        description: 'Valid description',
        price: -100, // Negative price
        seller: seller._id,
        category: category._id,
        location: 'Campus Center'
      });

      let validationError;
      try {
        await product.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.price).toBeDefined();
    });

    test('should validate condition enum values', async () => {
      const product = new Product({
        title: 'Valid Title',
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center',
        condition: 'invalid-condition'
      });

      let validationError;
      try {
        await product.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.condition).toBeDefined();
    });

    test('should validate status enum values', async () => {
      const product = new Product({
        title: 'Valid Title',
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center',
        status: 'invalid-status'
      });

      let validationError;
      try {
        await product.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.status).toBeDefined();
    });

    test('should accept valid condition values', async () => {
      const validConditions = ['new', 'like-new', 'good', 'fair'];

      for (const condition of validConditions) {
        const product = await Product.create({
          title: `Product ${condition}`,
          description: 'Valid description',
          price: 1000,
          seller: seller._id,
          category: category._id,
          location: 'Campus Center',
          condition
        });

        expect(product.condition).toBe(condition);
      }
    });

    test('should accept valid status values', async () => {
      const validStatuses = ['available', 'sold', 'pending'];

      for (const status of validStatuses) {
        const product = await Product.create({
          title: `Product ${status}`,
          description: 'Valid description',
          price: 1000,
          seller: seller._id,
          category: category._id,
          location: 'Campus Center',
          status
        });

        expect(product.status).toBe(status);
      }
    });
  });

  describe('Product Defaults', () => {
    test('should set default status to available', async () => {
      const product = await Product.create({
        title: 'Test Product',
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center'
      });

      expect(product.status).toBe('available');
    });

    test('should set default condition to good', async () => {
      const product = await Product.create({
        title: 'Test Product',
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center'
      });

      expect(product.condition).toBe('good');
    });

    test('should set default isNegotiable to false', async () => {
      const product = await Product.create({
        title: 'Test Product',
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center'
      });

      expect(product.isNegotiable).toBe(false);
    });

    test('should set default views to 0', async () => {
      const product = await Product.create({
        title: 'Test Product',
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center'
      });

      expect(product.views).toBe(0);
    });

    test('should set default averageRating to 0', async () => {
      const product = await Product.create({
        title: 'Test Product',
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center'
      });

      expect(product.averageRating).toBe(0);
    });

    test('should set default totalReviews to 0', async () => {
      const product = await Product.create({
        title: 'Test Product',
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center'
      });

      expect(product.totalReviews).toBe(0);
    });
  });

  describe('Product Timestamps', () => {
    test('should have createdAt timestamp', async () => {
      const product = await Product.create({
        title: 'Test Product',
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center'
      });

      expect(product.createdAt).toBeDefined();
      expect(product.createdAt).toBeInstanceOf(Date);
    });

    test('should have updatedAt timestamp', async () => {
      const product = await Product.create({
        title: 'Test Product',
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center'
      });

      expect(product.updatedAt).toBeDefined();
      expect(product.updatedAt).toBeInstanceOf(Date);
    });

    test('should update updatedAt on modification', async () => {
      const product = await Product.create({
        title: 'Test Product',
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center'
      });

      const originalUpdatedAt = product.updatedAt;

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      product.price = 2000;
      await product.save();

      expect(product.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Product Relationships', () => {
    test('should reference seller correctly', async () => {
      const product = await Product.create({
        title: 'Test Product',
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center'
      });

      expect(product.seller).toEqual(seller._id);
    });

    test('should reference category correctly', async () => {
      const product = await Product.create({
        title: 'Test Product',
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center'
      });

      expect(product.category).toEqual(category._id);
    });

    test('should store multiple images', async () => {
      const images = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg'
      ];

      const product = await Product.create({
        title: 'Test Product',
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center',
        images
      });

      expect(product.images).toHaveLength(3);
      expect(product.images).toEqual(images);
    });

    test('should store likes array', async () => {
      const liker = await User.create({
        name: 'Liker User',
        email: 'liker@example.com',
        password: 'ValidPassword123!',
        phone: '+254799999999',
        role: 'buyer'
      });

      const product = await Product.create({
        title: 'Test Product',
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center',
        likes: [liker._id]
      });

      expect(product.likes).toHaveLength(1);
      expect(product.likes[0]).toEqual(liker._id);
    });

    test('should store tags array', async () => {
      const tags = ['electronics', 'laptop', 'gaming'];

      const product = await Product.create({
        title: 'Test Product',
        description: 'Valid description',
        price: 1000,
        seller: seller._id,
        category: category._id,
        location: 'Campus Center',
        tags
      });

      expect(product.tags).toHaveLength(3);
      expect(product.tags).toEqual(tags);
    });
  });
});
