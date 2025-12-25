/**
 * Date Helper Utilities
 * Shared date manipulation and formatting functions
 */

/**
 * Get Vietnam timezone offset (+7 hours)
 */
const getVietnamNow = () => {
  const now = new Date();
  const vietnamOffset = 7 * 60; // +7 hours in minutes
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  return new Date(utcTime + vietnamOffset * 60 * 1000);
};

/**
 * Convert date to ISO date string (YYYY-MM-DD)
 */
const toDateString = (date) => {
  if (!date) return null;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

/**
 * Convert date to ISO datetime string
 */
const toIsoString = (date) => {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

/**
 * Parse date to Date object at midnight
 */
const toDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * Normalize day key (YYYY-MM-DD in UTC)
 */
const normalizeDayKey = (value) => {
  if (!value) return null;
  let date;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date = new Date(value + 'T00:00:00.000Z');
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Check if date falls on weekend (Saturday or Sunday)
 */
const isWeekend = (dateIso) => {
  if (!dateIso) return false;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return false;
  const day = date.getDay();
  return day === 0 || day === 6;
};

/**
 * Get current week range (Monday to Sunday)
 */
const getWeekRange = (referenceDate = new Date()) => {
  const date = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const day = date.getDay();
  
  const monday = new Date(date);
  monday.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    start_date: toDateString(monday),
    end_date: toDateString(sunday),
    startDateObj: monday,
    endDateObj: sunday
  };
};

/**
 * Get current month range
 */
const getMonthRange = (referenceDate = new Date()) => {
  const date = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
  return {
    start_date: toDateString(firstDay),
    end_date: toDateString(lastDay),
    startDateObj: firstDay,
    endDateObj: lastDay
  };
};

/**
 * Resolve and validate date range
 */
const resolveDateRange = (start, end) => {
  const today = new Date();
  let startDate = start ? toDateOnly(start) : new Date(today.getFullYear(), today.getMonth(), 1);
  let endDate = end ? toDateOnly(end) : new Date(today.getFullYear(), today.getMonth() + 1, 0);

  if (!startDate || !endDate) {
    throw new Error('Invalid date range');
  }

  if (startDate > endDate) {
    [startDate, endDate] = [endDate, startDate];
  }

  const endDateWithTime = new Date(endDate);
  endDateWithTime.setHours(23, 59, 59, 999);

  const diffMs = endDateWithTime.getTime() - startDate.getTime();
  const days = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
  const weeks = Math.max(1, Math.ceil(days / 7));
  const months = Math.max(
    1,
    (endDateWithTime.getFullYear() - startDate.getFullYear()) * 12 +
      (endDateWithTime.getMonth() - startDate.getMonth()) + 1
  );

  return {
    start_date: toDateString(startDate),
    end_date: toDateString(endDate),
    startDateObj: startDate,
    endDateObj: endDateWithTime,
    days,
    weeks,
    months
  };
};

/**
 * Compute week templates for a given month
 */
const computeWeekTemplates = (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const templates = [];
  let cursor = new Date(start);

  while (cursor <= end) {
    const weekIndex = templates.length + 1;
    const weekStart = new Date(cursor);
    const days = [];
    let current = new Date(cursor);

    while (current <= end) {
      days.push(toIsoString(current));
      if (current.getUTCDay() === 0) break;
      current.setUTCDate(current.getUTCDate() + 1);
    }

    const lastDayIso = days[days.length - 1];
    const weekEnd = lastDayIso ? new Date(lastDayIso) : new Date(weekStart);

    templates.push({
      weekIndex,
      startDate: toIsoString(weekStart),
      endDate: toIsoString(weekEnd),
      days
    });

    cursor = new Date(weekEnd);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return templates;
};

/**
 * Distribute total evenly across slots
 */
const distributeEvenly = (total, slots) => {
  if (!Number.isFinite(total) || slots <= 0) {
    return Array.from({ length: Math.max(slots, 0) }, () => 0);
  }
  const integerTotal = Math.trunc(total);
  const base = Math.trunc(integerTotal / slots);
  let remainder = integerTotal - base * slots;
  
  return Array.from({ length: slots }, () => {
    if (remainder > 0) {
      remainder -= 1;
      return base + 1;
    }
    return base;
  });
};

/**
 * Get day of week name
 */
const getDayName = (date, locale = 'vi-VN') => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, { weekday: 'long' });
};

/**
 * Format date for display
 */
const formatDisplayDate = (date, locale = 'vi-VN') => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
};

/**
 * Calculate age from date of birth
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
};

module.exports = {
  getVietnamNow,
  toDateString,
  toIsoString,
  toDateOnly,
  normalizeDayKey,
  isWeekend,
  getWeekRange,
  getMonthRange,
  resolveDateRange,
  computeWeekTemplates,
  distributeEvenly,
  getDayName,
  formatDisplayDate,
  calculateAge
};
