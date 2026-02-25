/**
 * Order Model Tests
 */

const Order = require('../../models/Order');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const { connect, close, clear } = require('../utils/db');

describe('Order Model', () => {
  let buyer, seller, product;

  beforeAll(async () => {
    await connect();

    // Create test users
    buyer = await User.create({
      name: 'Test Buyer',
      email: 'buyer@example.com',
      password: 'ValidPassword123!',
      phone: '+254711111111',
      role: 'buyer'
    });

    seller = await User.create({
      name: 'Test Seller',
      email: 'seller@example.com',
      password: 'ValidPassword123!',
      phone: '+254722222222',
      role: 'seller'
    });

    // Create test category and product
    const category = await Category.create({
      name: 'Test Category',
      slug: 'test-category',
      description: 'A test category'
    });

    product = await Product.create({
      title: 'Test Product',
      description: 'A test product',
      price: 1000,
      seller: seller._id,
      category: category._id,
      location: 'Campus Center'
    });
  });

  afterEach(async () => {
    await clear();

    // Recreate test data after clearing
    buyer = await User.create({
      name: 'Test Buyer',
      email: `buyer-${Date.now()}@example.com`,
      password: 'ValidPassword123!',
      phone: '+254711111111',
      role: 'buyer'
    });

    seller = await User.create({
      name: 'Test Seller',
      email: `seller-${Date.now()}@example.com`,
      password: 'ValidPassword123!',
      phone: '+254722222222',
      role: 'seller'
    });

    const category = await Category.create({
      name: 'Test Category',
      slug: `test-category-${Date.now()}`,
      description: 'A test category'
    });

    product = await Product.create({
      title: 'Test Product',
      description: 'A test product',
      price: 1000,
      seller: seller._id,
      category: category._id,
      location: 'Campus Center'
    });
  });

  afterAll(async () => {
    await close();
  });

  describe('Order Creation', () => {
    test('should create a valid order', async () => {
      const orderData = {
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        quantity: 1,
        totalPrice: product.price
      };

      const order = await Order.create(orderData);

      expect(order.buyer).toEqual(buyer._id);
      expect(order.seller).toEqual(seller._id);
      expect(order.product).toEqual(product._id);
      expect(order.quantity).toBe(1);
      expect(order.totalPrice).toBe(product.price);
      expect(order.status).toBe('pending');
      expect(order.paymentStatus).toBe('pending');
    });

    test('should generate unique order number', async () => {
      const order = await Order.create({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        quantity: 1,
        totalPrice: product.price
      });

      expect(order.orderNumber).toBeDefined();
      expect(order.orderNumber).toMatch(/^ORD-\d+-\d{4}$/);
    });

    test('should require all required fields', async () => {
      const order = new Order({});

      let validationError;
      try {
        await order.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.buyer).toBeDefined();
      expect(validationError.errors.seller).toBeDefined();
      expect(validationError.errors.product).toBeDefined();
      expect(validationError.errors.totalPrice).toBeDefined();
    });

    test('should validate quantity minimum value', async () => {
      const order = new Order({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        quantity: 0, // Invalid: less than 1
        totalPrice: product.price
      });

      let validationError;
      try {
        await order.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.quantity).toBeDefined();
    });

    test('should validate totalPrice is non-negative', async () => {
      const order = new Order({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        quantity: 1,
        totalPrice: -100 // Invalid: negative price
      });

      let validationError;
      try {
        await order.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.totalPrice).toBeDefined();
    });

    test('should validate status enum values', async () => {
      const order = new Order({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        quantity: 1,
        totalPrice: product.price,
        status: 'invalid-status'
      });

      let validationError;
      try {
        await order.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.status).toBeDefined();
    });

    test('should validate paymentStatus enum values', async () => {
      const order = new Order({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        quantity: 1,
        totalPrice: product.price,
        paymentStatus: 'invalid-status'
      });

      let validationError;
      try {
        await order.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.paymentStatus).toBeDefined();
    });

    test('should validate paymentMethod enum values', async () => {
      const order = new Order({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        quantity: 1,
        totalPrice: product.price,
        paymentMethod: 'credit-card' // Invalid: only mpesa or cash allowed
      });

      let validationError;
      try {
        await order.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.paymentMethod).toBeDefined();
    });

    test('should accept valid status values', async () => {
      const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'];

      for (const status of validStatuses) {
        const order = await Order.create({
          buyer: buyer._id,
          seller: seller._id,
          product: product._id,
          quantity: 1,
          totalPrice: product.price,
          status
        });

        expect(order.status).toBe(status);
      }
    });

    test('should accept valid paymentStatus values', async () => {
      const validStatuses = ['pending', 'completed', 'failed', 'refunded'];

      for (const paymentStatus of validStatuses) {
        const order = await Order.create({
          buyer: buyer._id,
          seller: seller._id,
          product: product._id,
          quantity: 1,
          totalPrice: product.price,
          paymentStatus
        });

        expect(order.paymentStatus).toBe(paymentStatus);
      }
    });

    test('should accept valid paymentMethod values', async () => {
      const validMethods = ['mpesa', 'cash'];

      for (const paymentMethod of validMethods) {
        const order = await Order.create({
          buyer: buyer._id,
          seller: seller._id,
          product: product._id,
          quantity: 1,
          totalPrice: product.price,
          paymentMethod
        });

        expect(order.paymentMethod).toBe(paymentMethod);
      }
    });
  });

  describe('Order Defaults', () => {
    test('should set default quantity to 1', async () => {
      const order = await Order.create({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price
      });

      expect(order.quantity).toBe(1);
    });

    test('should set default status to pending', async () => {
      const order = await Order.create({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price
      });

      expect(order.status).toBe('pending');
    });

    test('should set default paymentStatus to pending', async () => {
      const order = await Order.create({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price
      });

      expect(order.paymentStatus).toBe('pending');
    });

    test('should set default paymentMethod to mpesa', async () => {
      const order = await Order.create({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price
      });

      expect(order.paymentMethod).toBe('mpesa');
    });

    test('should set default sellerPaid to false', async () => {
      const order = await Order.create({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price
      });

      expect(order.sellerPaid).toBe(false);
    });

    test('should set default mpesaTransactionId to null', async () => {
      const order = await Order.create({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price
      });

      expect(order.mpesaTransactionId).toBeNull();
    });

    test('should set default sellerPaidAt to null', async () => {
      const order = await Order.create({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price
      });

      expect(order.sellerPaidAt).toBeNull();
    });
  });

  describe('Order Timestamps', () => {
    test('should have createdAt timestamp', async () => {
      const order = await Order.create({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price
      });

      expect(order.createdAt).toBeDefined();
      expect(order.createdAt).toBeInstanceOf(Date);
    });

    test('should have updatedAt timestamp', async () => {
      const order = await Order.create({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price
      });

      expect(order.updatedAt).toBeDefined();
      expect(order.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Order Shipping Address', () => {
    test('should store shipping address', async () => {
      const shippingAddress = {
        street: '123 Main St',
        city: 'Nairobi',
        building: 'Building A',
        room: 'Room 101',
        landmarks: 'Near the library'
      };

      const order = await Order.create({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price,
        shippingAddress
      });

      expect(order.shippingAddress).toBeDefined();
      expect(order.shippingAddress.street).toBe('123 Main St');
      expect(order.shippingAddress.city).toBe('Nairobi');
      expect(order.shippingAddress.building).toBe('Building A');
      expect(order.shippingAddress.room).toBe('Room 101');
      expect(order.shippingAddress.landmarks).toBe('Near the library');
    });

    test('should allow partial shipping address', async () => {
      const shippingAddress = {
        city: 'Nairobi',
        building: 'Building A'
      };

      const order = await Order.create({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price,
        shippingAddress
      });

      expect(order.shippingAddress.city).toBe('Nairobi');
      expect(order.shippingAddress.building).toBe('Building A');
      expect(order.shippingAddress.street).toBeUndefined();
    });
  });

  describe('Order Notes', () => {
    test('should store notes', async () => {
      const notes = 'Please deliver before 5pm';

      const order = await Order.create({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price,
        notes
      });

      expect(order.notes).toBe(notes);
    });

    test('should validate notes max length', async () => {
      const order = new Order({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price,
        notes: 'A'.repeat(501) // Exceeds 500 character limit
      });

      let validationError;
      try {
        await order.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.notes).toBeDefined();
    });
  });

  describe('Order Cancellation', () => {
    test('should store cancellation reason', async () => {
      const order = await Order.create({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price,
        cancellationReason: 'buyer-request'
      });

      expect(order.cancellationReason).toBe('buyer-request');
    });

    test('should accept valid cancellation reasons', async () => {
      const validReasons = ['buyer-request', 'seller-request', 'payment-failed', 'other'];

      for (const reason of validReasons) {
        const order = await Order.create({
          buyer: buyer._id,
          seller: seller._id,
          product: product._id,
          totalPrice: product.price,
          cancellationReason: reason
        });

        expect(order.cancellationReason).toBe(reason);
      }
    });

    test('should validate cancellationReason enum', async () => {
      const order = new Order({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price,
        cancellationReason: 'invalid-reason'
      });

      let validationError;
      try {
        await order.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.cancellationReason).toBeDefined();
    });
  });

  describe('Order Number Uniqueness', () => {
    test('should generate unique order numbers for multiple orders', async () => {
      const order1 = await Order.create({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price
      });

      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps

      const order2 = await Order.create({
        buyer: buyer._id,
        seller: seller._id,
        product: product._id,
        totalPrice: product.price
      });

      expect(order1.orderNumber).not.toBe(order2.orderNumber);
    });
  });
});
