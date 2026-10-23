import { describe, expect, it } from 'vitest';
import type { InsuranceInput, LoanInput } from '@/core/types';
import { expectConsistent, run, sum } from './helpers';

const french: LoanInput = {
  amount: 10000,
  termMonths: 12,
  annualRate: 12,
  rateType: 'nominal',
  method: 'french',
};

const german: LoanInput = { ...french, amount: 12000, method: 'german' };

const balanceInsurance: InsuranceInput = { rate: 1.2, unit: 'percentPerYear', base: 'balance' };

describe('French method', () => {
  it('uses a fixed payment from the annuity formula', () => {
    const { rows } = run(french).base;
    expect(rows).toHaveLength(12);
    // 10000 × 0.01 / (1 − 1.01^−12) = 888.4878...
    expect(rows.slice(0, -1).every((row) => row.payment === 888.49)).toBe(true);
    expect(rows[0]).toMatchObject({
      number: 1,
      interest: 100,
      principal: 788.49,
      balance: 9211.51,
    });
    expect(rows[1]).toMatchObject({ interest: 92.12, principal: 796.37, balance: 8415.14 });
  });

  it('adjusts the last payment so the balance ends at 0', () => {
    const { rows } = run(french).base;
    expectConsistent(rows, french.amount);
    expect(Math.abs(rows.at(-1)!.payment - 888.49)).toBeLessThan(0.1);
    expect(sum(rows, 'principal')).toBe(10000);
  });

  it('splits the amount evenly at 0 %', () => {
    const { rows } = run({ ...french, annualRate: 0, amount: 1000, termMonths: 3 }).base;
    expect(rows.map((row) => row.payment)).toEqual([333.33, 333.33, 333.34]);
    expect(sum(rows, 'interest')).toBe(0);
  });

  it('handles a single payment', () => {
    const { rows } = run({ ...french, termMonths: 1 }).base;
    expect(rows).toEqual([
      expect.objectContaining({ principal: 10000, interest: 100, payment: 10100, balance: 0 }),
    ]);
  });

  it('stays consistent over 360 payments', () => {
    const input = { ...french, amount: 85000, termMonths: 360, annualRate: 9.33 };
    const { rows } = run(input).base;
    expect(rows).toHaveLength(360);
    expectConsistent(rows, input.amount);
  });
});

describe('German method', () => {
  it('uses fixed principal and a decreasing payment', () => {
    const { rows } = run(german).base;
    expect(rows).toHaveLength(12);
    expect(rows.every((row) => row.principal === 1000)).toBe(true);
    expect(rows[0]).toMatchObject({ interest: 120, payment: 1120, balance: 11000 });
    expect(rows[11]).toMatchObject({ interest: 10, payment: 1010, balance: 0 });
    expect(sum(rows, 'interest')).toBe(780);
  });

  it('puts the rounding remainder in the last principal', () => {
    const { rows } = run({ ...german, amount: 1000, termMonths: 3 }).base;
    expect(rows.map((row) => row.principal)).toEqual([333.33, 333.33, 333.34]);
    expectConsistent(rows, 1000);
  });
});

describe('rates', () => {
  it('derives the nominal rate from an effective rate', () => {
    const result = run({ ...french, annualRate: 12.682503, rateType: 'effective' });
    expect(result.base.summary.nominalRate).toBeCloseTo(12, 5);
    expect(result.base.rows[0]?.payment).toBe(888.49);
  });

  it('reports both rates', () => {
    const { summary } = run(french).base;
    expect(summary.nominalRate).toBe(12);
    expect(summary.effectiveRate).toBeCloseTo(12.682503, 6);
  });
});

