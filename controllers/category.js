const Category = require('../models/Category');
const Product = require('../models/Product');
const { validateExists } = require('../utils/validation');
const ErrorResponse = require('../middleware/error').ErrorResponse;

/**
 * @desc    Get all active categories with product counts
 * @route   GET /api/categories
 * @access  Public
 * @returns {Promise<Object>} Response with success status and categories array with product counts
 */
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('parentCategory', 'name slug')
      .sort({ name: 1 });

    // Add product count to each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({
          category: category._id,
          status: 'available'
        });

        return {
          ...category.toObject(),
          productCount
        };
      })
    );

    res.json({
      success: true,
      categories: categoriesWithCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single category with products
 * @route   GET /api/categories/:id
 * @access  Public
 * @param   {string} req.params.id - Category ID
 * @param   {Object} req.query - Query parameters
 * @param   {number} [req.query.page=1] - Page number for pagination
 * @param   {number} [req.query.limit=12] - Number of products per page
 * @returns {Promise<Object>} Response with success status, category data, products array, and pagination metadata
 */
exports.getCategory = async (req, res, next) => {
  try {
    const category = await validateExists(Category, req.params.id, 'Category not found');
    await category.populate('parentCategory', 'name slug');

    // Get products in this category
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find({
      category: category._id,
      status: 'available'
    })
      .populate('seller', 'name location averageRating')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments({
      category: category._id,
      status: 'available'
    });

    res.json({
      success: true,
      category: {
        ...category.toObject(),
        productCount: total
      },
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new category (admin only)
 * @route   POST /api/categories
 * @access  Private (Admin only)
 * @param   {Object} req.body - Request body
 * @param   {string} req.body.name - Category name
 * @param   {string} [req.body.description] - Category description
 * @param   {string} [req.body.icon] - Icon name or identifier
 * @param   {string} [req.body.image] - Image URL
 * @param   {string} [req.body.parentCategory] - Parent category ID for subcategories
 * @returns {Promise<Object>} Response with success status and created category data
 */
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, icon, image, parentCategory } = req.body;

    const category = await Category.create({
      name,
      description,
      icon,
      image,
      parentCategory
    });

    const populatedCategory = await Category.findById(category._id).populate('parentCategory', 'name slug');

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: populatedCategory
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a category (admin only)
 * @route   PUT /api/categories/:id
 * @access  Private (Admin only)
 * @param   {string} req.params.id - Category ID
 * @param   {Object} req.body - Request body with fields to update
 * @param   {string} [req.body.name] - Category name
 * @param   {string} [req.body.description] - Category description
 * @param   {string} [req.body.icon] - Icon name or identifier
 * @param   {string} [req.body.image] - Image URL
 * @param   {string} [req.body.parentCategory] - Parent category ID
 * @param   {boolean} [req.body.isActive] - Active status
 * @returns {Promise<Object>} Response with success status and updated category data
 */
exports.updateCategory = async (req, res, next) => {
  try {
    await validateExists(Category, req.params.id, 'Category not found');

    let category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('parentCategory', 'name slug');

    category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('parentCategory', 'name slug');

    res.json({
      success: true,
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a category (admin only)
 * @route   DELETE /api/categories/:id
 * @access  Private (Admin only)
 * @param   {string} req.params.id - Category ID
 * @returns {Promise<Object>} Response with success status and message
 * @throws  {400} If category has existing products
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await validateExists(Category, req.params.id, 'Category not found');

    // Check if category has products
    const productCount = await Product.countDocuments({ category: category._id });
    if (productCount > 0) {
      return next(new ErrorResponse('Cannot delete category with existing products', 400));
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
