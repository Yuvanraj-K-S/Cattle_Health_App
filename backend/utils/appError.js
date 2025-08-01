const { StatusCodes } = require('http-status-codes');

/**
 * Custom error class for handling application errors
 * @extends Error
 */
class AppError extends Error {
  /**
   * Create a new AppError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Array} errors - Array of error objects with details
   * @param {string} stack - Stack trace
   */
  constructor(
    message = 'Something went wrong',
    statusCode = StatusCodes.INTERNAL_SERVER_ERROR,
    errors = [],
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors.length > 0 ? errors : [{ message }];

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Create a new validation error
   * @param {Array} errors - Array of validation error objects
   * @returns {AppError} New AppError instance for validation errors
   */
  static validationError(errors = []) {
    return new AppError(
      'Validation failed',
      StatusCodes.UNPROCESSABLE_ENTITY,
      errors
    );
  }

  /**
   * Create a new not found error
   * @param {string} resource - Name of the resource that was not found
   * @returns {AppError} New AppError instance for not found errors
   */
  static notFound(resource = 'Resource') {
    return new AppError(
      `${resource} not found`,
      StatusCodes.NOT_FOUND
    );
  }

  /**
   * Create a new unauthorized error
   * @param {string} message - Error message
   * @returns {AppError} New AppError instance for unauthorized errors
   */
  static unauthorized(message = 'Not authorized') {
    return new AppError(
      message,
      StatusCodes.UNAUTHORIZED
    );
  }

  /**
   * Create a new forbidden error
   * @param {string} message - Error message
   * @returns {AppError} New AppError instance for forbidden errors
   */
  static forbidden(message = 'Forbidden') {
    return new AppError(
      message,
      StatusCodes.FORBIDDEN
    );
  }

  /**
   * Create a new bad request error
   * @param {string} message - Error message
   * @param {Array} errors - Array of error objects
   * @returns {AppError} New AppError instance for bad request errors
   */
  static badRequest(message = 'Bad request', errors = []) {
    return new AppError(
      message,
      StatusCodes.BAD_REQUEST,
      errors
    );
  }
}

module.exports = AppError;
