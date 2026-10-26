import { describe, expect, it } from 'vitest';
import type { ExtraPayment, InsuranceInput, LoanInput } from '@/core/types';
import { expectConsistent, run } from './helpers';

const german: LoanInput = {
  amount: 12000,
  termMonths: 12,
  annualRate: 12,
  rateType: 'nominal',
  method: 'german',
};
const french: LoanInput = { ...german, amount: 10000, method: 'french' };

const balanceInsurance: InsuranceInput = { rate: 1.2, unit: 'percentPerYear', base: 'balance' };

function extra(afterPayment: number, amount: number, effect: ExtraPayment['effect']): ExtraPayment {
  return { afterPayment, amount, effect };
}

describe('extra payments, German method', () => {
  it('reduce term: keeps the principal and drops the leftover payments', () => {
    const rows = run({ ...german, extraPayments: [extra(3, 3000, 'reduceTerm')] })
      .withExtraPayments!.schedule.rows;
    expect(rows[2]).toMatchObject({ extraPayment: 3000, balance: 6000 });
    expect(rows).toHaveLength(9);
    expect(rows.slice(3).every((row) => row.principal === 1000)).toBe(true);
    expectConsistent(rows, german.amount);
  });

  it('reduce payment: spreads the new balance over the remaining payments', () => {
    const rows = run({ ...german, extraPayments: [extra(3, 3000, 'reducePayment')] })
      .withExtraPayments!.schedule.rows;
    expect(rows).toHaveLength(12);
    expect(rows.slice(3, -1).every((row) => row.principal === 666.67)).toBe(true);
    expect(rows[11]?.principal).toBe(666.64);
    expectConsistent(rows, german.amount);
  });
});

describe('extra payments, French method', () => {
  it('reduce term: keeps the payment and finishes earlier', () => {
    const rows = run({ ...french, extraPayments: [extra(4, 3000, 'reduceTerm')] })
      .withExtraPayments!.schedule.rows;
    const balance = rows[3]!.balance;
    // n = −ln(1 − S·i / C) / ln(1 + i)
    const remaining = Math.ceil(-Math.log(1 - (balance * 0.01) / 888.49) / Math.log(1.01));
    expect(rows).toHaveLength(4 + remaining);
    expect(rows.slice(0, -1).every((row) => row.payment === 888.49)).toBe(true);
    expect(rows.at(-1)!.payment).toBeLessThanOrEqual(888.49);
    expectConsistent(rows, french.amount);
  });

  it('reduce payment: recomputes the payment over the remaining term', () => {
    const result = run({ ...french, extraPayments: [extra(4, 3000, 'reducePayment')] });
    const rows = result.withExtraPayments!.schedule.rows;
    expect(rows).toHaveLength(12);
    const balance = rows[3]!.balance;
    const payment = Math.round(((balance * 0.01) / (1 - 1.01 ** -8)) * 100) / 100;
    expect(rows[4]?.payment).toBe(payment);
    expect(result.withExtraPayments?.comparison.newPayment).toBe(payment);
    expectConsistent(rows, french.amount);
  });

  it('reduce term with insurance in the payment: keeps the total payment', () => {
    const rows = run({
      ...french,
      insurance: balanceInsurance,
      extraPayments: [extra(4, 3000, 'reduceTerm')],
    }).withExtraPayments!.schedule.rows;
    const payment = rows[0]!.payment;
    const balance = rows[3]!.balance;
    // Same formula, with the interest and insurance rates combined: 0.011 a month.
    const remaining = Math.ceil(-Math.log(1 - (balance * 0.011) / payment) / Math.log(1.011));
    expect(rows).toHaveLength(4 + remaining);
    expect(rows.slice(0, -1).every((row) => row.payment === payment)).toBe(true);
    expectConsistent(rows, french.amount);
  });

  it('reduce payment with insurance in the payment: recomputes it at the combined rate', () => {
    const rows = run({
      ...french,
      insurance: balanceInsurance,
      extraPayments: [extra(4, 3000, 'reducePayment')],
    }).withExtraPayments!.schedule.rows;
    const balance = rows[3]!.balance;
    const payment = Math.round(((balance * 0.011) / (1 - 1.011 ** -8)) * 100) / 100;
    expect(rows.slice(4, -1).every((row) => row.payment === payment)).toBe(true);
    expectConsistent(rows, french.amount);
  });
});

