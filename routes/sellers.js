/**
 * @fileoverview Seller routes for balance and withdrawal management
 * @description Routes for sellers to view balance and request withdrawals
 * @module routes/sellers
 */

const express = require('express');
const router = express.Router();
const {
  getSellerBalance,
  requestWithdrawal,
  getTransactionHistory
} = require('../controllers/seller');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/sellers/balance
 * @desc    Get seller's current balance and transaction history
 * @access  Private (Seller only)
 */
router.get('/balance', protect, authorize('seller'), getSellerBalance);

/**
 * @route   POST /api/sellers/withdraw
 * @desc    Request a withdrawal from seller's available balance
 * @access  Private (Seller only)
 */
router.post('/withdraw', protect, authorize('seller'), requestWithdrawal);

/**
 * @route   GET /api/sellers/transactions
 * @desc    Get seller's detailed transaction history
 * @access  Private (Seller only)
 */
router.get('/transactions', protect, authorize('seller'), getTransactionHistory);

module.exports = router;
