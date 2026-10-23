import { describe, expect, it } from 'vitest';
import { roundMoney } from '@/core/money';

describe('roundMoney', () => {
  it('rounds to 2 decimals', () => {
    expect(roundMoney(12.344)).toBe(12.34);
    expect(roundMoney(12.346)).toBe(12.35);
    expect(roundMoney(100)).toBe(100);
  });

  it('rounds exact halves up, even when the float is stored just below', () => {
    // 1.005 is stored as 1.00499999999999989..., naive Math.round(x * 100) gives 1.00.
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(0.005)).toBe(0.01);
    expect(roundMoney(2.675)).toBe(2.68);
    expect(roundMoney(1234.565)).toBe(1234.57);
  });

  it('rounds negative halves away from zero', () => {
    expect(roundMoney(-1.005)).toBe(-1.01);
    expect(roundMoney(-0.004)).toBe(-0);
  });

  it('keeps sums of rounded values exact to the cent', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});
