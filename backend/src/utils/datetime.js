/**
 * Datetime utility module using dayjs for consistent ISO-8601 datetime handling
 * All datetimes in the application should use this module for consistency
 */

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Enable UTC and timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Get current datetime in ISO-8601 format with timezone
 * @returns {string} ISO-8601 datetime string (e.g., "2026-01-19T10:30:00.000Z")
 */
function now() {
  return dayjs().utc().toISOString();
}

/**
 * Parse a datetime string and return dayjs object
 * @param {string|Date|number} input - Datetime input
 * @returns {dayjs.Dayjs} dayjs object
 */
function parse(input) {
  return dayjs(input).utc();
}

/**
 * Format a datetime to ISO-8601 string
 * @param {string|Date|number|dayjs.Dayjs} input - Datetime input
 * @returns {string} ISO-8601 datetime string
 */
function toISO(input) {
  return dayjs(input).utc().toISOString();
}

/**
 * Format a datetime to xsd:dateTime compatible string (with Z suffix)
 * @param {string|Date|number|dayjs.Dayjs} input - Datetime input
 * @returns {string} xsd:dateTime string (e.g., "2026-01-19T10:30:00Z")
 */
function toXSDDateTime(input) {
  return dayjs(input).utc().format('YYYY-MM-DDTHH:mm:ss[Z]');
}

/**
 * Add time to a datetime
 * @param {string|Date|number|dayjs.Dayjs} input - Datetime input
 * @param {number} amount - Amount to add
 * @param {string} unit - Unit ('second', 'minute', 'hour', 'day', 'week', 'month', 'year')
 * @returns {string} ISO-8601 datetime string
 */
function add(input, amount, unit) {
  return dayjs(input).utc().add(amount, unit).toISOString();
}

/**
 * Subtract time from a datetime
 * @param {string|Date|number|dayjs.Dayjs} input - Datetime input
 * @param {number} amount - Amount to subtract
 * @param {string} unit - Unit ('second', 'minute', 'hour', 'day', 'week', 'month', 'year')
 * @returns {string} ISO-8601 datetime string
 */
function subtract(input, amount, unit) {
  return dayjs(input).utc().subtract(amount, unit).toISOString();
}

/**
 * Check if a datetime is before another
 * @param {string|Date|number|dayjs.Dayjs} date1 - First datetime
 * @param {string|Date|number|dayjs.Dayjs} date2 - Second datetime
 * @returns {boolean} true if date1 is before date2
 */
function isBefore(date1, date2) {
  return dayjs(date1).isBefore(dayjs(date2));
}

/**
 * Check if a datetime is after another
 * @param {string|Date|number|dayjs.Dayjs} date1 - First datetime
 * @param {string|Date|number|dayjs.Dayjs} date2 - Second datetime
 * @returns {boolean} true if date1 is after date2
 */
function isAfter(date1, date2) {
  return dayjs(date1).isAfter(dayjs(date2));
}

/**
 * Get Unix timestamp in seconds
 * @param {string|Date|number|dayjs.Dayjs} input - Datetime input (optional, defaults to now)
 * @returns {number} Unix timestamp in seconds
 */
function unix(input) {
  return input ? dayjs(input).unix() : dayjs().unix();
}

/**
 * Format datetime for display
 * @param {string|Date|number|dayjs.Dayjs} input - Datetime input
 * @param {string} format - Format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns {string} Formatted datetime string
 */
function format(input, formatStr = 'YYYY-MM-DD HH:mm:ss') {
  return dayjs(input).utc().format(formatStr);
}

/**
 * Get difference between two datetimes
 * @param {string|Date|number|dayjs.Dayjs} date1 - First datetime
 * @param {string|Date|number|dayjs.Dayjs} date2 - Second datetime
 * @param {string} unit - Unit ('second', 'minute', 'hour', 'day', etc.)
 * @returns {number} Difference in specified unit
 */
function diff(date1, date2, unit = 'millisecond') {
  return dayjs(date1).diff(dayjs(date2), unit);
}

module.exports = {
  now,
  parse,
  toISO,
  toXSDDateTime,
  add,
  subtract,
  isBefore,
  isAfter,
  unix,
  format,
  diff,
  dayjs, // Export dayjs for advanced use cases
};
