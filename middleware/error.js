const logger = require('../utils/logger');

// Custom error class
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Error handler middleware
exports.errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error using logger
  logger.error('Request Error', {
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: err.statusCode || 500,
    errorMessage: err.message,
    userId: req.user?.id || 'anonymous',
    requestId: req.id,
    ip: req.ip || req.connection.remoteAddress
  }, err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Not found handler
exports.notFound = (req, res, next) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id || 'anonymous',
    requestId: req.id,
    ip: req.ip || req.connection.remoteAddress
  });

  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
};

exports.ErrorResponse = ErrorResponse;
