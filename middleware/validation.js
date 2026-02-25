const { validationResult } = require('express-validator');

// Handle validation errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }

  next();
};

// Validation middleware wrappers
exports.validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    this.handleValidationErrors(req, res, next);
  };
};

module.exports = exports;
