const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { validateExists } = require('../utils/validation');

/**
 * @desc    Get user's wishlist with all products
 * @route   GET /api/wishlist
 * @access  Private
 * @returns {Promise<Object>} Response with success status and wishlist data including products array
 */
exports.getWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.getOrCreate(req.user.id);
    await wishlist.populate('products');

    res.json({
      success: true,
      data: wishlist
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add product to user's wishlist (no duplicates)
 * @route   POST /api/wishlist/:productId
 * @access  Private
 * @param   {string} req.params.productId - Product ID to add
 * @returns {Promise<Object>} Response with success status, message, and updated wishlist data
 */
exports.addProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    // Validate product exists
    await validateExists(Product, productId, 'Product not found');

    const wishlist = await Wishlist.getOrCreate(req.user.id);
    await wishlist.addProduct(productId);

    await wishlist.populate('products');

    res.json({
      success: true,
      message: 'Product added to wishlist',
      data: wishlist
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove product from user's wishlist
 * @route   DELETE /api/wishlist/:productId
 * @access  Private
 * @param   {string} req.params.productId - Product ID to remove
 * @returns {Promise<Object>} Response with success status, message, and updated wishlist data
 */
exports.removeProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.getOrCreate(req.user.id);
    await wishlist.removeProduct(productId);

    await wishlist.populate('products');

    res.json({
      success: true,
      message: 'Product removed from wishlist',
      data: wishlist
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check if a product is in user's wishlist
 * @route   GET /api/wishlist/check/:productId
 * @access  Private
 * @param   {string} req.params.productId - Product ID to check
 * @returns {Promise<Object>} Response with success status and isInWishlist boolean
 */
exports.checkProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.getOrCreate(req.user.id);
    const isInWishlist = wishlist.hasProduct(productId);

    res.json({
      success: true,
      data: { isInWishlist }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear all products from user's wishlist
 * @route   DELETE /api/wishlist
 * @access  Private
 * @returns {Promise<Object>} Response with success status, message, and empty wishlist data
 */
exports.clearWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.getOrCreate(req.user.id);
    wishlist.products = [];
    await wishlist.save();

    await wishlist.populate('products');

    res.json({
      success: true,
      message: 'Wishlist cleared',
      data: wishlist
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
