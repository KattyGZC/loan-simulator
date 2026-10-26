// Dates are ISO strings (YYYY-MM-DD) handled as plain calendar dates, without time zones.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

interface CalendarDate {
  year: number;
  /** 1 to 12. */
  month: number;
  day: number;
}

function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one; month is 1-based.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
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

export function isIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
}

/**
 * Date of payment `paymentNumber` (1-based), one month apart from the first payment. When the
 * month is shorter, it falls on its last day (Jan 31 → Feb 28 → Mar 31).
 */
export function paymentDate(firstPaymentDate: string, paymentNumber: number): string {
  const first = parseIsoDate(firstPaymentDate);
  if (!first) throw new Error(`Invalid first payment date: ${firstPaymentDate}`);
  const monthIndex = first.month - 1 + (paymentNumber - 1);
  const year = first.year + Math.floor(monthIndex / 12);
  const month = (monthIndex % 12) + 1;
  return formatIsoDate({ year, month, day: Math.min(first.day, daysInMonth(year, month)) });
}
