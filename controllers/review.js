const Review = require('../models/Review');
const Order = require('../models/Order');
const ErrorResponse = require('../middleware/error').ErrorResponse;
const { formatPaginationResponse, getPagination } = require('../utils/helpers');

/**
 * @desc    Create a review for a seller from a completed order
 * @route   POST /api/reviews
 * @access  Private (Buyer only, delivered orders)
 * @param   {Object} req.body - Request body
 * @param   {string} req.body.reviewedUser - User ID being reviewed (seller)
 * @param   {string} req.body.product - Product ID
 * @param   {string} req.body.order - Order ID
 * @param   {number} req.body.rating - Rating from 1-5
 * @param   {string} [req.body.comment] - Review comment
 * @returns {Promise<Object>} Response with success status and created review data
 * @throws  {403} If user is not the buyer
 * @throws  {400} If order is not delivered or review already exists
 */
exports.createReview = async (req, res, next) => {
  try {
    const { reviewedUser, product, order, rating, comment } = req.body;

    // Check if order exists and belongs to user
    const orderData = await Order.findById(order);
    if (!orderData) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Only buyer can review seller
    if (orderData.buyer.toString() !== req.user.id) {
      return next(new ErrorResponse('You can only review sellers from your orders', 403));
    }

    // Check if order is delivered
    if (orderData.status !== 'delivered') {
      return next(new ErrorResponse('You can only review delivered orders', 400));
    }

    // Check if review already exists for this order
    const existingReview = await Review.findOne({ order });
    if (existingReview) {
      return next(new ErrorResponse('Review already exists for this order', 400));
    }

    const review = await Review.create({
      reviewer: req.user.id,
      reviewedUser,
      product,
      order,
      rating,
      comment
    });

    const populatedReview = await Review.findById(review._id)
      .populate('reviewedUser', 'name avatar averageRating')
      .populate('reviewer', 'name avatar')
      .populate('product', 'title images');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      review: populatedReview
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all reviews for a specific user (seller)
 * @route   GET /api/reviews/user/:userId
 * @access  Public
 * @param   {string} req.params.userId - User ID to get reviews for
 * @param   {Object} req.query - Query parameters
 * @param   {number} [req.query.page=1] - Page number for pagination
 * @param   {number} [req.query.limit=10] - Number of reviews per page
 * @returns {Promise<Object>} Paginated response with reviews array and metadata
 */
exports.getUserReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { skip, limit: limitNum, page: pageNum } = getPagination(page, limit);

    const reviews = await Review.find({ reviewedUser: req.params.userId })
      .populate('reviewer', 'name avatar')
      .populate('product', 'title images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Review.countDocuments({ reviewedUser: req.params.userId });

    res.json(formatPaginationResponse(reviews, total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all reviews written by current user
 * @route   GET /api/reviews/my-reviews
 * @access  Private
 * @param   {Object} req.query - Query parameters
 * @param   {number} [req.query.page=1] - Page number for pagination
 * @param   {number} [req.query.limit=10] - Number of reviews per page
 * @returns {Promise<Object>} Paginated response with reviews array and metadata
 */
exports.getMyReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { skip, limit: limitNum, page: pageNum } = getPagination(page, limit);

    const reviews = await Review.find({ reviewer: req.user.id })
      .populate('reviewedUser', 'name avatar averageRating')
      .populate('product', 'title images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Review.countDocuments({ reviewer: req.user.id });

    res.json(formatPaginationResponse(reviews, total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single review by ID
 * @route   GET /api/reviews/:id
 * @access  Public
 * @param   {string} req.params.id - Review ID
 * @returns {Promise<Object>} Response with success status and review data
 * @throws  {404} If review not found
 */
exports.getReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('reviewer', 'name avatar')
      .populate('reviewedUser', 'name avatar averageRating')
      .populate('product', 'title images')
      .populate('order', 'orderNumber totalPrice');

    if (!review) {
      return next(new ErrorResponse('Review not found', 404));
    }

    res.json({
      success: true,
      review
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a review (review owner only)
 * @route   PUT /api/reviews/:id
 * @access  Private (Review owner only)
 * @param   {string} req.params.id - Review ID
 * @param   {Object} req.body - Request body
 * @param   {number} [req.body.rating] - New rating from 1-5
 * @param   {string} [req.body.comment] - New review comment
 * @returns {Promise<Object>} Response with success status and updated review data
 * @throws  {403} If user is not the review owner
 */
exports.updateReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    let review = await Review.findById(req.params.id);

    if (!review) {
      return next(new ErrorResponse('Review not found', 404));
    }

    // Check ownership
    if (review.reviewer.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to update this review', 403));
    }

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    await review.save();

    review = await Review.findById(review._id)
      .populate('reviewedUser', 'name avatar averageRating')
      .populate('reviewer', 'name avatar')
      .populate('product', 'title images');

    res.json({
      success: true,
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a review (review owner or admin only)
 * @route   DELETE /api/reviews/:id
 * @access  Private (Review owner or Admin only)
 * @param   {string} req.params.id - Review ID
 * @returns {Promise<Object>} Response with success status and message
 * @throws  {403} If user is not review owner or admin
 */
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return next(new ErrorResponse('Review not found', 404));
    }

    // Check ownership or admin
    if (review.reviewer.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this review', 403));
    }

    await review.deleteOne();

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
