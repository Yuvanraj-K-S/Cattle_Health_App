const { validationResult } = require('express-validator');
const { StatusCodes } = require('http-status-codes');
const AppError = require('../utils/appError');

/**
 * Middleware to validate request data using express-validator
 * @param {Array} validations - Array of validation chains
 * @returns {Function} Express middleware function
 */
const validateRequest = (validations) => {
  return async (req, res, next) => {
    try {
      // Run all validations
      await Promise.all(validations.map(validation => validation.run(req)));

      // Check for validation errors
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value,
        }));

        return next(
          new AppError(
            'Validation failed',
            StatusCodes.UNPROCESSABLE_ENTITY,
            errorMessages
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = validateRequest;
