const Message = require('../models/Message');
const User = require('../models/User');
const { formatPaginationResponse, getPagination } = require('../utils/helpers');
const ErrorResponse = require('../middleware/error').ErrorResponse;
const { getMessageUnreadCount } = require('../utils/notifications');
const mongoose = require('mongoose');

/**
 * @desc    Send a message to another user
 * @route   POST /api/messages
 * @access  Private
 * @param   {Object} req.body - Request body
 * @param   {string} req.body.receiver - Recipient user ID
 * @param   {string} [req.body.product] - Related product ID
 * @param   {string} req.body.content - Message content
 * @returns {Promise<Object>} Response with success status and sent message data
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { receiver, product, content } = req.body;

    // Check if receiver exists and is not the sender
    if (receiver === req.user.id) {
      return next(new ErrorResponse('Cannot send message to yourself', 400));
    }

    const message = await Message.create({
      sender: req.user.id,
      receiver,
      product,
      content
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('receiver', 'name email avatar')
      .populate('sender', 'name email avatar')
      .populate('product', 'title images')
      .lean();

    // Emit real-time message via Socket.io
    if (global.io) {
      const roomName = [req.user.id, receiver].sort().join(':');
      global.io.to(`conversation:${roomName}`).emit('message:new', populatedMessage);
      global.io.to(`user:${receiver}`).emit('notification:message', {
        message: populatedMessage,
        unreadCount: await getMessageUnreadCount(receiver)
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: populatedMessage
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get conversation messages with a specific user
 * @route   GET /api/messages/conversation/:userId
 * @access  Private
 * @param   {string} req.params.userId - Other user's ID
 * @param   {Object} req.query - Query parameters
 * @param   {number} [req.query.page=1] - Page number for pagination
 * @param   {number} [req.query.limit=50] - Number of messages per page
 * @returns {Promise<Object>} Paginated response with messages array and metadata
 */
