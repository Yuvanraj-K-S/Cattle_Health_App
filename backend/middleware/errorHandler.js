const { StatusCodes } = require('http-status-codes');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Default error response
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log the error for debugging
  logger.error(`💥 ${err.stack}`);

  // Handle specific error types
  if (err.name === 'CastError') {
    // Handle invalid ObjectId
    const message = `Resource not found with id of ${err.value}`;
    error = new AppError(message, StatusCodes.NOT_FOUND);
  } else if (err.code === 11000) {
    // Handle duplicate key errors (MongoDB)
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    error = new AppError(message, StatusCodes.BAD_REQUEST);
  } else if (err.name === 'ValidationError') {
    // Handle Mongoose validation errors
    const errors = Object.values(err.errors).map(el => ({
      field: el.path,
      message: el.message,
    }));
    error = AppError.validationError(errors);
  } else if (err.name === 'JsonWebTokenError') {
    // Handle JWT errors
    error = new AppError('Invalid token. Please log in again!', StatusCodes.UNAUTHORIZED);
  } else if (err.name === 'TokenExpiredError') {
    // Handle expired JWT
    error = new AppError('Your token has expired! Please log in again.', StatusCodes.UNAUTHORIZED);
  } else if (err.name === 'MongoServerError') {
    // Handle other MongoDB errors
    error = new AppError('Database error occurred', StatusCodes.INTERNAL_SERVER_ERROR);
  }

  // Set response status code
  const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const status = error.status || 'error';

  // In development, send full error stack trace
  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      status,
      error: {
        message: error.message,
        stack: error.stack,
        errors: error.errors || undefined,
      },
    });
  } else {
    // In production, only send error message
    res.status(statusCode).json({
      status,
      message: error.message,
      errors: error.errors || undefined,
    });
  }
};

module.exports = errorHandler;