describe('extra payment edge cases', () => {
  it('ends the loan when the extra payment equals the balance', () => {
    const result = run({ ...german, extraPayments: [extra(4, 8000, 'reduceTerm')] });
    expect(result.withExtraPayments!.schedule.rows).toHaveLength(4);
    expect(result.withExtraPayments!.schedule.rows[3]?.balance).toBe(0);
    expect(result.withExtraPayments!.comparison).toMatchObject({
      paymentsSaved: 8,
      newPayment: null,
    });
    expect(result.warnings).toEqual([]);
  });

  it('clips an extra payment larger than the balance and warns', () => {
    const result = run({ ...german, extraPayments: [extra(4, 9000, 'reducePayment')] });
    expect(result.withExtraPayments!.schedule.rows).toHaveLength(4);
    expect(result.withExtraPayments!.schedule.rows[3]?.extraPayment).toBe(8000);
    expect(result.withExtraPayments!.schedule.summary.totalExtraPayments).toBe(8000);
    expect(result.warnings).toEqual([
      { code: 'extraPaymentClipped', index: 0, appliedAmount: 8000 },
    ]);
  });

  it('applies two extra payments after the same payment in order', () => {
    const twice = run({
      ...german,
      extraPayments: [extra(3, 1000, 'reduceTerm'), extra(3, 2000, 'reduceTerm')],
    });
    const once = run({ ...german, extraPayments: [extra(3, 3000, 'reduceTerm')] });
    expect(twice.withExtraPayments!.schedule.rows).toEqual(once.withExtraPayments!.schedule.rows);
  });

  it('applies extra payments in payment order regardless of input order', () => {
    const rows = run({
      ...german,
      extraPayments: [extra(6, 1000, 'reduceTerm'), extra(2, 1000, 'reduceTerm')],
    }).withExtraPayments!.schedule.rows;
    expect(rows[1]?.extraPayment).toBe(1000);
    expect(rows[5]?.extraPayment).toBe(1000);
    expectConsistent(rows, german.amount);
  });

  it('ignores an extra payment due after the loan was paid off, and warns', () => {
    const result = run({
      ...german,
      extraPayments: [extra(2, 10000, 'reduceTerm'), extra(5, 500, 'reduceTerm')],
    });
    expect(result.withExtraPayments!.schedule.rows).toHaveLength(2);
    expect(result.warnings).toEqual([{ code: 'extraPaymentIgnored', index: 1 }]);
  });

  it('ignores an extra payment due after the shortened term ends', () => {
    const result = run({
      ...german,
      extraPayments: [extra(2, 6000, 'reduceTerm'), extra(10, 500, 'reduceTerm')],
    });
    expect(result.withExtraPayments!.schedule.rows).toHaveLength(6);
    expect(result.warnings).toEqual([{ code: 'extraPaymentIgnored', index: 1 }]);
  });

  it('ignores an extra payment due right after the last payment of the shortened term', () => {
    const result = run({
      ...german,
      extraPayments: [extra(2, 6000, 'reduceTerm'), extra(6, 500, 'reduceTerm')],
    });
    expect(result.withExtraPayments!.schedule.rows).toHaveLength(6);
    expect(result.withExtraPayments!.schedule.rows[5]?.extraPayment).toBe(0);
    expect(result.warnings).toEqual([{ code: 'extraPaymentIgnored', index: 1 }]);
  });

  it('charges balance-based insurance on the reduced balance', () => {
    const result = run({
      ...german,
      insurance: balanceInsurance,
      extraPayments: [extra(3, 3000, 'reduceTerm')],
    });
    expect(result.withExtraPayments!.schedule.rows[3]?.insurance).toBe(6);
  });
});

describe('comparison', () => {
  it('has no extra-payment schedule or comparison without extra payments', () => {
    const result = run(german);
    expect(result.withExtraPayments).toBeNull();
  });

  it('reports what the extra payments save', () => {
    const result = run({
      ...german,
      insurance: balanceInsurance,
      extraPayments: [extra(3, 3000, 'reduceTerm')],
    });
    // With the extra payment: 120 + 110 + 100, then 6000 at 1000 a month: 60 + 50 + ... + 10.
    expect(result.withExtraPayments!.schedule.summary.totalInterest).toBe(540);
    expect(result.withExtraPayments!.comparison).toEqual({
      interestSaved: 240,
      insuranceSaved: 24,
      otherChargesSaved: 0,
      totalCostSaved: 264,
      paymentsSaved: 3,
      newPayment: 1066,
    });
  });
});
