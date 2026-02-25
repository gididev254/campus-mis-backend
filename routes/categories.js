const express = require('express');
const { body } = require('express-validator');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/category');
const { protect, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Validation rules
const createCategoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  handleValidationErrors
];

// Public routes
router.get('/', getCategories);
router.get('/:id', getCategory);

// Admin routes
router.post('/', protect, authorize('admin'), createCategoryValidation, createCategory);
router.put('/:id', protect, authorize('admin'), updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;
