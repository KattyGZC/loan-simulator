import { describe, expect, it } from 'vitest';
import { loanCalendar } from '@/core/calendar';
import { roundMoney } from '@/core/money';
import { total } from '@/core/summary';
import type { LoanInput } from '@/core/types';
import { balanceInsurance, expectConsistent, french, german, run } from './helpers';

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
    expect(total(rows, 'principal')).toBe(10000);
  });

  it('splits the amount evenly at 0 %', () => {
    const { rows } = run({ ...french, annualRate: 0, amount: 1000, termMonths: 3 }).base;
    expect(rows.map((row) => row.payment)).toEqual([333.33, 333.33, 333.34]);
    expect(total(rows, 'interest')).toBe(0);
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
    expect(total(rows, 'interest')).toBe(780);
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

describe('actual days / 360', () => {
  const actual: LoanInput = {
    ...german,
    dayCount: 'actual360',
    disbursementDate: '2026-10-20',
    firstPaymentDate: '2026-11-17',
  };

  it('charges the days of each period over 360', () => {
    const { rows } = run(actual).base;
    // 28 days from the disbursement, 30 to Dec 17, and 32 to Jan 18 (Jan 17 is a Sunday).
    expect(rows.slice(0, 3).map((row) => row.interest)).toEqual([
      roundMoney((12000 * 0.12 * 28) / 360),
      roundMoney((11000 * 0.12 * 30) / 360),
      roundMoney((10000 * 0.12 * 32) / 360),
    ]);
  });

  it('moves weekend due dates to Monday, and counts the next period from the moved date', () => {
    const { rows } = run(actual).base;
    // 2027-01-17 is a Sunday; 2027-02-17 is a Wednesday.
    expect(rows[2]?.date).toBe('2027-01-18');
    expect(rows[3]?.date).toBe('2027-02-17');
    expect(rows[3]?.interest).toBe(roundMoney((9000 * 0.12 * 30) / 360));
  });

  it('fixes the French payment over the real periods, so the last one is not a balloon', () => {
    const long: LoanInput = {
      ...actual,
      method: 'french',
      amount: 100000,
      termMonths: 240,
      annualRate: 10,
    };
    const { rows } = run(long).base;
    const regular = rows[0]!.payment;
    // From the monthly rate alone, the last payment of this loan was 8,571.28.
    expect(Math.abs(rows.at(-1)!.payment - regular)).toBeLessThan(regular * 0.01);
    expect(rows.slice(1, -1).every((row) => row.payment === regular)).toBe(true);
    expect(rows.every((row) => row.principal > 0)).toBe(true);
    expectConsistent(rows, 100000);
  });

  it('adds to the balance a long period whose interest exceeds the payment', () => {
    const thirtyYears: LoanInput = {
      ...actual,
      method: 'french',
      amount: 100000,
      termMonths: 360,
      annualRate: 9.5,
    };
    const { rows } = run(thirtyYears).base;
    // A Saturday due date moved to Monday, after a 31-day month, makes a 33-day period whose
    // interest is more than the fixed payment: principal is negative that month, and the loan
    // still ends at 0.
    expect(rows.some((row) => row.principal < 0)).toBe(true);
    expectConsistent(rows, 100000);
  });

  it('reschedules a French loan over the real periods after an extra payment', () => {
    const base: LoanInput = { ...actual, method: 'french', amount: 10000 };
    const reducePayment = run({
      ...base,
      extraPayments: [{ afterPayment: 3, amount: 3000, effect: 'reducePayment' }],
    }).withExtraPayments!.schedule.rows;
    const newPayment = reducePayment[3]!.payment;
    expect(Math.abs(reducePayment.at(-1)!.payment - newPayment)).toBeLessThan(1);
    expectConsistent(reducePayment, 10000);

    const reduceTerm = run({
      ...base,
      extraPayments: [{ afterPayment: 3, amount: 3000, effect: 'reduceTerm' }],
    }).withExtraPayments!.schedule.rows;
    expect(reduceTerm.length).toBeLessThan(12);
    expectConsistent(reduceTerm, 10000);
  });

  it('keeps the term when an extra payment cannot shorten it', () => {
    const rows = run({
      ...actual,
      method: 'french',
      amount: 10000,
      extraPayments: [{ afterPayment: 11, amount: 1, effect: 'reduceTerm' }],
    }).withExtraPayments!.schedule.rows;
    expect(rows).toHaveLength(12);
  });

  it('leaves 30/360 dates where they fall', () => {
    const { rows } = run({ ...german, firstPaymentDate: '2026-10-17' }).base;
    expect(rows[0]?.date).toBe('2026-10-17');
  });
});

describe('loanCalendar', () => {
  it('refuses actual days without both dates, which validate() reports first', () => {
    expect(() => loanCalendar({ ...german, dayCount: 'actual360' }, 0.12)).toThrow(
      'actual360 needs the first payment and disbursement dates.',
    );
  });
});
