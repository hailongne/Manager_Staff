/**
 * Validation Middleware
 * Common validation helpers for routes
 */

const { ERROR_MESSAGES } = require('../utils/constants');

/**
 * Validate required fields in request body
 * @param {string[]} fields - Array of required field names
 */
const requireFields = (fields) => (req, res, next) => {
  const missing = fields.filter(field => {
    const value = req.body[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    return res.status(400).json({
      message: ERROR_MESSAGES.REQUIRED_FIELD,
      fields: missing
    });
  }
  next();
};

/**
 * Validate ID parameter is a valid number
 */
const validateIdParam = (paramName = 'id') => (req, res, next) => {
  const id = Number(req.params[paramName]);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({
      message: `${paramName} không hợp lệ`
    });
  }
  req.params[paramName] = id;
  next();
};

/**
 * Validate pagination query params
 */
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  
  req.pagination = {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)),
    offset: (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit))
  };
  next();
};

/**
 * Validate date range query params
 */
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: 'Ngày không hợp lệ'
      });
    }
    
    if (start > end) {
      return res.status(400).json({
        message: 'Ngày bắt đầu phải trước ngày kết thúc'
      });
    }
    
    req.dateRange = { startDate: start, endDate: end };
  }
  next();
};

/**
 * Sanitize string fields in request body
 */
const sanitizeBody = (fields) => (req, res, next) => {
  fields.forEach(field => {
    if (typeof req.body[field] === 'string') {
      req.body[field] = req.body[field].trim();
    }
  });
  next();
};

module.exports = {
  requireFields,
  validateIdParam,
  validatePagination,
  validateDateRange,
  sanitizeBody
};
