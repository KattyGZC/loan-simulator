// Dates are ISO strings (YYYY-MM-DD) handled as plain calendar dates, without time zones.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one; month is 1-based.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number) as [number, number, number, number];
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

/**
 * Date of payment `number` (1-based), one month apart from the first payment. When the
 * month is shorter, it falls on its last day (Jan 31 → Feb 28 → Mar 31).
 */
export function paymentDate(firstPaymentDate: string, number: number): string {
  const [year, month, day] = firstPaymentDate.split('-').map(Number) as [number, number, number];
  const monthIndex = month - 1 + (number - 1);
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = (monthIndex % 12) + 1;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return `${pad(targetYear, 4)}-${pad(targetMonth, 2)}-${pad(targetDay, 2)}`;
}
