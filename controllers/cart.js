const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { validateProductForPurchase, validateQuantity } = require('../utils/validation');

/**
 * @desc    Get user's cart with all items and total
 * @route   GET /api/cart
 * @access  Private
 * @returns {Promise<Object>} Response with success status and cart data including items, total, and count
 */
exports.getCart = async (req, res, next) => {
  try {
    const cart = await Cart.getOrCreate(req.user.id);

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add item to cart or update quantity if already exists
 * @route   POST /api/cart/items
 * @access  Private
 * @param   {Object} req.body - Request body
 * @param   {string} req.body.productId - Product ID to add
 * @param   {number} [req.body.quantity=1] - Quantity to add
 * @returns {Promise<Object>} Response with success status, message, and updated cart data
 */
exports.addItem = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Validate product exists, is available, and user is not seller
    const product = await validateProductForPurchase(Product, productId, req.user.id);

    const cart = await Cart.getOrCreate(req.user.id);
    await cart.addItem(productId, quantity);

    // Re-populate after saving
    await cart.populate('items.product');

    res.json({
      success: true,
      message: 'Item added to cart',
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove item from cart completely
 * @route   DELETE /api/cart/items/:productId
 * @access  Private
 * @param   {string} req.params.productId - Product ID to remove
 * @returns {Promise<Object>} Response with success status, message, and updated cart data
 */
exports.removeItem = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.getOrCreate(req.user.id);
    await cart.removeItem(productId);

    await cart.populate('items.product');

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update quantity of an item in cart
 * @route   PUT /api/cart/items/:productId
 * @access  Private
 * @param   {string} req.params.productId - Product ID to update
 * @param   {Object} req.body - Request body
 * @param   {number} req.body.quantity - New quantity (must be >= 1)
 * @returns {Promise<Object>} Response with success status, message, and updated cart data
 */
exports.updateItemQuantity = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    // Validate quantity
    const validatedQuantity = validateQuantity(quantity);

    const cart = await Cart.getOrCreate(req.user.id);
    await cart.updateItemQuantity(productId, validatedQuantity);

    await cart.populate('items.product');

    res.json({
      success: true,
      message: 'Cart updated',
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear all items from user's cart
 * @route   DELETE /api/cart
 * @access  Private
 * @returns {Promise<Object>} Response with success status, message, and empty cart data
 */
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.getOrCreate(req.user.id);
    await cart.clearCart();

    res.json({
      success: true,
      message: 'Cart cleared',
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
