import { describe, expect, it } from 'vitest';
import { compare, summarize } from '@/core/summary';
import { run } from './helpers';

describe('summarize', () => {
  it('returns zero payments for an empty schedule', () => {
    const loan = { amount: 1000, solca: 5, nominalRate: 12, effectiveRate: 12.68 };
    expect(summarize([], loan)).toMatchObject({
      paymentCount: 0,
      firstPayment: 0,
      lastPayment: 0,
      amountReceived: 995,
      totalCost: 5,
    });
  });
});

describe('compare', () => {
  it('reports no savings and no new payment for the same schedule', () => {
    const { base } = run({
      amount: 1000,
      termMonths: 6,
      annualRate: 10,
      rateType: 'nominal',
      method: 'french',
    });
    expect(compare(base, base)).toEqual({
      interestSaved: 0,
      insuranceSaved: 0,
      otherChargesSaved: 0,
      totalCostSaved: 0,
      paymentsSaved: 0,
      newPayment: null,
    });
  });
});
