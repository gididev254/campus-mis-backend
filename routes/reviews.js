const express = require('express');
const { body } = require('express-validator');
const {
  createReview,
  getUserReviews,
  getMyReviews,
  getReview,
  updateReview,
  deleteReview
} = require('../controllers/review');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Validation rules
const createReviewValidation = [
  body('reviewedUser').notEmpty().withMessage('User to review is required'),
  body('order').notEmpty().withMessage('Order ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').trim().notEmpty().withMessage('Comment is required'),
  handleValidationErrors
];

// Public routes
router.get('/user/:userId', getUserReviews);
router.get('/:id', getReview);

// Protected routes
router.post('/', protect, createReviewValidation, createReview);
router.get('/my-reviews', protect, getMyReviews);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
