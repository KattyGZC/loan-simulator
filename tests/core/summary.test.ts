import { describe, expect, it } from 'vitest';
import { compare, summarize, summarizePayments } from '@/core/summary';
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
  const { rows } = run({
    amount: 1000,
    termMonths: 6,
    annualRate: 10,
    rateType: 'nominal',
    method: 'french',
  }).schedule;
  const schedule = { rows, summary: summarizePayments(rows) };

  it('reports no savings for the same schedule, and the payment after the extra one', () => {
    expect(compare(schedule, schedule, { paymentNumber: 2, duePrincipal: 0 })).toEqual({
      interestSaved: 0,
      insuranceSaved: 0,
      otherChargesSaved: 0,
      totalCostSaved: 0,
      paymentsSaved: 0,
      newPayment: rows[2]!.payment,
    });
  });

  it('has no new payment when the extra payment was in the last one', () => {
    const last = { paymentNumber: rows.length, duePrincipal: 0 };
    expect(compare(schedule, schedule, last).newPayment).toBeNull();
  });

  it('has no new payment when the extra payment rescheduled nothing', () => {
    const small = { paymentNumber: 2, duePrincipal: 50 };
    expect(compare(schedule, schedule, small).newPayment).toBeNull();
  });
});
