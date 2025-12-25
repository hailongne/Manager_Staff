/**
 * KPI Helper Functions
 * 
 * Centralized validation and utilities for KPI operations.
 * All dates are handled in UTC format (YYYY-MM-DD).
 * 
 * Design principles:
 * - Backend does NOT auto-calculate or redistribute
 * - Backend validates and stores exactly what FE sends
 * - All dates must be valid YYYY-MM-DD format
 * - Totals must match: sum(weeks) == target_value, sum(days) == week.target_value
 */

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalize a date string to YYYY-MM-DD format (UTC)
 * @param {string|Date} value - Date input
 * @returns {string|null} - Normalized date string or null if invalid
 */
const normalizeDate = (value) => {
  if (!value) return null;
  
  // Already in YYYY-MM-DD format
  if (typeof value === 'string' && DATE_REGEX.test(value)) {
    return value;
  }
  
  // Parse ISO string or Date object
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Validate and parse a non-negative integer
 * @param {unknown} value - Input value
 * @returns {number|null} - Parsed integer or null if invalid
 */
const parseNonNegativeInt = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.trunc(parsed);
};

/**
 * Validate and parse a positive integer
 * @param {unknown} value - Input value
 * @returns {number|null} - Parsed integer or null if invalid
 */
const parsePositiveInt = (value) => {
  const parsed = parseNonNegativeInt(value);
  if (parsed === null || parsed <= 0) return null;
  return parsed;
};

/**
 * Validate a single day breakdown entry
 * @param {object} day - Day object { date, target_value }
 * @returns {{ valid: boolean, date?: string, target_value?: number, error?: string }}
 */
const validateDayEntry = (day) => {
  if (!day || typeof day !== 'object') {
    return { valid: false, error: 'Invalid day entry' };
  }

  const date = normalizeDate(day.date);
  if (!date) {
    return { valid: false, error: `Invalid date format: ${day.date}` };
  }

  const targetValue = parseNonNegativeInt(day.target_value);
  if (targetValue === null) {
    return { valid: false, error: `Invalid target_value for date ${date}` };
  }

  return { valid: true, date, target_value: targetValue };
};

/**
 * Validate a single week breakdown entry
 * @param {object} week - Week object
 * @returns {{ valid: boolean, data?: object, error?: string }}
 */
const validateWeekEntry = (week) => {
  if (!week || typeof week !== 'object') {
    return { valid: false, error: 'Invalid week entry' };
  }

  const weekIndex = parsePositiveInt(week.week_index);
  if (!weekIndex) {
    return { valid: false, error: 'Invalid week_index' };
  }

  const targetValue = parseNonNegativeInt(week.target_value);
  if (targetValue === null) {
    return { valid: false, error: `Invalid target_value for week ${weekIndex}` };
  }

  const dayBreakdown = week.day_breakdown;
  if (!Array.isArray(dayBreakdown)) {
    return { valid: false, error: `Missing day_breakdown for week ${weekIndex}` };
  }

  const validatedDays = [];
  let daySum = 0;

  for (const day of dayBreakdown) {
    const result = validateDayEntry(day);
    if (!result.valid) {
      return { valid: false, error: `Week ${weekIndex}: ${result.error}` };
    }
    validatedDays.push({ date: result.date, target_value: result.target_value });
    daySum += result.target_value;
  }

  // Validate that sum of days equals week target (allow ±1 for rounding)
  if (Math.abs(daySum - targetValue) > 1) {
    return { 
      valid: false, 
      error: `Week ${weekIndex}: sum of days (${daySum}) does not match week target (${targetValue})` 
    };
  }

  // Sort days by date
  validatedDays.sort((a, b) => a.date.localeCompare(b.date));

  return {
    valid: true,
    data: {
      week_index: weekIndex,
      target_value: targetValue,
      day_breakdown: validatedDays
    }
  };
};

/**
 * Validate the entire week_breakdown array
 * @param {Array} weekBreakdown - Array of week objects
 * @param {number} monthTarget - Expected total for the month
 * @returns {{ valid: boolean, data?: Array, error?: string }}
 */
const validateWeekBreakdown = (weekBreakdown, monthTarget) => {
  if (!Array.isArray(weekBreakdown)) {
    return { valid: false, error: 'week_breakdown must be an array' };
  }

  if (weekBreakdown.length === 0) {
    return { valid: false, error: 'week_breakdown cannot be empty' };
  }

  const validatedWeeks = [];
  let weekSum = 0;
  const seenWeekIndices = new Set();

  for (const week of weekBreakdown) {
    const result = validateWeekEntry(week);
    if (!result.valid) {
      return result;
    }

    // Check for duplicate week indices
    if (seenWeekIndices.has(result.data.week_index)) {
      return { valid: false, error: `Duplicate week_index: ${result.data.week_index}` };
    }
    seenWeekIndices.add(result.data.week_index);

    validatedWeeks.push(result.data);
    weekSum += result.data.target_value;
  }

  // Validate that sum of weeks equals month target (allow ±1 for rounding)
  if (Math.abs(weekSum - monthTarget) > 1) {
    return { 
      valid: false, 
      error: `Sum of weeks (${weekSum}) does not match month target (${monthTarget})` 
    };
  }

  // Sort weeks by week_index
  validatedWeeks.sort((a, b) => a.week_index - b.week_index);

  return { valid: true, data: validatedWeeks };
};

/**
 * Sanitize the full KPI payload
 * @param {object} payload - Raw request body
 * @param {object} options - Options like { requireWeekBreakdown: boolean }
 * @returns {{ valid: boolean, data?: object, error?: string }}
 */
