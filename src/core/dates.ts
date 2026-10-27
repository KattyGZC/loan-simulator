// Dates are ISO strings (YYYY-MM-DD) handled as plain calendar dates, without time zones.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

interface CalendarDate {
  year: number;
  /** 1 to 12. */
  month: number;
  day: number;
}

/**
 * Midnight UTC of a calendar date. `month` is 1-based and may overflow, as with `Date.UTC`.
 * Unlike `Date.UTC`, years 0–99 stay years 0–99 instead of turning into 1900–1999.
 */
function utcMidnight(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return utcMidnight(year, month + 1, 0).getUTCDate();
}

function parseIsoDate(value: string): CalendarDate | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const monthExists = date.month >= 1 && date.month <= 12;
  const dayExists = date.day >= 1 && date.day <= daysInMonth(date.year, date.month);
  return monthExists && dayExists ? date : null;
}

function formatIsoDate({ year, month, day }: CalendarDate): string {
  const pad = (value: number, length: number) => String(value).padStart(length, '0');
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

const MS_PER_DAY = 86_400_000;
const SATURDAY = 6;
const SUNDAY = 0;

function toUtc(isoDate: string): Date {
  const date = parseIsoDate(isoDate);
  if (!date) throw new Error(`Invalid date: ${isoDate}`);
  return utcMidnight(date.year, date.month, date.day);
}

function fromUtc(date: Date): string {
  return formatIsoDate({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

export function isIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
}

const MONTHS_PER_YEAR = 12;

/**
 * Date of payment `paymentNumber` (1-based), one month apart from the first payment; 0 is the
 * month before the first. When the month is shorter, it falls on its last day
 * (Jan 31 → Feb 28 → Mar 31).
 */
export function paymentDate(firstPaymentDate: string, paymentNumber: number): string {
  const first = parseIsoDate(firstPaymentDate);
  if (!first) throw new Error(`Invalid first payment date: ${firstPaymentDate}`);
  const monthIndex = first.month - 1 + (paymentNumber - 1);
  const year = first.year + Math.floor(monthIndex / MONTHS_PER_YEAR);
  const month = (((monthIndex % MONTHS_PER_YEAR) + MONTHS_PER_YEAR) % MONTHS_PER_YEAR) + 1;
  return formatIsoDate({ year, month, day: Math.min(first.day, daysInMonth(year, month)) });
}

/** Calendar days from `from` to `to`, both ISO dates. Negative when `to` comes first. */
export function daysBetween(from: string, to: string): number {
  return (toUtc(to).getTime() - toUtc(from).getTime()) / MS_PER_DAY;
}

export const DAYS_PER_30_360_MONTH = 30;

/**
 * Days from `from` to `to` counting every month as 30 days: the last day of a month, February
 * included, counts as the 30th, so a month-end due date is always 30 days after the previous
 * one. Negative when `to` comes first.
 */
export function days360Between(from: string, to: string): number {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);
  if (!start || !end) throw new Error(`Invalid date: ${start ? to : from}`);
  const dayNumber = ({ year, month, day }: CalendarDate) => {
    const isMonthEnd = day === daysInMonth(year, month);
    const day360 = isMonthEnd ? DAYS_PER_30_360_MONTH : Math.min(day, DAYS_PER_30_360_MONTH);
    return (year * MONTHS_PER_YEAR + month) * DAYS_PER_30_360_MONTH + day360;
  };
  return dayNumber(end) - dayNumber(start);
}

/** The ISO date `days` days after `isoDate`, or before it when `days` is negative. */
export function addDays(isoDate: string, days: number): string {
  const date = toUtc(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

/** `isoDate`, or the Monday after it when it falls on a Saturday or Sunday. */
export function weekdayOnOrAfter(isoDate: string): string {
  const date = toUtc(isoDate);
  if (date.getUTCDay() === SATURDAY) date.setUTCDate(date.getUTCDate() + 2);
  if (date.getUTCDay() === SUNDAY) date.setUTCDate(date.getUTCDate() + 1);
  return fromUtc(date);
}
