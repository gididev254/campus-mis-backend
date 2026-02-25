/**
 * @fileoverview M-Pesa payment integration utilities
 * @description Handles STK push payment initiation, token generation, and phone validation for Safaricom M-Pesa
 * @module utils/mpesa
 */

const axios = require('axios');
const crypto = require('crypto');
const mpesaConfig = require('../config/mpesa');
const logger = require('./logger');

/**
 * Generate M-Pesa OAuth access token
 * @async
 * @function
 * @returns {Promise<string>} OAuth access token
 * @throws {Error} If token generation fails
 */
exports.generateToken = async () => {
  try {
    const auth = Buffer.from(`${mpesaConfig.consumerKey}:${mpesaConfig.consumerSecret}`).toString('base64');

    const response = await axios.get(
      `${mpesaConfig.baseURL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    logger.debug('M-Pesa token generated successfully');

    return response.data.access_token;
  } catch (error) {
    logger.error('M-Pesa token generation error', {
      error: error.response?.data || error.message
    }, error);
    throw new Error('Failed to generate M-Pesa token');
  }
};

/**
 * Initiate M-Pesa STK Push payment
 * Prompts user to enter M-Pesa PIN on their phone
 * @async
 * @function
 * @param {string} phoneNumber - Phone number to send STK push to (format: 254XXXXXXXXX or 07XXXXXXXX)
 * @param {number} amount - Amount to charge in KES
 * @param {string} orderNumber - Order identifier for reference
 * @param {string} callbackUrl - URL to receive payment callback
 * @returns {Promise<Object>} Response object with checkoutRequestID and merchantRequestID
 * @throws {Error} If STK push initiation fails
 */
exports.initiateSTKPush = async (phoneNumber, amount, orderNumber, callbackUrl) => {
  try {
    const token = await this.generateToken();
    const date = new Date();
    const timestamp = date.getFullYear() +
      ('0' + (date.getMonth() + 1)).slice(-2) +
      ('0' + date.getDate()).slice(-2) +
      ('0' + date.getHours()).slice(-2) +
      ('0' + date.getMinutes()).slice(-2) +
      ('0' + date.getSeconds()).slice(-2);

    const password = Buffer.from(
      mpesaConfig.shortcode + mpesaConfig.passkey + timestamp
    ).toString('base64');

    const payload = {
      BusinessShortCode: mpesaConfig.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline', // Use CustomerPayBillOnline for paybill numbers
      Amount: Math.round(amount),
      PartyA: phoneNumber.replace(/\D/g, ''), // Remove non-digits
      PartyB: mpesaConfig.shortcode,
      PhoneNumber: phoneNumber.replace(/\D/g, ''),
      CallBackURL: callbackUrl || `${process.env.API_URL}/api/v1/orders/payment/mpesa/callback`,
      AccountReference: orderNumber,
      TransactionDesc: `Payment for order ${orderNumber}`
    };

    const response = await axios.post(
      `${mpesaConfig.baseURL}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    logger.payment('stk_push_initiated', {
      orderId: orderNumber,
      amount: Math.round(amount),
      phone: phoneNumber,
      checkoutRequestID: response.data.CheckoutRequestID,
      responseCode: response.data.ResponseCode,
      success: true
    });

    return {
      success: true,
      merchantRequestID: response.data.MerchantRequestID,
      checkoutRequestID: response.data.CheckoutRequestID,
      responseCode: response.data.ResponseCode,
      responseDescription: response.data.ResponseMessage,
      customerMessage: response.data.CustomerMessage
    };
  } catch (error) {
    logger.payment('stk_push_failed', {
      orderId: orderNumber,
      amount: Math.round(amount),
      phone: phoneNumber,
      error: error.response?.data || error.message,
      success: false
    });
    throw new Error(error.response?.data?.errorMessage || 'Failed to initiate M-Pesa payment');
  }
};

/**
 * Query the status of an STK Push transaction
 * @async
 * @function
 * @param {string} checkoutRequestID - Checkout request ID from initiateSTKPush
 * @returns {Promise<Object>} Status response with resultCode and resultDesc
 * @throws {Error} If query fails
 */
exports.querySTKStatus = async (checkoutRequestID) => {
  try {
    const token = await this.generateToken();
    const date = new Date();
    const timestamp = date.getFullYear() +
      ('0' + (date.getMonth() + 1)).slice(-2) +
      ('0' + date.getDate()).slice(-2) +
      ('0' + date.getHours()).slice(-2) +
      ('0' + date.getMinutes()).slice(-2) +
      ('0' + date.getSeconds()).slice(-2);

    const password = Buffer.from(
      mpesaConfig.shortcode + mpesaConfig.passkey + timestamp
    ).toString('base64');

    const payload = {
      BusinessShortCode: mpesaConfig.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestID
    };

    const response = await axios.post(
      `${mpesaConfig.baseURL}/mpesa/stkpushquery/v1/query`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      resultCode: response.data.ResultCode,
      resultDesc: response.data.ResultDesc
    };
  } catch (error) {
    console.error('M-Pesa query error:', error.response?.data || error.message);
    throw new Error('Failed to query M-Pesa transaction status');
  }
};

/**
 * Validate and normalize phone number for M-Pesa
 * Converts format 07XXXXXXXX to 2547XXXXXXXX
 * @function
 * @param {string} phone - Phone number to validate
 * @returns {string} Normalized phone number in format 254XXXXXXXXX
 * @throws {Error} If phone number format is invalid
 */
exports.validatePhoneNumber = (phone) => {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // Add country code if missing (254 for Kenya)
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }

  // Validate format
  if (!/^254\d{9}$/.test(cleaned)) {
    throw new Error('Invalid phone number format. Use format: 254XXXXXXXXX or 07XXXXXXXX');
  }

  return cleaned;
};

module.exports = exports;
