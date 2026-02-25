/**
 * Jest setup file for backend tests
 * Runs before all test suites
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-tokens';
process.env.JWT_EXPIRE = '1h';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.API_URL = 'http://localhost:5000';

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock logger utility
jest.mock('../utils/logger', () => ({
  auth: jest.fn(),
  order: jest.fn(),
  product: jest.fn(),
  user: jest.fn(),
  message: jest.fn(),
  system: jest.fn(),
  error: jest.fn(),
}));

// Mock email utility
jest.mock('../utils/email', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

// Mock Cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn().mockResolvedValue({
        secure_url: 'https://example.com/image.jpg',
        public_id: 'test-image'
      }),
      destroy: jest.fn().mockResolvedValue({ result: 'ok' })
    },
    api: {
      delete_resources: jest.fn().mockResolvedValue({})
    }
  }
}));

// Mock Socket.io
jest.mock('../server', () => {
  const mockIo = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn().mockReturnThis(),
    use: jest.fn(),
    on: jest.fn(),
  };

  return {
    ...jest.requireActual('../server'),
    io: mockIo,
  };
});

// Mock global.io for controllers
global.io = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn().mockReturnThis(),
  use: jest.fn(),
  on: jest.fn(),
};

// Increase timeout for database operations
jest.setTimeout(10000);
