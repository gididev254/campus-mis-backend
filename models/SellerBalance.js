/**
 * @fileoverview Seller Balance model schema for Campus Market
 * @description Tracks seller earnings, balances, and withdrawal history
 * @module models/SellerBalance
 */

const mongoose = require('mongoose');

/**
 * Seller Balance Schema
 * @typedef {Object} SellerBalance
 * @property {mongoose.Types.ObjectId} seller - Reference to User (seller) (required, unique)
 * @property {number} totalEarnings - Total earnings across all orders (default: 0, non-negative)
 * @property {number} totalOrders - Total number of completed orders (default: 0, non-negative)
 * @property {number} currentBalance - Current available balance for withdrawal (default: 0, non-negative)
 * @property {number} pendingWithdrawals - Amount pending withdrawal confirmation (default: 0, non-negative)
 * @property {number} withdrawnTotal - Total amount withdrawn to date (default: 0, non-negative)
 * @property {Date} lastUpdated - Timestamp of last balance update
 * @property {Date} createdAt - Timestamp of balance creation
 * @property {Date} updatedAt - Timestamp of last update
 */
const sellerBalanceSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalEarnings: {
    type: Number,
    default: 0,
    min: 0
  },
  totalOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  currentBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  pendingWithdrawals: {
    type: Number,
    default: 0,
    min: 0
  },
  withdrawnTotal: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Database indexes for performance optimization

/**
 * Unique index: One balance per seller
 * Ensures each seller has only one balance record
 */
sellerBalanceSchema.index({ seller: 1 }, { unique: true });

/**
 * Index: Current balance sorting
 * Used for ranking sellers by balance
 */
sellerBalanceSchema.index({ currentBalance: -1 });

/**
 * Pre-save middleware to update lastUpdated timestamp
 * @function
 * @memberof SellerBalance
 * @param {Function} next - Express next middleware function
 */
sellerBalanceSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

/**
 * Add earnings when an order is completed
 * @method
 * @memberof SellerBalance
 * @param {number} amount - Amount to add to earnings
 * @returns {Promise<SellerBalance>} Updated balance instance
 */
sellerBalanceSchema.methods.addEarnings = function(amount) {
  this.totalEarnings += amount;
  this.currentBalance += amount;
  this.totalOrders += 1;
  return this.save();
};

/**
 * Record a withdrawal request
 * @method
 * @memberof SellerBalance
 * @param {number} amount - Amount to withdraw
 * @returns {Promise<SellerBalance>} Updated balance instance
 * @throws {Error} If insufficient balance
 */
sellerBalanceSchema.methods.recordWithdrawal = function(amount) {
  if (this.currentBalance < amount) {
    throw new Error('Insufficient balance');
  }
  this.currentBalance -= amount;
  this.withdrawnTotal += amount;
  this.pendingWithdrawals += amount;
  return this.save();
};

/**
 * Confirm withdrawal when admin marks it as paid
 * @method
 * @memberof SellerBalance
 * @param {number} amount - Amount being confirmed
 * @returns {Promise<SellerBalance>} Updated balance instance
 */
sellerBalanceSchema.methods.confirmWithdrawal = function(amount) {
  this.pendingWithdrawals -= amount;
  return this.save();
};

/**
 * Static method to get or create balance for seller
 * @static
 * @method
 * @memberof SellerBalance
 * @param {string} sellerId - Seller user ID
 * @returns {Promise<SellerBalance>} Seller's balance (creates new if doesn't exist)
 */
sellerBalanceSchema.statics.getOrCreate = async function(sellerId) {
  let balance = await this.findOne({ seller: sellerId });
  if (!balance) {
    balance = await this.create({ seller: sellerId });
  }
  return balance;
};

module.exports = mongoose.model('SellerBalance', sellerBalanceSchema);
