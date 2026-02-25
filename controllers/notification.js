const Notification = require('../models/Notification');
const ErrorResponse = require('../middleware/error').ErrorResponse;
const {
  createNotification,
  getNotificationUnreadCount,
  emitUnreadCount
} = require('../utils/notifications');

/**
 * @desc    Get current user's notifications with pagination
 * @route   GET /api/notifications
 * @access  Private
 * @param   {Object} req.query - Query parameters
 * @param   {number} [req.query.page=1] - Page number for pagination
 * @param   {number} [req.query.limit=20] - Number of notifications per page
 * @param   {boolean} [req.query.unreadOnly=false] - Filter to show only unread notifications
 * @returns {Promise<Object>} Response with success status, notifications array, pagination metadata, and unread count
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const query = { recipient: req.user.id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await getNotificationUnreadCount(req.user.id);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get count of unread notifications for current user
 * @route   GET /api/notifications/unread-count
 * @access  Private
 * @returns {Promise<Object>} Response with success status and unread count
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await getNotificationUnreadCount(req.user.id);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 * @param   {string} req.params.id - Notification ID
 * @returns {Promise<Object>} Response with success status, message, and notification data
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return next(new ErrorResponse('Notification not found', 404));
    }

    // Check ownership
    if (notification.recipient.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    await notification.markAsRead();

    // Get updated unread count and emit via Socket.io
    const unreadCount = await getNotificationUnreadCount(req.user.id);
    emitUnreadCount(req.user.id, unreadCount);

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all notifications as read for current user
 * @route   PUT /api/notifications/mark-all-read
 * @access  Private
 * @returns {Promise<Object>} Response with success status and message
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true, readAt: Date.now() }
    );

    // Emit updated unread count via Socket.io
    emitUnreadCount(req.user.id, 0);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 * @param   {string} req.params.id - Notification ID
 * @returns {Promise<Object>} Response with success status and message
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return next(new ErrorResponse('Notification not found', 404));
    }

    // Check ownership
    if (notification.recipient.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized', 403));
    }

    await notification.deleteOne();

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear all notifications for current user
 * @route   DELETE /api/notifications
 * @access  Private
 * @returns {Promise<Object>} Response with success status and message
 */
exports.clearAll = async (req, res, next) => {
  try {
    await Notification.deleteMany({ recipient: req.user.id });

    res.json({
      success: true,
      message: 'All notifications cleared'
    });
  } catch (error) {
    next(error);
  }
};

// Export helper functions for use in other controllers
module.exports = exports;
