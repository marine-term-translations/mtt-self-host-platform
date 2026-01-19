/**
 * Datetime utility module using dayjs for consistent ISO-8601 datetime handling
 * All datetimes in the application should use this module for consistency
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';

// Enable plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

/**
 * Get current datetime in ISO-8601 format with timezone
 * @returns ISO-8601 datetime string (e.g., "2026-01-19T10:30:00.000Z")
 */
export function now(): string {
  return dayjs().utc().toISOString();
}

/**
 * Parse a datetime string and return dayjs object
 * @param input - Datetime input
 * @returns dayjs object
 */
export function parse(input: string | Date | number): dayjs.Dayjs {
  return dayjs(input).utc();
}

/**
 * Format a datetime to ISO-8601 string
 * @param input - Datetime input
 * @returns ISO-8601 datetime string
 */
export function toISO(input: string | Date | number | dayjs.Dayjs): string {
  return dayjs(input).utc().toISOString();
}

/**
 * Add time to a datetime
 * @param input - Datetime input
 * @param amount - Amount to add
 * @param unit - Unit ('second', 'minute', 'hour', 'day', 'week', 'month', 'year')
 * @returns ISO-8601 datetime string
 */
export function add(input: string | Date | number | dayjs.Dayjs, amount: number, unit: dayjs.ManipulateType): string {
  return dayjs(input).utc().add(amount, unit).toISOString();
}

/**
 * Subtract time from a datetime
 * @param input - Datetime input
 * @param amount - Amount to subtract
 * @param unit - Unit ('second', 'minute', 'hour', 'day', 'week', 'month', 'year')
 * @returns ISO-8601 datetime string
 */
export function subtract(input: string | Date | number | dayjs.Dayjs, amount: number, unit: dayjs.ManipulateType): string {
  return dayjs(input).utc().subtract(amount, unit).toISOString();
}

/**
 * Check if a datetime is before another
 * @param date1 - First datetime
 * @param date2 - Second datetime
 * @returns true if date1 is before date2
 */
export function isBefore(date1: string | Date | number | dayjs.Dayjs, date2: string | Date | number | dayjs.Dayjs): boolean {
  return dayjs(date1).isBefore(dayjs(date2));
}

/**
 * Check if a datetime is after another
 * @param date1 - First datetime
 * @param date2 - Second datetime
 * @returns true if date1 is after date2
 */
export function isAfter(date1: string | Date | number | dayjs.Dayjs, date2: string | Date | number | dayjs.Dayjs): boolean {
  return dayjs(date1).isAfter(dayjs(date2));
}

/**
 * Format datetime for display
 * @param input - Datetime input
 * @param formatStr - Format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns Formatted datetime string
 */
export function format(input: string | Date | number | dayjs.Dayjs, formatStr: string = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs(input).utc().format(formatStr);
}

/**
 * Format datetime relative to now (e.g., "2 hours ago")
 * @param input - Datetime input
 * @returns Relative time string
 */
export function fromNow(input: string | Date | number | dayjs.Dayjs): string {
  return dayjs(input).fromNow();
}

/**
 * Get difference between two datetimes
 * @param date1 - First datetime
 * @param date2 - Second datetime
 * @param unit - Unit ('second', 'minute', 'hour', 'day', etc.)
 * @returns Difference in specified unit
 */
export function diff(date1: string | Date | number | dayjs.Dayjs, date2: string | Date | number | dayjs.Dayjs, unit: dayjs.QUnitType | dayjs.OpUnitType = 'millisecond'): number {
  return dayjs(date1).diff(dayjs(date2), unit);
}

/**
 * Get Unix timestamp in seconds
 * @param input - Datetime input (optional, defaults to now)
 * @returns Unix timestamp in seconds
 */
export function unix(input?: string | Date | number | dayjs.Dayjs): number {
  return input ? dayjs(input).unix() : dayjs().unix();
}

// Export dayjs for advanced use cases
export { dayjs };
