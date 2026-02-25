/**
 * @fileoverview Helper utility functions
 * @description Common utility functions for pagination, formatting, and data manipulation
 * @module utils/helpers
 */

/**
 * Generate pagination metadata from page and limit parameters
 * @function
 * @param {number|string} page - Page number (default: 1)
 * @param {number|string} limit - Number of items per page (default: 10)
 * @returns {Object} Pagination metadata with skip, limit, and page values
 */
exports.getPagination = (page, limit) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  return {
    skip,
    limit: limitNum,
    page: pageNum
  };
};

/**
 * Format paginated response with data and pagination metadata
 * @function
 * @param {Array} data - Array of items for current page
 * @param {number} total - Total number of items across all pages
 * @param {number} page - Current page number
 * @param {number} limit - Number of items per page
 * @returns {Object} Formatted response with data and pagination info
 */
exports.formatPaginationResponse = (data, total, page, limit) => {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

/**
 * Generate a random alphanumeric string
 * @function
 * @param {number} [length=32] - Length of string to generate
 * @returns {string} Random alphanumeric string
 */
exports.generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Convert text to URL-friendly slug
 * @function
 * @param {string} text - Text to slugify
 * @returns {string} Slugified text
 */
exports.slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

/**
 * Sanitize user input by removing potential HTML tags
 * @function
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
exports.sanitize = (text) => {
  if (typeof text !== 'string') return text;
  return text.trim().replace(/[<>]/g, '');
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @function
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Format price as Kenyan Shillings (KES)
 * @function
 * @param {number} price - Price to format
 * @returns {string} Formatted price string (e.g., "KES 1,000")
 */
exports.formatPrice = (price) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0
  }).format(price);
};

/**
 * Format date in Kenyan locale
 * @function
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string
 */
exports.formatDate = (date) => {
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

/**
 * Async handler wrapper to catch errors in Express route handlers
 * @function
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function that catches errors
 */
exports.asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Filter object to only include specified allowed fields
 * @function
 * @param {Object} obj - Object to filter
 * @param {...string} allowedFields - Names of fields to allow
 * @returns {Object} Filtered object with only allowed fields
 */
exports.filterObject = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(key => {
    if (allowedFields.includes(key)) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

module.exports = exports;
