/**
 * @fileoverview Wishlist model schema for Campus Market
 * @description Defines the structure and behavior of user wishlists
 * @module models/Wishlist
 */

const mongoose = require('mongoose');

/**
 * Wishlist Schema
 * @typedef {Object} Wishlist
 * @property {mongoose.Types.ObjectId} user - Reference to User who owns the wishlist (required, unique)
 * @property {mongoose.Types.ObjectId[]} products - Array of Product IDs in wishlist
 * @property {Date} createdAt - Timestamp of wishlist creation
 * @property {Date} updatedAt - Timestamp of last update
 */
const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }]
}, {
  timestamps: true
});

// Database indexes

/**
 * Unique index for one wishlist per user
 * Ensures each user has only one wishlist
 */
wishlistSchema.index({ user: 1 }, { unique: true });

/**
 * Index for product queries
 * Used to find which wishlists contain a specific product
 */
wishlistSchema.index({ products: 1 });

/**
 * Add product to wishlist (no duplicates)
 * @method
 * @memberof Wishlist
 * @param {string} productId - Product ID to add
 * @returns {Promise<Wishlist>} Updated wishlist instance
 */
wishlistSchema.methods.addProduct = function(productId) {
  if (!this.products.includes(productId)) {
    this.products.push(productId);
    return this.save();
  }
  return this;
};

/**
 * Remove product from wishlist
 * @method
 * @memberof Wishlist
 * @param {string} productId - Product ID to remove
 * @returns {Promise<Wishlist>} Updated wishlist instance
 */
wishlistSchema.methods.removeProduct = function(productId) {
  this.products = this.products.filter(id => id.toString() !== productId);
  return this.save();
};

/**
 * Check if product is in wishlist
 * @method
 * @memberof Wishlist
 * @param {string} productId - Product ID to check
 * @returns {boolean} True if product is in wishlist
 */
wishlistSchema.methods.hasProduct = function(productId) {
  return this.products.some(id => id.toString() === productId);
};

/**
 * Static method to get or create wishlist for user
 * @static
 * @method
 * @memberof Wishlist
 * @param {string} userId - User ID
 * @returns {Promise<Wishlist>} User's wishlist (creates new if doesn't exist)
 */
wishlistSchema.statics.getOrCreate = async function(userId) {
  let wishlist = await this.findOne({ user: userId });
  if (!wishlist) {
    wishlist = await this.create({ user: userId, products: [] });
  }
  return wishlist;
};

module.exports = mongoose.model('Wishlist', wishlistSchema);
