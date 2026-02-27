/**
 * @fileoverview Seller balance utility functions
 * @description Handles automatic seller balance updates on payment completion
 * @module utils/sellerBalance
 */

const logger = require('./logger');
const SellerBalance = require('../models/SellerBalance');
const Order = require('../models/Order');

/**
 * Update seller balance when order payment is completed
 * Automatically adds earnings to seller balance on successful payment
 * Prevents duplicate updates using sellerPaid flag
 *
 * @param {string} orderId - Order ID
 * @returns {Promise<{success: boolean, message: string, balance?: Object}>}
 */
async function updateSellerBalanceOnPayment(orderId) {
  try {
    // Get order details (no populate to avoid null reference issues with deleted documents)
    const order = await Order.findById(orderId);

    if (!order) {
      logger.error('Seller balance update: Order not found', { orderId });
      return {
        success: false,
        message: 'Order not found'
      };
    }

    // Validate required fields
    if (!order.seller) {
      logger.error('Seller balance update: Order has no seller', { orderId });
      return {
        success: false,
        message: 'Order has no seller reference'
      };
    }

    // Skip if already processed (prevents duplicate updates from callback retries)
    if (order.sellerPaid) {
      logger.info('Seller balance update: Already processed', {
        orderId,
        sellerId: order.seller?._id
      });
      return {
        success: true,
        message: 'Seller balance already updated',
        alreadyProcessed: true
      };
    }

    // Skip if payment not completed
    if (order.paymentStatus !== 'completed') {
      logger.warn('Seller balance update: Payment not completed', {
        orderId,
        paymentStatus: order.paymentStatus
      });
      return {
        success: false,
        message: 'Payment not completed'
      };
    }

    // Calculate seller earnings (full order price - can add platform fee later)
    const earnings = order.totalPrice;

    // Get or create seller balance record
    const balance = await SellerBalance.getOrCreate(order.seller._id);

    // Add earnings using model method (updates totalEarnings, currentBalance, totalOrders)
    await balance.addEarnings(earnings);

    // Create detailed ledger entry for the sale
    balance.ledger.push({
      type: 'sale',
      amount: earnings,
      orderId: order._id,
      productTitle: 'Product',  // We don't fetch product details to avoid populate issues
      buyerName: 'Buyer',      // We don't fetch buyer details to avoid populate issues
      date: new Date(),
      status: 'available', // Available for withdrawal
      description: `Sale: Order #${order.orderNumber || order._id}`,
      metadata: {
        productId: order.product,
        buyerId: order.buyer,
        mpesaTransactionId: order.mpesaTransactionId
      }
    });

    await balance.save();

    logger.success('Seller balance updated automatically', {
      sellerId: order.seller,
      orderId: order._id,
      orderNumber: order.orderNumber,
      earnings: earnings,
      newBalance: balance.currentBalance,
      totalEarnings: balance.totalEarnings
    });

    // Mark order as processed (balance updated, not withdrawn)
    // This flag prevents duplicate balance updates if callback is received multiple times
    order.sellerPaid = true; // Balance updated, not withdrawn
    order.sellerPaidAt = new Date();
    await order.save();

    return {
      success: true,
      message: 'Seller balance updated successfully',
      balance: {
        sellerId: balance.seller,
        currentBalance: balance.currentBalance,
        totalEarnings: balance.totalEarnings,
        totalOrders: balance.totalOrders
      }
    };

  } catch (error) {
    logger.error('Error updating seller balance', {
      error: error.message,
      stack: error.stack,
      orderId
    });

    return {
      success: false,
      message: 'Failed to update seller balance',
      error: error.message
    };
  }
}

/**
 * Batch update seller balances for multiple orders
 * Used when processing multi-order cart checkout
 *
 * @param {string[]} orderIds - Array of order IDs
 * @returns {Promise<{success: number, failed: number, results: Array}>}
 */
async function batchUpdateSellerBalances(orderIds) {
  const results = [];
  let successCount = 0;
  let failedCount = 0;

  for (const orderId of orderIds) {
    const result = await updateSellerBalanceOnPayment(orderId);
    results.push({ orderId, ...result });

    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }
  }

  logger.info('Batch seller balance update completed', {
    totalOrders: orderIds.length,
    success: successCount,
    failed: failedCount
  });

  return {
    success: successCount,
    failed: failedCount,
    results
  };
}

module.exports = {
  updateSellerBalanceOnPayment,
  batchUpdateSellerBalances
};
