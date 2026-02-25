const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll
} = require('../controllers/notification');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getNotifications)
  .delete(clearAll);

router.route('/unread-count')
  .get(getUnreadCount);

router.route('/mark-all-read')
  .put(markAllAsRead);

router.route('/:id')
  .delete(deleteNotification);

router.route('/:id/read')
  .put(markAsRead);

module.exports = router;
