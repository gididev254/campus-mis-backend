/**
 * @fileoverview Notification model schema for Campus Market
 * @description Defines the structure and behavior of user notifications
 * @module models/Notification
 */

const mongoose = require('mongoose');

/**
 * Notification Schema
 * @typedef {Object} Notification
 * @property {mongoose.Types.ObjectId} recipient - Reference to User receiving notification (required)
 * @property {mongoose.Types.ObjectId|null} sender - Reference to User who triggered notification
 * @property {'order'|'message'|'product'|'review'|'payout'|'system'|'price_drop'|'product_available'} type - Notification type (required)
 * @property {string} title - Notification title (required, max 200 chars)
 * @property {string} message - Notification message (required, max 1000 chars)
 * @property {Object} data - Additional notification data
 * @property {mongoose.Types.ObjectId} [data.orderId] - Related order ID
 * @property {mongoose.Types.ObjectId} [data.productId] - Related product ID
 * @property {number} [data.amount] - Amount for payout notifications
 * @property {string} [data.link] - Deep link for notification action
 * @property {boolean} isRead - Read status (default: false)
 * @property {Date|null} readAt - Timestamp when notification was read
 * @property {Date} createdAt - Timestamp of notification creation
 * @property {Date} updatedAt - Timestamp of last update
 */
const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  type: {
    type: String,
    enum: [
      'order',
      'message',
      'product',
      'review',
      'payout',
      'system',
      'price_drop',
      'product_available'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  data: {
    // Additional data like orderId, productId, etc.
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    amount: Number,
    link: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Database indexes for performance optimization

/**
 * Compound index: Recipient's notifications with read status and date sorting
 * Used in notification list queries
 */
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

/**
 * Compound index: Recipient's notifications with date sorting
 * Used for fetching recent notifications
 */
notificationSchema.index({ recipient: 1, createdAt: -1 });

/**
 * Mark notification as read
 * @method
 * @memberof Notification
 * @returns {Promise<Notification>} Updated notification instance
 */
notificationSchema.methods.markAsRead = function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = Date.now();
    return this.save();
  }
  return this;
};

// Static method to create notifications for common scenarios
notificationSchema.statics.orderCreated = async function(buyerId, orderId, productName) {
  return this.create({
    recipient: buyerId,
    type: 'order',
    title: 'Order Created',
    message: `Your order for "${productName}" has been created successfully.`,
    data: { orderId }
  });
};

notificationSchema.statics.orderConfirmed = async function(buyerId, orderId, productName) {
  return this.create({
    recipient: buyerId,
    type: 'order',
    title: 'Order Confirmed',
    message: `Your order for "${productName}" has been confirmed by the seller.`,
    data: { orderId }
  });
};

notificationSchema.statics.orderShipped = async function(buyerId, orderId, productName) {
  return this.create({
    recipient: buyerId,
    type: 'order',
    title: 'Order Shipped',
    message: `Your order for "${productName}" has been shipped!`,
    data: { orderId }
  });
};

notificationSchema.statics.newMessage = async function(recipientId, senderId, productId) {
  return this.create({
    recipient: recipientId,
    sender: senderId,
    type: 'message',
    title: 'New Message',
    message: 'You have received a new message.',
    data: { productId }
  });
};

notificationSchema.statics.productLiked = async function(sellerId, productId, buyerName) {
  return this.create({
    recipient: sellerId,
    type: 'product',
    title: 'Product Liked',
    message: `${buyerName} liked your product.`,
    data: { productId }
  });
};

notificationSchema.statics.payoutProcessed = async function(sellerId, amount) {
  return this.create({
    recipient: sellerId,
    type: 'payout',
    title: 'Payout Processed',
    message: `Your payout of ${amount} KES has been processed.`,
    data: { amount }
  });
};

notificationSchema.statics.newReview = async function(recipientId, reviewerName, rating) {
  return this.create({
    recipient: recipientId,
    type: 'review',
    title: 'New Review',
    message: `${reviewerName} gave you a ${rating}-star rating.`,
  });
};

notificationSchema.statics.productAvailable = async function(wishlistUserId, productId, productName) {
  return this.create({
    recipient: wishlistUserId,
    type: 'product_available',
    title: 'Product Available!',
    message: `"${productName}" is now available!`,
    data: { productId }
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