describe('credit life insurance', () => {
  // 1.2 % per year = 0.1 % per month = 1 ‰ per month = 0.001 per month.
  const units = [
    { rate: 1.2, unit: 'percentPerYear' },
    { rate: 0.1, unit: 'percentPerMonth' },
    { rate: 1, unit: 'perMillePerMonth' },
  ] as const;

  it.each(units)('charges $unit on the balance at the start of each month', ({ rate, unit }) => {
    const { rows, summary } = run({ ...german, insurance: { rate, unit, base: 'balance' } }).base;
    expect(rows[0]).toMatchObject({ insurance: 12, payment: 1132 });
    expect(rows[11]).toMatchObject({ insurance: 1, payment: 1011 });
    expect(summary.totalInsurance).toBe(78);
  });

  it.each(units)('charges $unit on the original amount', ({ rate, unit }) => {
    const insurance = { rate, unit, base: 'originalAmount' } as const;
    const { rows, summary } = run({ ...german, insurance }).base;
    expect(rows.every((row) => row.insurance === 12)).toBe(true);
    expect(summary.totalInsurance).toBe(144);
  });

  it('includes balance-based insurance in the fixed French payment by default', () => {
    const { rows } = run({ ...french, insurance: balanceInsurance }).base;
    // The payment uses the interest rate plus the insurance rate: 0.01 + 0.001 a month.
    const payment = Math.round(((10000 * 0.011) / (1 - 1.011 ** -12)) * 100) / 100;
    expect(rows.slice(0, -1).every((row) => row.payment === payment)).toBe(true);
    expect(rows[0]).toMatchObject({
      interest: 100,
      insurance: 10,
      principal: Math.round((payment - 110) * 100) / 100,
    });
    expectConsistent(rows, french.amount);
  });

  it('includes original-amount insurance in the fixed French payment by default', () => {
    const insurance = { ...balanceInsurance, base: 'originalAmount' } as const;
    const { rows } = run({ ...french, insurance }).base;
    expect(rows.slice(0, -1).every((row) => row.payment === 898.49)).toBe(true);
    expect(rows[0]).toMatchObject({ principal: 788.49, interest: 100, insurance: 10 });
    expectConsistent(rows, french.amount);
  });

  it('adds insurance on top of the French payment when asked', () => {
    const insurance = { ...balanceInsurance, onTopOfInstallment: true };
    const { rows } = run({ ...french, insurance }).base;
    expect(rows[0]).toMatchObject({
      principal: 788.49,
      interest: 100,
      insurance: 10,
      payment: 898.49,
    });
    expect(rows[1]).toMatchObject({ principal: 796.37, insurance: 9.21, payment: 897.7 });
    expectConsistent(rows, french.amount);
  });
});

describe('other charges, SOLCA and totals', () => {
  it('adds other charges to every payment', () => {
    const { rows, summary } = run({ ...german, otherCharges: 2.5 }).base;
    expect(rows.every((row) => row.otherCharges === 2.5)).toBe(true);
    expect(rows[0]?.payment).toBe(1122.5);
    expect(summary.totalOtherCharges).toBe(30);
  });

  it('deducts SOLCA once from the amount received', () => {
    const { summary } = run({ ...german, solcaPercent: 0.5 }).base;
    expect(summary.solca).toBe(60);
    expect(summary.amountReceived).toBe(11940);
  });

  it('skips SOLCA when it is not given', () => {
    const { summary } = run(german).base;
    expect(summary.solca).toBe(0);
    expect(summary.amountReceived).toBe(12000);
  });

  it('adds up the totals', () => {
    const input = { ...german, insurance: balanceInsurance, otherCharges: 2.5, solcaPercent: 0.5 };
    expect(run(input).base.summary).toMatchObject({
      paymentCount: 12,
      firstPayment: 1134.5,
      lastPayment: 1013.5,
      totalInterest: 780,
      totalInsurance: 78,
      totalOtherCharges: 30,
      totalExtraPayments: 0,
      solca: 60,
      totalPaid: 12888,
      totalCost: 948,
    });
  });
});

describe('dates', () => {
  it('dates every payment from the first payment date', () => {
    const { rows } = run({ ...german, firstPaymentDate: '2027-01-31' }).base;
    expect(rows.slice(0, 3).map((row) => row.date)).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
    ]);
    expect(rows[11]?.date).toBe('2027-12-31');
  });

  it('leaves dates empty without a first payment date', () => {
    expect(run(german).base.rows[0]?.date).toBeNull();
  });
});
