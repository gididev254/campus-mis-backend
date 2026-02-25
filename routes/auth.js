const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  refreshToken
} = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  handleValidationErrors
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  handleValidationErrors
];

const forgotPasswordValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  handleValidationErrors
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  handleValidationErrors
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh-token', refreshToken);

// Self-service password reset routes disabled - admin-only password resets
// Users should contact administrator to reset their password
router.post('/forgot-password', (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Self-service password reset is not available. Please contact your administrator to reset your password.'
  });
});

router.post('/reset-password', (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Self-service password reset is not available. Please contact your administrator to reset your password.'
  });
});

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePasswordValidation, changePassword);

module.exports = router;
