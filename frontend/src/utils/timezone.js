/**
 * timezone.js — Centralized timezone utilities for JointRight
 *
 * All meetings are stored in MongoDB as UTC.
 * Display is always converted to the viewer's local timezone.
 * This file is the single source of truth for all time formatting.
 */

// ─── USER TIMEZONE DETECTION ────────────────────────────────────────────────

/** Returns the user's IANA timezone string (e.g. "Asia/Kolkata") */
export const getUserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
};

/** Returns the user's UTC offset as a human-readable string (e.g. "UTC+5:30") */
export const getUserTimezoneOffset = () => {
  const offsetMinutes = -new Date().getTimezoneOffset(); // Note: getTimezoneOffset is inverted
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;
  return `UTC${sign}${hours}${mins > 0 ? ':' + String(mins).padStart(2, '0') : ''}`;
};

/** Returns a display label like "IST (UTC+5:30)" or "PST (UTC-8)" */
export const getTimezoneLabel = () => {
  const tz = getUserTimezone();
  const offset = getUserTimezoneOffset();
  // Get the short abbreviation from the OS
  const short = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short', timeZone: tz })
    .formatToParts(new Date())
    .find(p => p.type === 'timeZoneName')?.value || tz;
  return `${short} (${offset})`;
};

// ─── DATE FORMATTING ────────────────────────────────────────────────────────

/**
 * Format a UTC date string for display in the user's local timezone.
 * @param {string|Date} dateInput  UTC date string or Date object from the server
 * @param {object} options         Intl.DateTimeFormat options override
 * @returns {string}               Formatted local time string
 */
export const formatLocalDateTime = (dateInput, options = {}) => {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Invalid date';

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: getUserTimezone(),
    ...options
  };
  return date.toLocaleString('en-US', defaultOptions);
};

/**
 * Format only the time portion in the user's local timezone.
 */
export const formatLocalTime = (dateInput) => {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Invalid time';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: getUserTimezone()
  });
};

/**
 * Format only the date portion in the user's local timezone.
 */
export const formatLocalDate = (dateInput) => {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: getUserTimezone()
  });
};

/**
 * Format a date with timezone abbreviation shown, e.g. "May 22, 4:30 PM IST"
 */
export const formatLocalDateTimeFull = (dateInput) => {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
    timeZone: getUserTimezone()
  });
};

// ─── INPUT HELPERS ──────────────────────────────────────────────────────────

/**
 * Convert a Date object to the "YYYY-MM-DDTHH:mm" format required by
 * <input type="datetime-local"> using the user's LOCAL time (not UTC).
 */
export const toDatetimeLocalString = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  // Use local getters — these already respect the system timezone
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Convert a datetime-local input string ("YYYY-MM-DDTHH:mm", no timezone) to a
 * UTC ISO string suitable for sending to the backend / storing in MongoDB.
 * Browsers treat datetime-local strings as LOCAL time, so new Date() handles it correctly.
 */
export const datetimeLocalToUTC = (datetimeLocalString) => {
  if (!datetimeLocalString) return null;
  return new Date(datetimeLocalString).toISOString();
};

// ─── RELATIVE TIME ─────────────────────────────────────────────────────────

/**
 * Returns a human-friendly relative time string, e.g. "in 2 hours", "3 days ago"
 */
export const formatRelativeTime = (dateInput) => {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMins) < 1) return 'just now';
  if (Math.abs(diffMins) < 60) return diffMins > 0 ? `in ${diffMins}m` : `${-diffMins}m ago`;
  if (Math.abs(diffHours) < 24) return diffHours > 0 ? `in ${diffHours}h` : `${-diffHours}h ago`;
  return diffDays > 0 ? `in ${diffDays}d` : `${-diffDays}d ago`;
};

/**
 * Check if a UTC date string is today in the user's local timezone
 */
export const isToday = (dateInput) => {
  if (!dateInput) return false;
  const date = new Date(dateInput);
  const now = new Date();
  return date.toLocaleDateString('en-US', { timeZone: getUserTimezone() }) ===
    now.toLocaleDateString('en-US', { timeZone: getUserTimezone() });
};
