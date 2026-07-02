import { toZonedTime, format } from 'date-fns-tz';

// D-SIGNIN-7: all display times must use Africa/Tunis, never toISOString().
const SALON_TZ = 'Africa/Tunis';

/**
 * Returns HH:mm string for the given date in Africa/Tunis.
 * Pass a Date updated via setInterval for live clock usage.
 */
export function formatSalonTime(date: Date): string {
  const zoned = toZonedTime(date, SALON_TZ);
  return format(zoned, 'HH:mm', { timeZone: SALON_TZ });
}

/**
 * Returns 'morning' | 'afternoon' | 'evening' based on Tunisia local hour.
 * Used by BrandPanel to pick the greeting key.
 */
export function getSalonGreeting(date: Date): 'morning' | 'afternoon' | 'evening' {
  const zoned = toZonedTime(date, SALON_TZ);
  const hour = zoned.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/** yyyy-MM-dd in Africa/Tunis — the board's date param, never toISOString(). */
export function salonDateKey(date: Date): string {
  return format(toZonedTime(date, SALON_TZ), 'yyyy-MM-dd', { timeZone: SALON_TZ });
}

/** Human label for the board header, e.g. "Thu 9 July". */
export function formatSalonDayLabel(dateStr: string): string {
  const zoned = toZonedTime(`${dateStr}T12:00:00Z`, SALON_TZ);
  return format(zoned, 'EEE d MMMM', { timeZone: SALON_TZ });
}
