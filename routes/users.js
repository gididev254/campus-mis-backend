const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getDashboardStats,
  resetUserPassword,
  changePassword
} = require('../controllers/user');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/:id', getUser);

// Protected routes
router.get('/dashboard/stats', protect, getDashboardStats);
router.put('/change-password', protect, changePassword);

// Admin routes
router.get('/', protect, authorize('admin'), getUsers);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);
router.post('/:id/reset-password', protect, authorize('admin'), resetUserPassword);

module.exports = router;
