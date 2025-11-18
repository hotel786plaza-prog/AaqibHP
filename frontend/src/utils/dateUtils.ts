// utils/dateUtils.ts

// ✅ IST offset in minutes
const IST_OFFSET_MINUTES = 5.5 * 60;

/**
 * Convert any Date object to IST timezone
 */
export const toIST = (date: Date): Date => {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + IST_OFFSET_MINUTES * 60000);
};

/**
 * Format Date into SQL-friendly string (YYYY-MM-DD HH:mm:ss)
 */
export const formatDateTimeSQL = (date: Date): string => {
  const d = toIST(date);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

/**
 * Format Date for <input type="datetime-local" />
 * (YYYY-MM-DDTHH:mm)
 */
export const formatDateTime = (date: Date): string => {
  const d = toIST(date);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

/**
 * Format Date for user-friendly display (DD/MM/YYYY hh:mm AM/PM)
 */
export const formatDateTimeDisplay = (date: Date): string => {
  const d = toIST(date);
  const pad = (n: number) => n.toString().padStart(2, "0");

  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12; // convert 0 -> 12 for 12 AM
  const hh = pad(hours);

  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();

  return `${dd}/${mm}/${yyyy} ${hh}:${minutes} ${ampm}`;
};

/**
 * Add days to given date (keeping IST in sync)
 */
export const addDaysWithTime = (date: Date, days: number): Date => {
  const d = toIST(date);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Calculate difference in days (from → to)
 */
export const differenceInDaysWithTime = (to: Date, from: Date = new Date()): number => {
  const d1 = toIST(from);
  const d2 = toIST(to);
  const ms = d2.getTime() - d1.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};
