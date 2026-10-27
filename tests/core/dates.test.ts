import { describe, expect, it } from 'vitest';
import {
  addDays,
  days360Between,
  daysBetween,
  isIsoDate,
  paymentDate,
  weekdayOnOrAfter,
} from '@/core/dates';

describe('paymentDate', () => {
  it('returns the first payment date for payment 1', () => {
    expect(paymentDate('2026-11-15', 1)).toBe('2026-11-15');
  });

  it('adds one month per payment', () => {
    expect(paymentDate('2026-11-15', 2)).toBe('2026-12-15');
    expect(paymentDate('2026-11-15', 3)).toBe('2027-01-15');
    expect(paymentDate('2026-11-15', 361)).toBe('2056-11-15');
  });

  it('returns the month before the first payment for payment 0, across a year end', () => {
    expect(paymentDate('2027-01-15', 0)).toBe('2026-12-15');
    expect(paymentDate('2027-03-31', 0)).toBe('2027-02-28');
  });

  it('clamps to the end of shorter months and goes back to the original day', () => {
    expect(paymentDate('2027-01-31', 2)).toBe('2027-02-28');
    expect(paymentDate('2027-01-31', 3)).toBe('2027-03-31');
    expect(paymentDate('2027-01-31', 4)).toBe('2027-04-30');
  });

  it('handles leap years', () => {
    expect(paymentDate('2028-01-31', 2)).toBe('2028-02-29');
    expect(paymentDate('2028-02-29', 13)).toBe('2029-02-28');
    expect(paymentDate('2028-02-29', 49)).toBe('2032-02-29');
  });

  it('throws on an invalid first payment date', () => {
    expect(() => paymentDate('2027-02-30', 1)).toThrow('Invalid first payment date: 2027-02-30');
  });
});

describe('isIsoDate', () => {
  it('accepts real calendar dates', () => {
    expect(isIsoDate('2026-10-22')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
  });

  it('rejects malformed or impossible dates', () => {
    expect(isIsoDate('2026-2-1')).toBe(false);
    expect(isIsoDate('2027-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('22/10/2026')).toBe(false);
  });
});

describe('daysBetween', () => {
  it('counts calendar days, across months and leap days', () => {
    expect(daysBetween('2025-07-09', '2025-08-18')).toBe(40);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysBetween('2026-11-27', '2026-11-27')).toBe(0);
  });

  it('is negative when the second date comes first', () => {
    expect(daysBetween('2026-11-27', '2026-11-20')).toBe(-7);
  });

  it('throws on an invalid date', () => {
    expect(() => daysBetween('2026-02-30', '2026-03-01')).toThrow('Invalid date: 2026-02-30');
  });

  it('keeps years before 100, which Date.UTC would read as 19xx', () => {
    expect(daysBetween('0020-02-28', '0020-03-01')).toBe(2);
    expect(weekdayOnOrAfter('0020-01-04')).toBe('0020-01-06');
  });
});

describe('weekdayOnOrAfter', () => {
  it('moves Saturday and Sunday to Monday', () => {
    expect(weekdayOnOrAfter('2026-10-17')).toBe('2026-10-19');
    expect(weekdayOnOrAfter('2026-05-17')).toBe('2026-05-18');
  });

  it('keeps a weekday, and crosses month and year ends', () => {
    expect(weekdayOnOrAfter('2026-11-17')).toBe('2026-11-17');
    expect(weekdayOnOrAfter('2027-01-31')).toBe('2027-02-01');
    expect(weekdayOnOrAfter('2033-12-31')).toBe('2034-01-02');
  });
});

describe('days360Between', () => {
  it('counts every month as 30 days', () => {
    expect(days360Between('2027-01-15', '2027-02-15')).toBe(30);
    expect(days360Between('2027-02-15', '2027-03-15')).toBe(30);
    expect(days360Between('2026-12-15', '2027-01-05')).toBe(20);
  });

  it('counts the last day of a month as the 30th, February included', () => {
    expect(days360Between('2027-01-31', '2027-02-28')).toBe(30);
    expect(days360Between('2027-02-28', '2027-03-31')).toBe(30);
    expect(days360Between('2027-02-28', '2027-03-01')).toBe(1);
    expect(days360Between('2028-02-29', '2028-03-15')).toBe(15);
  });

  it('counts a 31st as the 30th', () => {
    expect(days360Between('2027-01-31', '2027-03-01')).toBe(31);
    expect(days360Between('2027-01-30', '2027-01-31')).toBe(0);
  });

  it('is negative when the second date comes first, and throws on an invalid date', () => {
    expect(days360Between('2027-01-25', '2027-01-15')).toBe(-10);
    expect(() => days360Between('2027-01-15', '2027-02-30')).toThrow('Invalid date: 2027-02-30');
  });
});

describe('addDays', () => {
  it('moves forward and back across month and year ends', () => {
    expect(addDays('2027-12-15', -1)).toBe('2027-12-14');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});
