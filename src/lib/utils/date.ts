import { format, toZonedTime } from 'date-fns-tz';

const KST_TIMEZONE = 'Asia/Seoul';

/**
 * Get today's date in KST timezone (yyyy-MM-dd format)
 * This ensures consistent date handling for Korean users
 */
export function getTodayKST(): string {
  const now = new Date();
  const kstDate = toZonedTime(now, KST_TIMEZONE);
  return format(kstDate, 'yyyy-MM-dd', { timeZone: KST_TIMEZONE });
}

/**
 * Format a date to KST timezone
 */
export function formatToKST(date: Date, formatStr: string = 'yyyy-MM-dd'): string {
  const kstDate = toZonedTime(date, KST_TIMEZONE);
  return format(kstDate, formatStr, { timeZone: KST_TIMEZONE });
}
