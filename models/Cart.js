/**
 * @fileoverview Cart model schema for Campus Market
 * @description Defines the structure and behavior of user shopping carts
 * @module models/Cart
 */

const mongoose = require('mongoose');

/**
 * Cart Item Schema (embedded in Cart)
 * @typedef {Object} CartItem
 * @property {mongoose.Types.ObjectId} product - Reference to Product (required)
 * @property {number} quantity - Quantity of product (required, default: 1, min: 1)
 * @property {Date} addedAt - Timestamp when item was added to cart
 */
const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Cart Schema
 * @typedef {Object} Cart
 * @property {mongoose.Types.ObjectId} user - Reference to User who owns the cart (required, unique)
 * @property {CartItem[]} items - Array of cart items
 * @property {number} totalAmount - Total amount of all items in cart (default: 0, non-negative)
 * @property {Date} createdAt - Timestamp of cart creation
 * @property {Date} updatedAt - Timestamp of last update
 */
const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [cartItemSchema],
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Database indexes

/**
 * Unique index for one cart per user
 * Ensures each user has only one cart
 */
cartSchema.index({ user: 1 }, { unique: true });

/**
 * Pre-save middleware to calculate total amount
 * @async
 * @function
 * @memberof Cart
 * @param {Function} next - Express next middleware function
 */
cartSchema.pre('save', async function(next) {
  // Populate products to get prices
  await this.populate('items.product', 'price');

  let total = 0;
  for (const item of this.items) {
    if (item.product && item.product.price) {
      total += item.product.price * item.quantity;
    }
  }
  this.totalAmount = total;
  next();
});

/**
 * Add item to cart or update quantity if already exists
 * @method
 * @memberof Cart
 * @param {string} productId - Product ID to add
 * @param {number} [quantity=1] - Quantity to add
 * @returns {Promise<Cart>} Updated cart instance
 */
cartSchema.methods.addItem = function(productId, quantity = 1) {
  const existingItem = this.items.find(item => item.product.toString() === productId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.items.push({ product: productId, quantity });
  }

  return this.save();
};

/**
 * Remove item from cart completely
 * @method
 * @memberof Cart
 * @param {string} productId - Product ID to remove
 * @returns {Promise<Cart>} Updated cart instance
 */
cartSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(item => {
    // Handle both populated (object) and non-populated (string/ObjectId) product references
    const itemProductId = item.product && typeof item.product === 'object'
      ? item.product._id.toString()
      : item.product.toString();
    return itemProductId !== productId;
  });
  return this.save();
};

/**
 * Update quantity of an item in cart
 * @method
 * @memberof Cart
 * @param {string} productId - Product ID to update
 * @param {number} quantity - New quantity (will remove item if <= 0)
 * @returns {Promise<Cart>} Updated cart instance
 * @throws {Error} If item not found in cart
 */
cartSchema.methods.updateItemQuantity = function(productId, quantity) {
  const item = this.items.find(item => {
    // Handle both populated (object) and non-populated (string/ObjectId) product references
    const itemProductId = item.product && typeof item.product === 'object'
      ? item.product._id.toString()
      : item.product.toString();
    return itemProductId === productId;
  });

  if (item) {
    if (quantity <= 0) {
      return this.removeItem(productId);
    }
    item.quantity = quantity;
    return this.save();
  }

  throw new Error('Item not found in cart');
};

/**
 * Clear all items from cart
 * @method
 * @memberof Cart
 * @returns {Promise<Cart>} Updated cart instance
 */
cartSchema.methods.clearCart = function() {
  this.items = [];
  return this.save();
};

/**
 * Static method to get or create cart for user
 * @static
 * @method
 * @memberof Cart
 * @param {string} userId - User ID
 * @returns {Promise<Cart>} User's cart (creates new if doesn't exist)
 */
cartSchema.statics.getOrCreate = async function(userId) {
  let cart = await this.findOne({ user: userId }).populate('items.product');
  if (!cart) {
    cart = await this.create({ user: userId, items: [] });
    await cart.populate('items.product');
  }
  return cart;
};

module.exports = mongoose.model('Cart', cartSchema);
