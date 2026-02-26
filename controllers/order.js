const Order = require('../models/Order');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const { initiateSTKPush, validatePhoneNumber } = require('../utils/mpesa');
const { formatPaginationResponse, getPagination } = require('../utils/helpers');
const { validateProductForPurchase } = require('../utils/validation');
const ErrorResponse = require('../middleware/error').ErrorResponse;
const { createNotification } = require('../utils/notifications');
const { populateOrder, findAndPopulate, findManyAndPopulate, POPULATE_FIELDS } = require('../utils/populate');

/**
 * @desc    Checkout all items in user's cart (multi-seller support)
 * @route   POST /api/orders/checkout-cart
 * @access  Private
 * @param   {Object} req.body - Request body
 * @param   {Object} req.body.shippingAddress - Shipping address for the order
 * @param   {string} [req.body.notes] - Order notes
 * @param   {string} req.body.phoneNumber - M-Pesa phone number for payment
 * @param   {boolean} [req.body.testMode] - Enable test mode to bypass M-Pesa
 * @returns {Promise<Object>} Response with success status, checkout session ID, and created orders
 */
exports.checkoutCart = async (req, res, next) => {
  const session = await require('../models/Cart').startSession();
  session.startTransaction();

  try {
    const { shippingAddress, notes, phoneNumber } = req.body;
    const Cart = require('../models/Cart');
    const Product = require('../models/Product');
    const crypto = require('crypto');

    // 1. Get user's cart
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product')
      .session(session);

    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      return next(new ErrorResponse('Cart is empty', 400));
    }

    // 2. Group items by seller
    const itemsBySeller = {};
    let totalAmount = 0;
    const unavailableProducts = [];

    for (const item of cart.items) {
      const product = item.product;

      // Validate product
      if (!product || product.status !== 'available') {
        unavailableProducts.push(product?.title || 'Unknown');
        continue;
      }

      // Skip own products
      if (product.seller.toString() === req.user.id) {
        continue;
      }

      if (!itemsBySeller[product.seller]) {
        itemsBySeller[product.seller] = {
          seller: product.seller,
          items: [],
          subtotal: 0
        };
      }

      itemsBySeller[product.seller].items.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });

      itemsBySeller[product.seller].subtotal += product.price * item.quantity;
      totalAmount += product.price * item.quantity;
    }

    if (Object.keys(itemsBySeller).length === 0) {
      await session.abortTransaction();
      return next(new ErrorResponse('No valid items to checkout', 400));
    }

    // 3. Generate checkout session ID
    const checkoutSessionId = `SES-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // 4. Create orders for each seller
    const orders = [];
    const Order = require('../models/Order');

    for (const sellerId of Object.keys(itemsBySeller)) {
      const sellerGroup = itemsBySeller[sellerId];

      for (const item of sellerGroup.items) {
        const order = await Order.create([{
          buyer: req.user.id,
          seller: sellerId,
          product: item.product,
          quantity: item.quantity,
          totalPrice: item.price * item.quantity,
          shippingAddress,
          notes,
          paymentMethod: 'mpesa',
          status: 'pending',
          checkoutSessionId,
          paymentStatus: 'pending'
        }], { session });

        orders.push(order[0]);

        // Update product status
        await Product.findByIdAndUpdate(
          item.product,
          { status: 'pending' },
          { session }
        );
      }
    }

    // 5. Clear cart
    cart.items = [];
    await cart.save({ session });

    // 6. Initiate M-Pesa payment (or test mode)
    const isTestMode = process.env.NODE_ENV === 'development' && req.body.testMode;

    if (isTestMode) {
      // TEST MODE: Bypass M-Pesa, mark orders as paid immediately
      const testTransactionId = `TEST-${Date.now()}`;

      for (const order of orders) {
        order.paymentStatus = 'completed';
        order.status = 'confirmed';
        order.mpesaPhoneNumber = phoneNumber;
        order.mpesaTransactionId = testTransactionId;
        await order.save({ session });

        // Mark product as sold
        await Product.findByIdAndUpdate(
          order.product,
          { status: 'sold' },
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();

      return res.json({
        success: true,
        message: 'Order completed successfully (test mode)',
        testMode: true,
        checkoutSessionId,
        orders: orders.map(o => o._id)
      });
    }

    // PRODUCTION MODE: Initiate M-Pesa payment
    const validatedPhone = validatePhoneNumber(phoneNumber);
    const result = await initiateSTKPush(
      validatedPhone,
      totalAmount,
      checkoutSessionId,
      `${process.env.API_URL}/api/payment/mpesa/callback`
    );

    // 7. Update all orders with checkoutRequestID
    const checkoutRequestID = result.checkoutRequestID;
    for (const order of orders) {
      order.mpesaPhoneNumber = validatedPhone;
      order.checkoutRequestID = checkoutRequestID;
      await order.save({ session });
    }

    await session.commitTransaction();

    // 8. Return response with populated data using populate utility
    const populatedOrders = await findManyAndPopulate(
      Order,
      { checkoutSessionId },
      populateOrder,
      { sort: { createdAt: -1 } }
    );

    res.status(201).json({
      success: true,
      message: `Checkout successful! ${orders.length} order(s) created`,
      checkoutSessionId,
      totalAmount,
      orderCount: orders.length,
      orders: populatedOrders
    });

  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Create a new order for a single product
 * @route   POST /api/orders
 * @access  Private
 * @param   {Object} req.body - Request body
 * @param   {string} req.body.productId - ID of product to order
 * @param   {number} [req.body.quantity=1] - Quantity to order
 * @param   {Object} req.body.shippingAddress - Shipping address
 * @param   {string} [req.body.notes] - Order notes
 * @param   {string} [req.body.paymentMethod=mpesa] - Payment method
 * @returns {Promise<Object>} Response with success status and created order data
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { productId, quantity, shippingAddress, notes, paymentMethod } = req.body;

    // Validate product exists, is available, and buyer is not seller
    const product = await validateProductForPurchase(Product, productId, req.user.id);

    const totalPrice = product.price * (quantity || 1);

    // Create order
    const order = await Order.create({
      buyer: req.user.id,
      seller: product.seller,
      product: productId,
      quantity: quantity || 1,
      totalPrice,
      shippingAddress,
      notes,
      paymentMethod: paymentMethod || 'mpesa',
      status: 'pending'
    });

    // Update product status
    product.status = 'pending';
    await product.save();

    // Create notification for seller
    await createNotification({
      recipient: product.seller,
      sender: req.user.id,
      type: 'order',
      title: 'New Order!',
      message: `You have a new order for "${product.title}"`,
      data: {
        orderId: order._id,
        productId: product._id,
        link: `/orders/${order._id}`
      }
    });

    // Return populated order using populate utility
    const populatedOrder = await findAndPopulate(
      Order,
      order._id,
      (query) => populateOrder(query, POPULATE_FIELDS.PRODUCT_BASIC, 'name email phone', 'name email phone')
    );

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: populatedOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Initiate M-Pesa STK push payment for an order
 * @route   POST /api/orders/:id/pay
 * @access  Private (Buyer only)
 * @param   {string} req.params.id - Order ID
 * @param   {Object} req.body - Request body
 * @param   {string} req.body.phoneNumber - M-Pesa phone number for payment
 * @returns {Promise<Object>} Response with success status and checkout request ID
 */
exports.initiatePayment = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    // Find order and populate product in a single query
    const order = await Order.findById(req.params.id)
      .populate('product', 'title price seller');

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Check ownership
    if (order.buyer.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to pay for this order', 403));
    }

    // Check if already paid
    if (order.paymentStatus === 'completed') {
      return next(new ErrorResponse('Order already paid', 400));
    }

    // Validate phone number
    const validatedPhone = validatePhoneNumber(phoneNumber);

    // Initiate STK Push
    const result = await initiateSTKPush(
      validatedPhone,
      order.totalPrice,
      order.orderNumber,
      `${process.env.API_URL}/api/payment/mpesa/callback`
    );

    // Update order with M-Pesa details
    order.mpesaPhoneNumber = validatedPhone;
    await order.save();

    res.json({
      success: true,
      message: 'Payment initiated. Please check your phone for the STK push prompt',
      checkoutRequestID: result.checkoutRequestID
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single order by ID (buyer, seller, or admin)
 * @route   GET /api/orders/:id
 * @access  Private
 * @param   {string} req.params.id - Order ID
 * @returns {Promise<Object>} Response with success status and order data
 */
exports.getOrder = async (req, res, next) => {
  try {
    // Use populate utility for consistent population
    const order = await findAndPopulate(
      Order,
      req.params.id,
      (query) => populateOrder(
        query,
        POPULATE_FIELDS.PRODUCT_FULL,
        POPULATE_FIELDS.USER_BASIC,
        POPULATE_FIELDS.USER_BASIC
      )
    );

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Check if user is buyer, seller, or admin
    if (
      order.buyer._id.toString() !== req.user.id &&
      order.seller._id.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return next(new ErrorResponse('Not authorized to view this order', 403));
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's orders as buyer or seller
 * @route   GET /api/orders
 * @access  Private
 * @param   {Object} req.query - Query parameters
 * @param   {number} [req.query.page=1] - Page number for pagination
 * @param   {number} [req.query.limit=10] - Number of items per page
 * @param   {string} [req.query.status] - Filter by order status
 * @param   {string} [req.query.as] - View orders as 'buyer' or 'seller'
 * @returns {Promise<Object>} Paginated response with orders array and metadata
 */
exports.getOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, as } = req.query;
    const { skip, limit: limitNum, page: pageNum } = getPagination(page, limit);

    // Build query based on user role
    const query = {};

    // Admin: Get ALL orders (no filter)
    if (req.user.role === 'admin') {
      // No filters - return all orders
    }
    // Seller: Get their orders
    else if (as === 'seller' || req.user.role === 'seller') {
      query.seller = req.user.id;
    }
    // Buyer: Get their orders
    else {
      query.buyer = req.user.id;
    }

    // Add status filter if provided
    if (status) {
      query.status = status;
    }

    // Use populate utility for consistent, optimized population
    const orders = await findManyAndPopulate(
      Order,
      query,
      (query) => populateOrder(
        query,
        POPULATE_FIELDS.PRODUCT_BASIC,
        'name email phone',
        'name email phone'
      ),
      {
        sort: { createdAt: -1 },
        skip,
        limit: limitNum,
        lean: true
      }
    );

    const total = await Order.countDocuments(query);

    res.json(formatPaginationResponse(orders, total, pageNum, limitNum));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order status (seller or admin only)
 * @route   PUT /api/orders/:id/status
 * @access  Private (Seller or Admin)
 * @param   {string} req.params.id - Order ID
 * @param   {Object} req.body - Request body
 * @param   {string} req.body.status - New order status (confirmed, shipped, delivered, cancelled)
 * @param   {string} [req.body.reason] - Reason for status change (required for cancelled)
 * @returns {Promise<Object>} Response with success status and updated order data
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    // Find order and populate product in a single query to avoid N+1
    const order = await Order.findById(req.params.id)
      .populate('product', 'title seller status');

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Check if user is seller or admin
    if (order.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this order', 403));
    }

    // Validate status transition
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
      refunded: []
    };

    if (!validTransitions[order.status].includes(status)) {
      return next(new ErrorResponse(`Cannot change status from ${order.status} to ${status}`, 400));
    }

    order.status = status;

    if (status === 'delivered') {
      order.deliveredAt = Date.now();
    }

    if (status === 'cancelled') {
      order.cancelledAt = Date.now();
      order.cancellationReason = req.body.reason || 'seller-request';

      // Update product status back to available (product already populated)
      if (order.product) {
        order.product.status = 'available';
        await order.product.save();
      }
    }

    await order.save();

    // Create notification for buyer (product already loaded, no N+1 query)
    const statusMessages = {
      confirmed: `Your order for "${order.product?.title || 'Product'}" has been confirmed by the seller.`,
      shipped: `Your order for "${order.product?.title || 'Product'}" has been shipped!`,
      delivered: `Your order for "${order.product?.title || 'Product'}" has been delivered. Thank you for your purchase!`,
      cancelled: `Your order for "${order.product?.title || 'Product'}" has been cancelled.`,
      refunded: `Your order for "${order.product?.title || 'Product'}" has been refunded.`
    };

    if (statusMessages[status]) {
      await createNotification({
        recipient: order.buyer,
        sender: order.seller,
        type: 'order',
        title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: statusMessages[status],
        data: {
          orderId: order._id,
          productId: order.product,
          link: `/orders/${order._id}`
        }
      });
    }

    // Return populated order using populate utility
    const populatedOrder = await findAndPopulate(
      Order,
      order._id,
      (query) => populateOrder(query, POPULATE_FIELDS.PRODUCT_BASIC, 'name email', 'name email')
    );

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: populatedOrder
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel an order (buyer only)
 * @route   PUT /api/orders/:id/cancel
 * @access  Private (Buyer only)
 * @param   {string} req.params.id - Order ID
 * @param   {Object} req.body - Request body
 * @param   {string} [req.body.reason] - Reason for cancellation
 * @returns {Promise<Object>} Response with success status and cancelled order data
 */
exports.cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;

    // Find order and populate product in a single query to avoid N+1
    const order = await Order.findById(req.params.id)
      .populate('product', 'title status');

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Check if user is buyer
    if (order.buyer.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to cancel this order', 403));
    }

    // Can only cancel pending orders
    if (order.status !== 'pending') {
      return next(new ErrorResponse('Can only cancel pending orders', 400));
    }

    order.status = 'cancelled';
    order.cancelledAt = Date.now();
    order.cancellationReason = reason || 'buyer-request';

    // Update product status back to available (product already populated)
    if (order.product) {
      order.product.status = 'available';
      await order.product.save();
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Handle M-Pesa STK push callback (webhook)
 * @route   POST /api/payment/mpesa/callback
 * @access  Public
 * @param   {Object} req.body - M-Pesa callback body
 * @param   {Object} req.body.Body - Callback body
 * @param   {Object} req.body.Body.stkCallback - STK callback data
 * @returns {Promise<Object>} Response confirming callback processing
 */
exports.mpesaCallback = async (req, res, next) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();

  try {
    const { Body } = req.body;
    const { stkCallback } = Body;
    const { CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

    // Find ALL orders with this checkoutRequestID (supports multi-seller checkout)
    const orders = await Order.find({
      checkoutRequestID: CheckoutRequestID
    }).session(session);

    if (orders.length === 0) {
      return res.json({ success: false, message: 'Order not found' });
    }

    if (ResultCode === 0) {
      // Success - update ALL orders
      const { MpesaReceiptNumber, PhoneNumber } = stkCallback.CallbackMetadata.Item;

      // Collect all product IDs for bulk update
      const productIds = orders.map(order => order.product);

      // Update all orders in parallel for better performance
      await Promise.all(orders.map(async (order) => {
        order.paymentStatus = 'completed';
        order.mpesaTransactionId = MpesaReceiptNumber;
        order.status = 'confirmed';
        await order.save({ session });
      }));

      // Bulk update all products to sold status
      await Product.updateMany(
        { _id: { $in: productIds } },
        { status: 'sold' },
        { session }
      );
    } else {
      // Failed - update ALL orders
      // Collect all product IDs for bulk update
      const productIds = orders.map(order => order.product);

      // Update all orders in parallel for better performance
      await Promise.all(orders.map(async (order) => {
        order.paymentStatus = 'failed';
        order.status = 'cancelled';
        order.cancellationReason = 'payment-failed';
        await order.save({ session });
      }));

      // Bulk update all products back to available
      await Product.updateMany(
        { _id: { $in: productIds } },
        { status: 'available' },
        { session }
      );
    }

    await session.commitTransaction();
    res.json({ success: true });

  } catch (error) {
    await session.abortTransaction();
    console.error('M-Pesa callback error:', error);
    res.json({ success: false, message: 'Callback processing failed' });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get admin payout ledger of orders needing seller payout
 * @route   GET /api/admin/payouts/ledger
 * @access  Private (Admin only)
 * @param   {Object} req.query - Query parameters
 * @param   {number} [req.query.page=1] - Page number for pagination
 * @param   {number} [req.query.limit=20] - Number of items per page
 * @returns {Promise<Object>} Response with grouped seller orders and pending payout total
 */
exports.getPayoutLedger = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { skip, limit: limitNum } = getPagination(page, limit);

    const query = {
      paymentStatus: 'completed',
      sellerPaid: false
    };

    // Use populate utility for consistent population
    const orders = await findManyAndPopulate(
      Order,
      query,
      (query) => populateOrder(
        query,
        'title price condition images',
        'name email phone',
        'name email phone'
      ),
      {
        sort: { seller: 1, createdAt: -1 },
        skip,
        limit: limitNum
      }
    );

    const total = await Order.countDocuments(query);

    // Group by seller (orders already populated, no N+1 queries)
    const groupedBySeller = {};
    for (const order of orders) {
      const sellerId = order.seller._id.toString();
      if (!groupedBySeller[sellerId]) {
        groupedBySeller[sellerId] = {
          seller: order.seller,
          sellerId: sellerId,
          orders: [],
          totalAmount: 0,
          totalEarnings: 0,
          paidAmount: 0,
          pendingAmount: 0
        };
      }

      groupedBySeller[sellerId].orders.push(order);
      groupedBySeller[sellerId].totalAmount += order.totalPrice;
      groupedBySeller[sellerId].totalEarnings += order.totalPrice;
      groupedBySeller[sellerId].pendingAmount += order.totalPrice;
    }

    const sellerGroups = Object.values(groupedBySeller);

    // Use aggregation for total calculation (efficient)
    const pendingPayoutTotal = await Order.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    res.json({
      success: true,
      sellerGroups,
      totalOrders: orders.length,
      totalSellers: sellerGroups.length,
      pendingPayoutTotal: pendingPayoutTotal[0]?.total || 0
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark seller as paid for a specific order (admin only)
 * @route   PUT /api/admin/payouts/:orderId/pay
 * @access  Private (Admin only)
 * @param   {string} req.params.orderId - Order ID
 * @param   {Object} req.body - Request body
 * @param   {string} [req.body.notes] - Payout notes
 * @returns {Promise<Object>} Response with success status and updated order data
 */
exports.markSellerPaid = async (req, res, next) => {
  try {
    const { notes } = req.body;

    // Find order with seller populated in single query
    const order = await Order.findById(req.params.orderId)
      .populate('seller', 'name email')
      .populate('buyer', 'name email')
      .populate('product', POPULATE_FIELDS.PRODUCT_BASIC);

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Check if payment is completed
    if (order.paymentStatus !== 'completed') {
      return next(new ErrorResponse('Cannot mark unpaid order as seller paid', 400));
    }

    // Check if already paid
    if (order.sellerPaid) {
      return next(new ErrorResponse('Seller already paid for this order', 400));
    }

    // Update order
    order.sellerPaid = true;
    order.sellerPaidAt = Date.now();
    order.sellerPaidBy = req.user.id;
    order.sellerPayoutNotes = notes || '';

    await order.save();

    res.json({
      success: true,
      message: 'Seller marked as paid successfully',
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark seller as paid for all their pending payout orders (admin only)
 * @route   PUT /api/admin/payouts/seller/:sellerId/pay
 * @access  Private (Admin only)
 * @param   {string} req.params.sellerId - Seller's user ID
 * @param   {Object} req.body - Request body
 * @param   {string} [req.body.notes] - Payout notes
 * @returns {Promise<Object>} Response with success status and count of orders updated
 */
exports.markSellerPaidBatch = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const { sellerId } = req.params;

    const orders = await Order.find({
      seller: sellerId,
      paymentStatus: 'completed',
      sellerPaid: false
    });

    if (orders.length === 0) {
      return next(new ErrorResponse('No pending payouts for this seller', 400));
    }

    // Use bulk update operation for better performance
    await Order.updateMany(
      {
        seller: sellerId,
        paymentStatus: 'completed',
        sellerPaid: false
      },
      {
        sellerPaid: true,
        sellerPaidAt: Date.now(),
        sellerPaidBy: req.user.id,
        sellerPayoutNotes: notes || ''
      }
    );

    res.json({
      success: true,
      message: `Marked ${orders.length} orders as paid`,
      ordersUpdated: orders.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment status for an order
 * @route   GET /api/orders/:id/payment-status
 * @access  Private
 * @param   {string} req.params.id - Order ID
 * @returns {Promise<Object>} Response with success status and payment details
 */
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Check ownership
    if (order.buyer.toString() !== req.user.id && order.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to access this order', 403));
    }

    const response = {
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        checkoutRequestID: order.checkoutRequestID,
        merchantRequestID: order.merchantRequestID,
        mpesaResultCode: order.mpesaResultCode,
        mpesaResultDesc: order.mpesaResultDesc,
        mpesaReceiptNumber: order.mpesaReceiptNumber,
        mpesaPhoneNumber: order.mpesaPhoneNumber
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
