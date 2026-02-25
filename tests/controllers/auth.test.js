/**
 * Auth Controller Tests
 */

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const authRoutes = require('../../routes/auth');
const { connect, close, clear } = require('../utils/db');
const { generateToken } = require('../utils/helpers');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Controller', () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clear();
  });

  afterAll(async () => {
    await close();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new buyer user', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'ValidPassword123!',
        phone: '+254712345678',
        role: 'buyer',
        location: 'Hostel A'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.user.role).toBe('buyer');
      expect(response.body.data.user.password).toBeUndefined();
    });

    test('should register a new seller user', async () => {
      const userData = {
        name: 'Jane Seller',
        email: 'jane@example.com',
        password: 'ValidPassword123!',
        phone: '+254798765432',
        role: 'seller',
        location: 'Hostel B'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('seller');
    });

    test('should not allow admin registration', async () => {
      const userData = {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'ValidPassword123!',
        phone: '+254711111111',
        role: 'admin'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Admin registration is not allowed');
    });

    test('should reject registration with existing email', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        phone: '+254712345678',
        role: 'buyer'
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...userData,
          name: 'Another User',
          phone: '+254722222222'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    test('should reject registration with weak password (too short)', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Short1!', // Less than 12 characters
        phone: '+254712345678',
        role: 'buyer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('at least 12 characters');
    });

    test('should reject registration with weak password (missing uppercase)', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'alllowercase123!',
        phone: '+254712345678',
        role: 'buyer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('uppercase');
    });

    test('should reject registration with weak password (missing lowercase)', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'ALLUPPERCASE123!',
        phone: '+254712345678',
        role: 'buyer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('lowercase');
    });

    test('should reject registration with weak password (missing number)', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'NoNumbersHere!',
        phone: '+254712345678',
        role: 'buyer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('number');
    });

    test('should reject registration with weak password (missing special char)', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'NoSpecialChars123',
        phone: '+254712345678',
        role: 'buyer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('special character');
    });

    test('should reject registration with invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'ValidPassword123!',
        phone: '+254712345678',
        role: 'buyer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject registration with invalid phone', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        phone: 'invalid-phone',
        role: 'buyer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User'
          // Missing email, password, phone
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should default role to buyer when not provided', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        phone: '+254712345678'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.data.user.role).toBe('buyer');
    });
  });

  describe('POST /api/auth/login', () => {
    let user;
    const plainPassword = 'ValidPassword123!';

    beforeEach(async () => {
      user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: plainPassword,
        phone: '+254712345678',
        role: 'buyer'
      });
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: plainPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.password).toBeUndefined();
    });

    test('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: plainPassword
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    test('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    test('should reject login with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: plainPassword
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should not return password in response', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: plainPassword
        })
        .expect(200);

      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.user).not.toHaveProperty('password');
    });
  });

  describe('GET /api/auth/me', () => {
    let user;
    let token;

    beforeEach(async () => {
      user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'ValidPassword123!',
        phone: '+254712345678',
        role: 'buyer'
      });

      token = generateToken(user._id);
    });

    test('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.password).toBeUndefined();
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