const sanitizeKpiPayload = (payload, options = {}) => {
  const { requireWeekBreakdown = true } = options;

  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid payload' };
  }

  const targetValue = parsePositiveInt(payload.target_value);
  if (!targetValue) {
    return { valid: false, error: 'target_value must be a positive integer' };
  }

  const unitLabel = typeof payload.unit_label === 'string' 
    ? payload.unit_label.trim() || 'sản phẩm'
    : 'sản phẩm';

  const notes = typeof payload.notes === 'string' && payload.notes.trim()
    ? payload.notes.trim()
    : null;

  const result = {
    target_value: targetValue,
    unit_label: unitLabel,
    notes
  };

  // Validate week_breakdown if provided or required
  if (payload.week_breakdown !== undefined || requireWeekBreakdown) {
    const weekResult = validateWeekBreakdown(payload.week_breakdown, targetValue);
    if (!weekResult.valid) {
      return weekResult;
    }
    result.week_breakdown = weekResult.data;
  }

  return { valid: true, data: result };
};

/**
 * Generate week templates for a given month (calendar weeks starting from 1st)
 * Used only when FE needs initial structure
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Array} - Array of week templates
 */
const generateMonthWeeks = (year, month) => {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0));
  const daysInMonth = lastDay.getUTCDate();
  
  const weeks = [];
  let currentDay = 1;
  let weekIndex = 1;
  
  while (currentDay <= daysInMonth) {
    const weekStart = currentDay;
    const weekEnd = Math.min(currentDay + 6, daysInMonth);
    const days = [];
    
    for (let d = weekStart; d <= weekEnd; d++) {
      const date = new Date(Date.UTC(year, month - 1, d));
      days.push({
        date: normalizeDate(date),
        target_value: 0,
        is_weekend: date.getUTCDay() === 0 || date.getUTCDay() === 6
      });
    }
    
    weeks.push({
      week_index: weekIndex,
      target_value: 0,
      start_date: normalizeDate(new Date(Date.UTC(year, month - 1, weekStart))),
      end_date: normalizeDate(new Date(Date.UTC(year, month - 1, weekEnd))),
      day_breakdown: days
    });
    
    currentDay = weekEnd + 1;
    weekIndex++;
  }
  
  return weeks;
};

/**
 * Check if a date is a weekend (Saturday or Sunday)
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {boolean}
 */
const isWeekend = (dateStr) => {
  if (!dateStr || !DATE_REGEX.test(dateStr)) return false;
  const date = new Date(dateStr + 'T00:00:00.000Z');
  const day = date.getUTCDay();
  return day === 0 || day === 6;
};

/**
 * Calculate KPI distribution by weeks and days based on start_date and end_date
 * @param {number} targetValue - Total KPI target
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {object} - { weeks: Array, totalWorkingDays: number }
 */
const calculateKpiDistribution = (targetValue, startDate, endDate) => {
  const start = new Date(startDate + 'T00:00:00.000Z');
  const end = new Date(endDate + 'T00:00:00.000Z');
  
  const weeks = [];
  let totalWorkingDays = 0;
  let weekIndex = 1;
  
  // Start from the beginning of the week (Monday)
  let currentWeekStart = new Date(start);
  currentWeekStart.setUTCDate(start.getUTCDate() - (start.getUTCDay() === 0 ? 6 : start.getUTCDay() - 1));
  
  while (currentWeekStart <= end) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setUTCDate(currentWeekStart.getUTCDate() + 6);
    
    // Get working days in this week within the date range
    const workingDays = [];
    let weekWorkingDays = 0;
    
    for (let d = new Date(currentWeekStart); d <= weekEnd && d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      if (d >= start) {
        const dateStr = d.toISOString().split('T')[0];
        const isWorkingDay = !isWeekend(dateStr);
        workingDays.push({
          date: dateStr,
          target_value: 0, // Will be calculated later
          is_working_day: isWorkingDay
        });
        if (isWorkingDay) {
          weekWorkingDays++;
          totalWorkingDays++;
        }
      }
    }
    
    if (workingDays.length > 0) {
      weeks.push({
        week_index: weekIndex,
        start_date: currentWeekStart.toISOString().split('T')[0],
        end_date: weekEnd.toISOString().split('T')[0],
        target_value: 0, // Will be calculated later
        working_days: weekWorkingDays,
        days: workingDays
      });
      weekIndex++;
    }
    
    // Move to next week
    currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + 7);
  }
  
  // Distribute target value evenly across working days
  if (totalWorkingDays > 0) {
    const baseValue = Math.floor(targetValue / totalWorkingDays);
    const remainder = targetValue % totalWorkingDays;
    
    let dayCount = 0;
    
    weeks.forEach(week => {
      week.days.forEach(day => {
        if (day.is_working_day) {
          day.target_value = baseValue + (dayCount < remainder ? 1 : 0);
          dayCount++;
        } else {
          day.target_value = 0;
        }
      });
      
      // Sum up week target from working days only
      week.target_value = week.days.reduce((sum, day) => sum + day.target_value, 0);
    });
  }
  
  return { weeks, totalWorkingDays };
};

module.exports = {
  normalizeDate,
  parseNonNegativeInt,
  parsePositiveInt,
  validateDayEntry,
  validateWeekEntry,
  validateWeekBreakdown,
  sanitizeKpiPayload,
  generateMonthWeeks,
  isWeekend,
  calculateKpiDistribution,
  DATE_REGEX
};
