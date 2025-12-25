/**
 * Middleware Index
 * Central export for all middleware
 */

const authMiddleware = require('./authMiddleware');
const roleMiddleware = require('./roleMiddleware');
const { 
  requireFields, 
  validateIdParam, 
  validatePagination, 
  validateDateRange,
  sanitizeBody 
} = require('./validationMiddleware');
const { 
  asyncHandler, 
  notFoundHandler, 
  errorHandler 
} = require('./errorMiddleware');

module.exports = {
  // Auth
  auth: authMiddleware,
  authorize: roleMiddleware,
  
  // Validation
  requireFields,
  validateIdParam,
  validatePagination,
  validateDateRange,
  sanitizeBody,
  
  // Error handling
  asyncHandler,
  notFoundHandler,
  errorHandler
};
