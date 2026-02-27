const express = require('express');
const {
  getRevenueAnalytics,
  getUserAnalytics,
  getOrderAnalytics,
  getProductAnalytics,
  getAllReviews,
  deleteReview,
  getAllMessages,
  flagMessage
} = require('../controllers/admin');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require admin role
router.use(protect);
router.use(authorize('admin'));

// Analytics routes
router.get('/analytics/revenue', getRevenueAnalytics);
router.get('/analytics/users', getUserAnalytics);
router.get('/analytics/orders', getOrderAnalytics);
router.get('/analytics/products', getProductAnalytics);

// Moderation routes
router.get('/reviews', getAllReviews);
router.delete('/reviews/:id', deleteReview);
router.get('/messages', getAllMessages);
router.post('/messages/:id/flag', flagMessage);

module.exports = router;
