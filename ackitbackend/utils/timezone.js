/**
 * Timezone Utility Module
 * Centralized timezone handling for Pakistan/Karachi time (PKT - UTC+5)
 * Uses moment-timezone for reliable timezone conversions
 */

const moment = require('moment-timezone');

// Pakistan/Karachi timezone constant
const PAKISTAN_TIMEZONE = 'Asia/Karachi';

/**
 * Get current time in Pakistan/Karachi timezone
 * @returns {moment.Moment} Current moment in PKT
 */
function getCurrentPakistanTime() {
  return moment().tz(PAKISTAN_TIMEZONE);
}

/**
 * Convert a date/time string to Pakistan/Karachi time
 * @param {string|Date} dateTime - Date/time to convert (can be string or Date object)
 * @param {string} format - Optional format string (default: ISO format)
 * @returns {moment.Moment} Moment object in PKT
 */
function toPakistanTime(dateTime, format = null) {
  if (!dateTime) return null;
  
  if (format) {
    // If format is provided, parse the string as PKT time
    return moment.tz(dateTime, format, PAKISTAN_TIMEZONE);
  } else {
    // Otherwise, parse as UTC and convert to PKT
    return moment.utc(dateTime).tz(PAKISTAN_TIMEZONE);
  }
}

/**
 * Convert Pakistan/Karachi time to UTC Date object (for database storage)
 * @param {string|moment.Moment} pktTime - Time in PKT (string or moment object)
 * @param {string} format - Optional format string if pktTime is a string
 * @returns {Date} UTC Date object
 */
function pktToUTC(pktTime, format = null) {
  if (!pktTime) return null;
  
  let momentObj;
  if (moment.isMoment(pktTime)) {
    momentObj = pktTime;
  } else if (format) {
    // Parse string as PKT time with format
    momentObj = moment.tz(pktTime, format, PAKISTAN_TIMEZONE);
  } else {
    // Try to parse as PKT time (assumes ISO-like format)
    momentObj = moment.tz(pktTime, PAKISTAN_TIMEZONE);
  }
  
  // Convert to UTC and return as Date object
  return momentObj.utc().toDate();
}

/**
 * Format a date/time in Pakistan/Karachi timezone
 * @param {Date|string|moment.Moment} dateTime - Date to format
 * @param {string} format - Format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns {string} Formatted string in PKT
 */
function formatPakistanTime(dateTime, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!dateTime) return null;
  
  let momentObj;
  if (moment.isMoment(dateTime)) {
    momentObj = dateTime;
  } else if (dateTime instanceof Date) {
    momentObj = moment.utc(dateTime).tz(PAKISTAN_TIMEZONE);
  } else {
    momentObj = moment.utc(dateTime).tz(PAKISTAN_TIMEZONE);
  }
  
  return momentObj.format(format);
}

/**
 * Get current UTC time (Date object)
 * @returns {Date} Current UTC time
 */
function getCurrentUTCTime() {
  return new Date(); // This is UTC by default (no TZ set)
}

/**
 * Get current Pakistan/Karachi time (Date object)
 * Note: This returns a Date object that represents PKT time, but Date objects are always in UTC internally
 * For display, use formatPakistanTime() or getCurrentPKTTimeString()
 * @returns {Date} Current time (will be formatted as PKT when displayed)
 */
function getCurrentPKTTime() {
  // Just return current time - formatting will handle PKT conversion
  return new Date();
}

/**
 * Get current Pakistan/Karachi time as formatted string
 * @param {string} format - Format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns {string} Current time in PKT
 */
function getCurrentPakistanTimeString(format = 'YYYY-MM-DD HH:mm:ss') {
  return getCurrentPakistanTime().format(format);
}

/**
 * Get current Pakistan/Karachi time as formatted string
 * @param {string} format - Format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns {string} Current time in PKT
 */
function getCurrentPKTTimeString(format = 'YYYY-MM-DD HH:mm:ss') {
  return getCurrentPakistanTimeString(format);
}

/**
 * Parse datetime-local input (YYYY-MM-DDTHH:mm) as Pakistan time and convert to UTC
 * This is used for form inputs where user enters time in PKT
 * @param {string} dateTimeLocal - String in format "YYYY-MM-DDTHH:mm"
 * @returns {Date} UTC Date object for database storage
 */
function parseLocalDateTimeAsPKT(dateTimeLocal) {
  if (!dateTimeLocal) return null;
  
  // Parse as PKT time (datetime-local format: YYYY-MM-DDTHH:mm)
  const pktMoment = moment.tz(dateTimeLocal, 'YYYY-MM-DDTHH:mm', PAKISTAN_TIMEZONE);
  
  // Convert to UTC and return as Date object
  return pktMoment.utc().toDate();
}

/**
 * Convert UTC Date to datetime-local format string in PKT
 * This is used for populating form inputs
 * @param {Date|string} utcDate - UTC date from database
 * @returns {string} String in format "YYYY-MM-DDTHH:mm" (PKT time)
 */
function utcToLocalDateTimePKT(utcDate) {
  if (!utcDate) return '';
  
  // Convert UTC to PKT and format as datetime-local
  const pktMoment = moment.utc(utcDate).tz(PAKISTAN_TIMEZONE);
  return pktMoment.format('YYYY-MM-DDTHH:mm');
}

module.exports = {
  PAKISTAN_TIMEZONE,
  getCurrentPakistanTime,
  getCurrentUTCTime,
  getCurrentPKTTime,
  toPakistanTime,
  pktToUTC,
  formatPakistanTime,
  getCurrentPakistanTimeString,
  getCurrentPKTTimeString,
  parseLocalDateTimeAsPKT,
  utcToLocalDateTimePKT,
};

