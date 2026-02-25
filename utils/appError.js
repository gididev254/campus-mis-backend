/**
 * @fileoverview Custom error class for application errors
 * @description Extends Error class to include HTTP status code and operational flag
 * @module utils/appError
 */

/**
 * Custom application error class
 * @class
 * @extends Error
 * @classdesc Represents an operational error in the application
 */
class AppError extends Error {
  /**
   * Create an application error
   * @constructor
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (4xx or 5xx)
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
