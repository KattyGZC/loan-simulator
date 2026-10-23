import { describe, expect, it } from 'vitest';
import { effectiveToNominal, monthlyRate, nominalToEffective } from '@/core/rates';

describe('rates', () => {
  it('converts nominal to effective', () => {
    // (1 + 0.156 / 12)^12 - 1
    expect(nominalToEffective(0.156)).toBeCloseTo(0.167652, 6);
    expect(nominalToEffective(0.12)).toBeCloseTo(0.126825, 6);
  });

  it('converts effective to nominal', () => {
    expect(effectiveToNominal(0.126825)).toBeCloseTo(0.12, 6);
  });

  it('round-trips both ways', () => {
    for (const rate of [0, 0.01, 0.0499, 0.156, 0.173, 0.285, 0.6]) {
      expect(effectiveToNominal(nominalToEffective(rate))).toBeCloseTo(rate, 12);
      expect(nominalToEffective(effectiveToNominal(rate))).toBeCloseTo(rate, 12);
    }
  });

  it('derives the monthly rate from the nominal annual rate', () => {
    expect(monthlyRate(0.12)).toBeCloseTo(0.01, 12);
    expect(monthlyRate(0)).toBe(0);
  });
});
