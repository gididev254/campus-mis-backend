const express = require('express');
const router = express.Router();
const {
  getWishlist,
  addProduct,
  removeProduct,
  checkProduct,
  clearWishlist
} = require('../controllers/wishlist');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getWishlist)
  .delete(clearWishlist);

router.route('/:productId')
  .post(addProduct)
  .delete(removeProduct);

router.route('/check/:productId')
  .get(checkProduct);

module.exports = router;
