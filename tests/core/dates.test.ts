import { describe, expect, it } from 'vitest';
import { isIsoDate, paymentDate } from '@/core/dates';

describe('paymentDate', () => {
  it('returns the first payment date for payment 1', () => {
    expect(paymentDate('2026-11-15', 1)).toBe('2026-11-15');
  });

  it('adds one month per payment', () => {
    expect(paymentDate('2026-11-15', 2)).toBe('2026-12-15');
    expect(paymentDate('2026-11-15', 3)).toBe('2027-01-15');
    expect(paymentDate('2026-11-15', 361)).toBe('2056-11-15');
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
