/**
 * User Model Tests
 */

const User = require('../../models/User');
const { connect, close, clear } = require('../utils/db');

describe('User Model', () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clear();
  });

  afterAll(async () => {
    await close();
  });

  describe('User Creation', () => {
    test('should create a valid user', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'ValidPassword123!',
        phone: '+254712345678',
        role: 'buyer'
      };

      const user = await User.create(userData);

      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.phone).toBe(userData.phone);
      expect(user.role).toBe('buyer');
      expect(user.isVerified).toBe(false);
      expect(user.isActive).toBe(true);
    });

    test('should hash password before saving', async () => {
      const plainPassword = 'ValidPassword123!';
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: plainPassword,
        phone: '+254712345678'
      });

      expect(user.password).not.toBe(plainPassword);
      expect(user.password.length).toBeGreaterThan(20);
    });

    test('should require all required fields', async () => {
      const user = new User({});

      let validationError;
      try {
        await user.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.name).toBeDefined();
      expect(validationError.errors.email).toBeDefined();
      expect(validationError.errors.password).toBeDefined();
      expect(validationError.errors.phone).toBeDefined();
    });

    test('should validate email format', async () => {
      const user = new User({
        name: 'Test User',
        email: 'invalid-email',
        password: 'ValidPassword123!',
        phone: '+254712345678'
      });

      let validationError;
      try {
        await user.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.email).toBeDefined();
    });

    test('should validate email uniqueness', async () => {
      const email = 'test@example.com';

      await User.create({
        name: 'User 1',
        email,
        password: 'ValidPassword123!',
        phone: '+254711111111'
      });

      let validationError;
      try {
        await User.create({
          name: 'User 2',
          email,
          password: 'ValidPassword123!',
          phone: '+254722222222'
        });
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.code).toBe(11000); // MongoDB duplicate key error
    });

    test('should validate password length (minimum 12 characters)', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Short1!',
        phone: '+254712345678'
      });

      let validationError;
      try {
        await user.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.password).toBeDefined();
    });

    test('should validate password complexity', async () => {
      const invalidPasswords = [
        'alllowercase123!', // No uppercase
        'ALLUPPERCASE123!', // No lowercase
        'NoNumbersHere!', // No numbers
        'NoSpecialChars123', // No special character
      ];

      for (const password of invalidPasswords) {
        const user = new User({
          name: 'Test User',
          email: `test-${Date.now()}@example.com`,
          password,
          phone: '+254712345678'
        });

        let validationError;
        try {
          await user.save();
        } catch (error) {
          validationError = error;
        }

        expect(validationError).toBeDefined();
        expect(validationError.errors.password).toBeDefined();
      }
    });

    test('should validate phone format', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        phone: 'invalid-phone'
      });

      let validationError;
      try {
        await user.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.phone).toBeDefined();
    });

    test('should validate role enum values', async () => {
      const user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        phone: '+254712345678',
        role: 'invalid-role'
      });

      let validationError;
      try {
        await user.save();
      } catch (error) {
        validationError = error;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.role).toBeDefined();
    });
  });

  describe('User Methods', () => {
    test('should compare password correctly', async () => {
      const plainPassword = 'ValidPassword123!';
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: plainPassword,
        phone: '+254712345678'
      });

      const isMatch = await user.comparePassword(plainPassword);
      expect(isMatch).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        phone: '+254712345678'
      });

      const isMatch = await user.comparePassword('WrongPassword123!');
      expect(isMatch).toBe(false);
    });

    test('should not rehash password on update if not modified', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        phone: '+254712345678'
      });

      const originalHash = user.password;

      user.name = 'Updated Name';
      await user.save();

      expect(user.password).toBe(originalHash);
    });
  });

  describe('User Defaults', () => {
    test('should set default role to buyer', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        phone: '+254712345678'
      });

      expect(user.role).toBe('buyer');
    });

    test('should set default isActive to true', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        phone: '+254712345678'
      });

      expect(user.isActive).toBe(true);
    });

    test('should set default isVerified to false', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        phone: '+254712345678'
      });

      expect(user.isVerified).toBe(false);
    });

    test('should set default averageRating to 0', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        phone: '+254712345678'
      });

      expect(user.averageRating).toBe(0);
    });

    test('should set default isOnline to false', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        phone: '+254712345678'
      });

      expect(user.isOnline).toBe(false);
    });
  });

  describe('User Timestamps', () => {
    test('should have createdAt timestamp', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        phone: '+254712345678'
      });

      expect(user.createdAt).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    test('should have updatedAt timestamp', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        phone: '+254712345678'
      });

      expect(user.updatedAt).toBeDefined();
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    test('should update updatedAt on modification', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        phone: '+254712345678'
      });

      const originalUpdatedAt = user.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      user.name = 'Updated Name';
      await user.save();

      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
