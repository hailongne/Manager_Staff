/**
 * Common Validation Utilities
 * Shared helpers for input validation and normalization
 */

/**
 * Remove Vietnamese diacritics from string
 */
const removeDiacritics = (value) => {
  if (!value) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Normalize string value (trim and return null if empty)
 */
const normalizeString = (value) => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
};

/**
 * Normalize string to lowercase with no diacritics
 */
const normalizeText = (value) => {
  if (!value) return '';
  return removeDiacritics(value).trim().toLowerCase();
};

/**
 * Sanitize and normalize email address
 */
const normalizeEmail = (value) => {
  if (!value) return null;
  return String(value).trim().toLowerCase();
};

/**
 * Normalize phone number (remove spaces, keep + prefix)
 */
const normalizePhone = (value) => {
  if (!value) return null;
  return String(value).replace(/\s+/g, '').trim() || null;
};

/**
 * Parse integer with validation
 */
const parseInteger = (value, { min, max } = {}) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const integer = Math.trunc(parsed);
  if (min !== undefined && integer < min) return null;
  if (max !== undefined && integer > max) return null;
  return integer;
};

/**
 * Parse positive integer (>= 1)
 */
const parsePositiveInteger = (value) => parseInteger(value, { min: 1 });

/**
 * Parse non-negative integer (>= 0)
 */
const parseNonNegativeInteger = (value) => parseInteger(value, { min: 0 });

/**
 * Parse decimal number with optional fallback
 */
const parseDecimal = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number.parseFloat(value);
  return Number.isNaN(num) ? fallback : num;
};

/**
 * Normalize array of IDs (dedupe, filter invalid)
 */
const normalizeIdArray = (value) => {
  const arr = Array.isArray(value) ? value : [];
  const normalized = arr
    .map(item => {
      const parsed = Number(item);
      return Number.isFinite(parsed) ? parsed : null;
    })
    .filter(item => item != null);
  return Array.from(new Set(normalized));
};

/**
 * Validate email format
 */
const isValidEmail = (value) => {
  if (!value) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(value).trim());
};

/**
 * Validate Vietnamese phone format
 */
const isValidPhone = (value) => {
  if (!value) return false;
  const phoneRegex = /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/;
  return phoneRegex.test(String(value).replace(/\s+/g, ''));
};

/**
 * Slugify username from name/email
 */
const slugifyUsername = (value) => {
  if (!value) return '';
  return removeDiacritics(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
};

/**
 * Check if value is empty (null, undefined, empty string, empty array)
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Ensure value is within range
 */
const clamp = (value, min, max) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(Math.max(num, min), max);
};

module.exports = {
  removeDiacritics,
  normalizeString,
  normalizeText,
  normalizeEmail,
  normalizePhone,
  parseInteger,
  parsePositiveInteger,
  parseNonNegativeInteger,
  parseDecimal,
  normalizeIdArray,
  isValidEmail,
  isValidPhone,
  slugifyUsername,
  isEmpty,
  clamp
};
