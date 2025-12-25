/**
 * Error Handler Middleware
 * Centralized error handling for Express
 */

const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

/**
 * Async handler wrapper to catch errors
 * @param {Function} fn - Async route handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Not found handler
 */
const notFoundHandler = (req, res, next) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    message: ERROR_MESSAGES.NOT_FOUND,
    path: req.originalUrl
  });
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Custom error with status
  if (err.status) {
    return res.status(err.status).json({
      message: err.message || ERROR_MESSAGES.SERVER_ERROR
    });
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      message: ERROR_MESSAGES.VALIDATION_ERROR,
      errors: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(HTTP_STATUS.CONFLICT).json({
      message: 'Dữ liệu đã tồn tại',
      fields: err.errors.map(e => e.path)
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      message: ERROR_MESSAGES.TOKEN_INVALID
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      message: ERROR_MESSAGES.TOKEN_EXPIRED
    });
  }

  // Default server error
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    message: process.env.NODE_ENV === 'production' 
      ? ERROR_MESSAGES.SERVER_ERROR 
      : err.message
  });
};

module.exports = {
  asyncHandler,
  notFoundHandler,
  errorHandler
};
