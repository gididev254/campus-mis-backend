const express = require('express');
const { body } = require('express-validator');
const {
  sendMessage,
  getConversation,
  getConversations,
  getUnreadCount,
  markAsRead,
  deleteMessage
} = require('../controllers/message');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Validation rules
const sendMessageValidation = [
  body('receiver').notEmpty().withMessage('Receiver ID is required'),
  body('content').trim().notEmpty().withMessage('Message content is required'),
  handleValidationErrors
];

// All routes require authentication
router.post('/', protect, sendMessageValidation, sendMessage);
router.get('/conversations', protect, getConversations);
router.get('/conversation/:userId', protect, getConversation);
router.get('/unread-count', protect, getUnreadCount);
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteMessage);

module.exports = router;
