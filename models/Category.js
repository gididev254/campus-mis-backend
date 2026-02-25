/**
 * @fileoverview Category model schema for Campus Market
 * @description Defines the structure and behavior of product categories with support for hierarchical structure
 * @module models/Category
 */

const mongoose = require('mongoose');

/**
 * Category Schema
 * @typedef {Object} Category
 * @property {string} name - Category name (required, unique, max 50 chars)
 * @property {string} slug - URL-friendly slug (unique, auto-generated from name)
 * @property {string} description - Category description (max 200 chars)
 * @property {string|null} icon - Icon identifier
 * @property {string|null} image - Image URL
 * @property {boolean} isActive - Active status for filtering (default: true)
 * @property {mongoose.Types.ObjectId|null} parentCategory - Parent category ID for subcategories
 * @property {Date} createdAt - Timestamp of category creation
 * @property {Date} updatedAt - Timestamp of last update
 */
const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a category name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Category name cannot be more than 50 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  icon: {
    type: String,
    default: null
  },
  image: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  }
}, {
  timestamps: true
});

/**
 * Pre-save middleware to generate slug from category name
 * @function
 * @memberof Category
 * @param {Function} next - Express next middleware function
 */
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  }
  next();
});

// Database indexes for performance optimization

// Note: Unique indexes for name and slug are already defined in schema above

/**
 * Compound index: Active categories with date sorting
 * Used for listing active categories
 */
categorySchema.index({ isActive: 1, createdAt: -1 });

/**
 * Compound index: Parent category queries with active status
 * Used for fetching subcategories
 */
categorySchema.index({ parentCategory: 1, isActive: 1 });

module.exports = mongoose.model('Category', categorySchema);
