const express = require('express');
const router = express.Router();
const {
  getCart,
  addItem,
  removeItem,
  updateItemQuantity,
  clearCart
} = require('../controllers/cart');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getCart)
  .delete(clearCart);

router.route('/items')
  .post(addItem);

router.route('/items/:productId')
  .put(updateItemQuantity)
  .delete(removeItem);

module.exports = router;