exports.getConversation = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { skip, limit: limitNum, page: pageNum } = getPagination(page, limit);

    // Use aggregation to get messages, count, and update read status efficiently
    const aggregationPipeline = [
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(req.user.id), receiver: new mongoose.Types.ObjectId(req.params.userId) },
            { sender: new mongoose.Types.ObjectId(req.params.userId), receiver: new mongoose.Types.ObjectId(req.user.id) }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'sender',
          foreignField: '_id',
          as: 'sender'
        }
      },
      { $unwind: '$sender' },
      {
        $lookup: {
          from: 'users',
          localField: 'receiver',
          foreignField: '_id',
          as: 'receiver'
        }
      },
      { $unwind: '$receiver' },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $project: {
          sender: {
            _id: '$sender._id',
            name: '$sender.name',
            avatar: '$sender.avatar'
          },
          receiver: {
            _id: '$receiver._id',
            name: '$receiver.name',
            avatar: '$receiver.avatar'
          },
          product: {
            $arrayElemAt: ['$product', 0]
          },
          content: 1,
          isRead: 1,
          readAt: 1,
          createdAt: 1,
          updatedAt: 1
        }
      },
      {
        $project: {
          sender: 1,
          receiver: 1,
          product: {
            $cond: {
              if: { $ne: ['$product', null] },
              then: {
                _id: '$product._id',
                title: '$product.title',
                images: '$product.images'
              },
              else: null
            }
          },
          content: 1,
          isRead: 1,
          readAt: 1,
          createdAt: 1,
          updatedAt: 1
        }
      },
      { $sort: { createdAt: -1 } },
      { $facet: {
        data: [{ $skip: skip }, { $limit: limitNum }],
        totalCount: [{ $count: 'count' }]
      }}
    ];

    const [result] = await Message.aggregate(aggregationPipeline);
    const messages = result.data.reverse();
    const total = result.totalCount[0]?.count || 0;

    // Mark messages as read (async operation, don't await)
    Message.updateMany(
      {
        sender: req.params.userId,
        receiver: req.user.id,
        isRead: false
      },
      {
        isRead: true,
        readAt: Date.now()
      }
    ).catch(err => console.error('Error marking messages as read:', err));

    res.json(formatPaginationResponse(messages, total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all user's conversations (unique conversation partners)
 * @route   GET /api/messages/conversations
 * @access  Private
 * @returns {Promise<Object>} Response with success status and conversations array
 */
exports.getConversations = async (req, res, next) => {
  try {
    // Use aggregation to get all conversations in a single query
    const aggregationPipeline = [
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(req.user.id) },
            { receiver: new mongoose.Types.ObjectId(req.user.id) }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'sender',
          foreignField: '_id',
          as: 'sender'
        }
      },
      { $unwind: '$sender' },
      {
        $lookup: {
          from: 'users',
          localField: 'receiver',
          foreignField: '_id',
          as: 'receiver'
        }
      },
      { $unwind: '$receiver' },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $addFields: {
          conversationPartner: {
            $cond: {
              if: { $eq: ['$sender._id', new mongoose.Types.ObjectId(req.user.id)] },
              then: '$receiver',
              else: '$sender'
            }
          },
          product: {
            $arrayElemAt: ['$product', 0]
          }
        }
      },
      {
        $project: {
          conversationPartner: 1,
          content: 1,
          isRead: 1,
          createdAt: 1,
          product: {
            $cond: {
              if: { $ne: ['$product', null] },
              then: {
                _id: '$product._id',
                title: '$product.title',
                images: '$product.images'
              },
              else: null
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationPartner._id',
          user: { $first: '$conversationPartner' },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver._id', new mongoose.Types.ObjectId(req.user.id)] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          user: {
            id: '$user._id',
            name: '$user.name',
            avatar: '$user.avatar',
            email: '$user.email',
            averageRating: '$user.averageRating'
          },
          lastMessage: {
            sender: '$lastMessage.sender',
            receiver: '$lastMessage.receiver',
            product: '$lastMessage.product',
            content: '$lastMessage.content',
            isRead: '$lastMessage.isRead',
            createdAt: '$lastMessage.createdAt'
          },
          unreadCount: 1
        }
      }
    ];

    const conversations = await Message.aggregate(aggregationPipeline);

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get count of unread messages for current user
 * @route   GET /api/messages/unread-count
 * @access  Private
 * @returns {Promise<Object>} Response with success status and unread count
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await getMessageUnreadCount(req.user.id);

    res.json({
      success: true,
      count
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a message as read
 * @route   PUT /api/messages/:id/read
 * @access  Private
 * @param   {string} req.params.id - Message ID
 * @returns {Promise<Object>} Response with success status and message
 */
exports.markAsRead = async (req, res, next) => {
  try {
    // Optimized: Use findOneAndUpdate with populate to avoid separate save operation
    const message = await Message.findOneAndUpdate(
      {
        _id: req.params.id,
        receiver: req.user.id // Authorization in query
      },
      {
        isRead: true,
        readAt: Date.now()
      },
      {
        new: true,
        runValidators: true
      }
    )
    .populate('receiver', 'name email avatar')
    .populate('sender', 'name email avatar')
    .lean();

    if (!message) {
      return next(new ErrorResponse('Message not found or not authorized', 404));
    }

    // Emit read receipt via Socket.io
    if (global.io) {
      global.io.to(`user:${message.sender._id}`).emit('message:read', {
        messageId: message._id,
        readAt: message.readAt
      });
    }

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a message (sender or receiver only)
 * @route   DELETE /api/messages/:id
 * @access  Private (sender or receiver only)
 * @param   {string} req.params.id - Message ID
 * @returns {Promise<Object>} Response with success status and message
 */
exports.deleteMessage = async (req, res, next) => {
  try {
    // Optimized: Use findOneAndDelete with authorization in query to avoid separate exists check
    const message = await Message.findOneAndDelete(
      {
        _id: req.params.id,
        $or: [
          { sender: req.user.id },
          { receiver: req.user.id }
        ]
      }
    ).lean();

    if (!message) {
      return next(new ErrorResponse('Message not found or not authorized', 404));
    }

    // Emit deletion via Socket.io
    if (global.io) {
      global.io.to(`user:${message.sender}`).to(`user:${message.receiver}`).emit('message:deleted', {
        messageId: message._id
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
