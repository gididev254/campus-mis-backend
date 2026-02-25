/**
 * @fileoverview Async wrapper for Express route handlers
 * @description Catches errors in async functions and passes them to error middleware
 * @module utils/catchAsync
 */

/**
 * Wrapper function to catch errors in async Express route handlers
 * @function
 * @param {Function} fn - Async Express route handler
 * @returns {Function} Wrapped function that catches errors
 */
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
