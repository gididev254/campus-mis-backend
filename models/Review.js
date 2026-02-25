/**
 * @fileoverview Review model schema for Campus Market
 * @description Defines the structure and behavior of product/user reviews
 * @module models/Review
 */

const mongoose = require('mongoose');

/**
 * Review Schema
 * @typedef {Object} Review
 * @property {mongoose.Types.ObjectId} reviewer - Reference to User who wrote the review (required)
 * @property {mongoose.Types.ObjectId} reviewedUser - Reference to User being reviewed (required)
 * @property {mongoose.Types.ObjectId|null} product - Reference to related Product
 * @property {mongoose.Types.ObjectId} order - Reference to Order that prompted the review (required)
 * @property {number} rating - Rating from 1-5 (required)
 * @property {string} comment - Review text (required, max 500 chars)
 * @property {Date} createdAt - Timestamp of review creation
 * @property {Date} updatedAt - Timestamp of last update
 */
const reviewSchema = new mongoose.Schema({
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Please provide a rating'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  comment: {
    type: String,
    required: [true, 'Please provide a comment'],
    maxlength: [500, 'Comment cannot be more than 500 characters']
  }
}, {
  timestamps: true
});

// Database indexes for performance optimization

/**
 * Unique index: One review per order
 * Prevents duplicate reviews for the same order
 */
reviewSchema.index({ order: 1 }, { unique: true });

/**
 * Compound index: Product reviews with rating sorting
 * Used in product pages
 */
reviewSchema.index({ product: 1, rating: -1, createdAt: -1 });

/**
 * Compound index: User reviews (reviews received by user)
 * Used in user profiles
 */
reviewSchema.index({ reviewedUser: 1, createdAt: -1 });

/**
 * Index: Reviews written by user
 * Used in user profile "my reviews" section
 */
reviewSchema.index({ reviewer: 1, createdAt: -1 });

/**
 * Post-save middleware to update user's average rating
 * Automatically recalculates and updates the reviewed user's average rating and total review count
 * @async
 * @function
 * @memberof Review
 */
reviewSchema.post('save', async function() {
  const User = mongoose.model('User');
  const reviews = await this.constructor.find({ reviewedUser: this.reviewedUser });

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  await User.findByIdAndUpdate(this.reviewedUser, {
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews: reviews.length
  });
});

module.exports = mongoose.model('Review', reviewSchema);
