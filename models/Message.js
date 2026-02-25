/**
 * @fileoverview Message model schema for Campus Market
 * @description Defines the structure and behavior of direct messages between users
 * @module models/Message
 */

const mongoose = require('mongoose');

/**
 * Message Schema
 * @typedef {Object} Message
 * @property {mongoose.Types.ObjectId} sender - Reference to User who sent the message (required)
 * @property {mongoose.Types.ObjectId} receiver - Reference to User who received the message (required)
 * @property {mongoose.Types.ObjectId|null} product - Reference to related Product (optional)
 * @property {string} content - Message text content (required, max 1000 chars)
 * @property {boolean} isRead - Read status (default: false)
 * @property {Date|null} readAt - Timestamp when message was read
 * @property {Date} createdAt - Timestamp of message creation
 * @property {Date} updatedAt - Timestamp of last update
 */
const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  content: {
    type: String,
    required: [true, 'Please provide message content'],
    maxlength: [1000, 'Message cannot be more than 1000 characters']
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
 * Compound index for conversation retrieval between two users with date sorting
 * Supports efficient queries for getting message history between two users
 */
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

/**
 * Compound index for reverse conversation lookup
 * Supports efficient queries when user is receiver
 */
messageSchema.index({ receiver: 1, sender: 1, createdAt: -1 });

/**
 * Index for unread message queries
 * Used to quickly fetch unread messages for a user
 */
messageSchema.index({ receiver: 1, isRead: 1 });

/**
 * Compound index for sender lookup with date sorting
 * Used in getConversations aggregation
 */
messageSchema.index({ sender: 1, createdAt: -1 });

/**
 * Compound index for receiver lookup with date sorting
 * Used in getConversations aggregation
 */
messageSchema.index({ receiver: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
