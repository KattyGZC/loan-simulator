import { describe, expect, it } from 'vitest';
import { buildScheduleWithExtraPayment } from '@/core/amortization';
import { loanCalendar } from '@/core/calendar';
import { addDays } from '@/core/dates';
import { simulateExistingLoan } from '@/core/existing-loan';
import { roundMoney } from '@/core/money';
import type { ExistingLoanInput, ExtraPayment } from '@/core/types';
import { balanceInsurance, expectConsistent, french, german, run, runExisting } from './helpers';

// The French loan of the helpers ($10,000, 12 months, 1 % a month, $888.49) after 4 payments,
// due on the 15th: 8 payments left, the next one on 2027-05-15.
const newFrench = run({ ...french, firstPaymentDate: '2027-01-15' }).schedule;
const balanceAfter4 = newFrench.rows[3]!.balance;

function extra(date: string, amount: number, effect: ExtraPayment['effect']): ExtraPayment {
  return { date, amount, effect };
}

const frenchLoan: ExistingLoanInput = {
  balance: balanceAfter4,
  remainingPayments: 8,
  annualRate: 12,
  rateType: 'nominal',
  method: 'french',
  currentPayment: 888.49,
  nextPaymentDate: '2027-05-15',
  extraPayment: extra('2027-04-25', 2000, 'reducePayment'),
};

// The German loan of the helpers ($12,000, $1,000 a month) after 3 payments.
const germanLoan: ExistingLoanInput = {
  balance: 9000,
  remainingPayments: 9,
  annualRate: 12,
  rateType: 'nominal',
  method: 'german',
  nextPaymentDate: '2027-04-15',
  extraPayment: extra('2027-03-15', 3000, 'reduceTerm'),
};

/** A day of interest at 12 % / 360 on `balance`, rounded to cents, times `days`. */
function accrued(balance: number, days: number): number {
  return roundMoney(roundMoney((balance * 0.12) / 360) * days);
}

describe('a loan already running, without the extra payment', () => {
  it('continues the schedule of the same loan simulated new', () => {
    const { rows } = runExisting(frenchLoan).withoutExtraPayment;
    const expected = newFrench.rows.slice(4).map((row, index) => ({ ...row, number: index + 1 }));
    expect(rows).toEqual(expected);
  });

  it('continues a German loan on actual days, weekend due dates moved', () => {
    const newLoan = run({
      ...german,
      dayCount: 'actual360',
      disbursementDate: '2026-12-10',
      firstPaymentDate: '2027-01-15',
    }).schedule;
    const { rows } = runExisting({
      ...germanLoan,
      balance: newLoan.rows[2]!.balance,
      dayCount: 'actual360',
    }).withoutExtraPayment;
    const expected = newLoan.rows.slice(3).map((row, index) => ({ ...row, number: index + 1 }));
    expect(rows).toEqual(expected);
  });

  it('warns when the current payment ends the loan before the remaining payments', () => {
    const result = runExisting({ ...frenchLoan, currentPayment: 1200 });
    const { rows } = result.withoutExtraPayment;
    expect(rows.length).toBeLessThan(8);
    expect(result.warnings).toEqual([
      {
        code: 'paymentDoesNotFitTerm',
        paymentCount: rows.length,
        lastPayment: rows.at(-1)!.payment,
      },
    ]);
  });

  it('warns when the current payment leaves a large last payment, and keeps the term', () => {
    const result = runExisting({ ...frenchLoan, currentPayment: 800 });
    const { rows } = result.withoutExtraPayment;
    expect(rows).toHaveLength(8);
    expect(rows.slice(0, -1).every((row) => row.payment === 800)).toBe(true);
    expect(result.warnings).toEqual([
      { code: 'paymentDoesNotFitTerm', paymentCount: 8, lastPayment: rows.at(-1)!.payment },
    ]);
  });

  it('takes a payment a few cents off as the lender rounding it', () => {
    expect(runExisting({ ...frenchLoan, currentPayment: 888.5 }).warnings).toEqual([]);
  });
});

describe('the extra payment', () => {
  it('pays the interest accrued since the previous due date first, on 30/360 days', () => {
    const result = runExisting(frenchLoan);
    // 2027-04-15 to 2027-04-25: 10 days.
    const interest = accrued(balanceAfter4, 10);
    const principal = roundMoney(2000 - interest);
    expect(result.extraPayment).toEqual({
      date: '2027-04-25',
      paymentNumber: 1,
      amount: 2000,
      accruedInterest: interest,
      principal,
      balance: roundMoney(balanceAfter4 - principal),
      duePrincipal: 0,
    });
  });

  it('covers the principal of the payment it falls before, which then charges only interest', () => {
    const { extraPayment, withExtraPayment } = runExisting(frenchLoan);
    const first = withExtraPayment.rows[0]!;
    // The remaining 20 days of the period, on the balance after the extra payment.
    const interestAfter = roundMoney((extraPayment.balance * 0.12 * 20) / 360);
    expect(first).toMatchObject({
      date: '2027-05-15',
      principal: extraPayment.principal,
      interest: roundMoney(extraPayment.accruedInterest + interestAfter),
      balance: extraPayment.balance,
    });
    expectConsistent(withExtraPayment.rows, balanceAfter4);
  });

  it('accrues nothing when it is paid on the previous due date', () => {
    const { extraPayment } = runExisting({
      ...frenchLoan,
      extraPayment: extra('2027-04-15', 2000, 'reducePayment'),
    });
    expect(extraPayment).toMatchObject({ accruedInterest: 0, principal: 2000 });
  });

  it('leaves the payments before its period as they were', () => {
    const result = runExisting({
      ...frenchLoan,
      extraPayment: extra('2027-06-01', 2000, 'reducePayment'),
    });
    expect(result.extraPayment.paymentNumber).toBe(2);
    expect(result.withExtraPayment.rows[0]).toEqual(result.withoutExtraPayment.rows[0]);
    // 2027-05-15 to 2027-06-01: 16 days on 30/360.
    const balance = result.withoutExtraPayment.rows[0]!.balance;
    expect(result.extraPayment.accruedInterest).toBe(accrued(balance, 16));
    expectConsistent(result.withExtraPayment.rows, balanceAfter4);
  });

  it('reduce payment, French: a new payment over the payments after its own', () => {
    const { extraPayment, withExtraPayment, comparison } = runExisting(frenchLoan);
    const { rows } = withExtraPayment;
    const newPayment = roundMoney((extraPayment.balance * 0.01) / (1 - 1.01 ** -7));
    expect(rows).toHaveLength(8);
    expect(rows.slice(1, -1).every((row) => row.payment === newPayment)).toBe(true);
    expect(Math.abs(rows.at(-1)!.payment - newPayment)).toBeLessThan(0.05);
    expect(comparison).toMatchObject({ paymentsSaved: 0, newPayment });
    expect(comparison.interestSaved).toBeGreaterThan(0);
  });

  it('reduce term, French: keeps the payment and finishes earlier', () => {
    const { withExtraPayment, comparison } = runExisting({
      ...frenchLoan,
      extraPayment: extra('2027-04-25', 2000, 'reduceTerm'),
    });
    const { rows } = withExtraPayment;
    expect(rows.slice(1, -1).every((row) => row.payment === 888.49)).toBe(true);
    expect(comparison.paymentsSaved).toBe(8 - rows.length);
    expect(comparison.paymentsSaved).toBeGreaterThan(0);
    expectConsistent(rows, balanceAfter4);
  });

  it('reduce term, German: keeps the principal and drops the payments left over', () => {
    const { withExtraPayment, comparison } = runExisting(germanLoan);
    const { rows } = withExtraPayment;
    // Paid on the previous due date: 3,000 covers payment 1 and two more payments of principal.
    expect(rows[0]).toMatchObject({ principal: 3000, balance: 6000 });
    expect(rows).toHaveLength(7);
    expect(rows.slice(1).every((row) => row.principal === 1000)).toBe(true);
    expect(comparison.paymentsSaved).toBe(2);
    expectConsistent(rows, 9000);
  });

  it('reduce payment, German: spreads the balance over the payments after its own', () => {
    const { withExtraPayment } = runExisting({
      ...germanLoan,
      extraPayment: extra('2027-03-15', 3000, 'reducePayment'),
    });
    const { rows } = withExtraPayment;
    expect(rows).toHaveLength(9);
    expect(rows.slice(1).every((row) => row.principal === 750)).toBe(true);
  });

  it('in the last period, the last payment takes the balance left', () => {
    const result = runExisting({
      ...germanLoan,
      extraPayment: extra('2027-12-01', 300, 'reduceTerm'),
    });
    const rows = result.withExtraPayment.rows;
    expect(result.extraPayment.paymentNumber).toBe(9);
    expect(rows).toHaveLength(9);
    expect(rows.at(-1)).toMatchObject({ principal: 1000, balance: 0 });
    expectConsistent(rows, 9000);
  });

  it('pays the loan off when it covers the balance, and stops the schedule on its date', () => {
    const interest = accrued(9000, 10);
    const result = runExisting({
      ...germanLoan,
      extraPayment: extra('2027-03-25', roundMoney(9000 + interest), 'reduceTerm'),
    });
    expect(result.warnings).toEqual([]);
    expect(result.withExtraPayment.rows).toEqual([
      {
        number: 1,
        date: '2027-03-25',
        payment: roundMoney(9000 + interest),
        principal: 9000,
        interest,
        insurance: 0,
        otherCharges: 0,
        balance: 0,
      },
    ]);
    expect(result.comparison).toMatchObject({ paymentsSaved: 8, newPayment: null });
  });

  it('applies only what the loan owes when it is more, with a warning', () => {
    const interest = accrued(9000, 10);
    const result = runExisting({
      ...germanLoan,
      extraPayment: extra('2027-03-25', 20000, 'reduceTerm'),
    });
    const appliedAmount = roundMoney(9000 + interest);
    expect(result.extraPayment.amount).toBe(appliedAmount);
    expect(result.warnings).toEqual([{ code: 'extraPaymentClipped', appliedAmount }]);
  });

  it('charges the insurance of its period on the balance before it', () => {
    const { withExtraPayment, withoutExtraPayment } = runExisting({
      ...frenchLoan,
      insurance: { rate: balanceInsurance.rate, unit: balanceInsurance.unit },
    });
    const insurance = roundMoney(balanceAfter4 * 0.001);
    expect(withExtraPayment.rows[0]?.insurance).toBe(insurance);
    expect(withoutExtraPayment.rows[0]?.insurance).toBe(insurance);
    expectConsistent(withExtraPayment.rows, balanceAfter4);
  });

  it('reschedules a French loan on actual days over the real periods', () => {
    const actual = { ...frenchLoan, dayCount: 'actual360' } as const;
    const reducePayment = runExisting(actual).withExtraPayment.rows;
    const newPayment = reducePayment[1]!.payment;
    expect(Math.abs(reducePayment.at(-1)!.payment - newPayment)).toBeLessThan(1);
    expectConsistent(reducePayment, balanceAfter4);

    const reduceTerm = runExisting({
      ...actual,
      extraPayment: extra('2027-04-25', 2000, 'reduceTerm'),
    }).withExtraPayment.rows;
    expect(reduceTerm.length).toBeLessThan(8);
    expectConsistent(reduceTerm, balanceAfter4);
  });

  it('counts actual days from the previous due date, moved off the weekend', () => {
    // The 17th of January 2026 is a Saturday: the payment before 2026-02-17 fell on the 19th.
    const result = runExisting({
      ...germanLoan,
      dayCount: 'actual360',
      nextPaymentDate: '2026-02-17',
      extraPayment: extra('2026-01-26', 3000, 'reduceTerm'),
    });
    expect(result.extraPayment.accruedInterest).toBe(accrued(9000, 7));
  });
});

describe('an extra payment smaller than the principal of its payment', () => {
  // 9,000 at 1,000 of principal a month: $400 on 2027-03-25 covers only part of payment 1's.
  const small = (effect: ExtraPayment['effect']) =>
    runExisting({ ...germanLoan, extraPayment: extra('2027-03-25', 400, effect) });

  it('leaves the rest of that principal to the due date, and nothing to reschedule', () => {
    const { extraPayment, withExtraPayment, withoutExtraPayment } = small('reduceTerm');
    const [first] = withExtraPayment.rows;
    expect(first).toMatchObject({ principal: 1000, balance: 8000 });
    expect(extraPayment.principal).toBe(roundMoney(400 - accrued(9000, 10)));
    expect(extraPayment.duePrincipal).toBe(roundMoney(1000 - extraPayment.principal));
    expect(withExtraPayment.rows.slice(1)).toEqual(withoutExtraPayment.rows.slice(1));
  });

  it.each(['reduceTerm', 'reducePayment'] as const)(
    'never costs more than no extra payment (%s, German and French)',
    (effect) => {
      const german = small(effect).comparison;
      const french = runExisting({
        ...frenchLoan,
        extraPayment: extra('2027-04-25', 300, effect),
      }).comparison;
      for (const comparison of [german, french]) {
        expect(comparison.interestSaved).toBeGreaterThanOrEqual(0);
        expect(comparison.paymentsSaved).toBe(0);
      }
    },
  );
});

describe('30/360 with due dates at the end of the month', () => {
  // Due on the 31st: periods end on 2027-01-31, 2027-02-28 and 2027-03-31.
  const monthEnd: ExistingLoanInput = {
    ...germanLoan,
    nextPaymentDate: '2027-01-31',
    extraPayment: extra('2027-03-15', 900, 'reduceTerm'),
  };

  it('counts 30 days in every period, February included', () => {
    const result = runExisting(monthEnd);
    // 2027-02-28 counts as the 30th: 15 days to 2027-03-15 and 15 after it.
    const balance = result.withoutExtraPayment.rows[1]!.balance;
    const interest = accrued(balance, 15);
    expect(result.extraPayment).toMatchObject({ paymentNumber: 3, accruedInterest: interest });
    const after = roundMoney((result.extraPayment.balance * 0.12 * 15) / 360);
    expect(result.withExtraPayment.rows[2]?.interest).toBe(roundMoney(interest + after));
    expect(result.comparison.interestSaved).toBeGreaterThan(0);
  });

  it('accrues nothing on a February due date', () => {
    const result = runExisting({
      ...monthEnd,
      extraPayment: extra('2027-02-28', 900, 'reduceTerm'),
    });
    expect(result.extraPayment).toMatchObject({ paymentNumber: 3, accruedInterest: 0 });
  });
});

describe('buildScheduleWithExtraPayment', () => {
  it('refuses an extra payment after the loan is repaid, which the caller rules out first', () => {
    const params = {
      amount: 100,
      termMonths: 1,
      method: 'german',
      calendar: loanCalendar(german, 0.12),
      insurance: { monthlyRate: 0, base: 'balance', onTopOfInstallment: false },
      otherCharges: 0,
    } as const;
    const late = {
      date: '2027-03-01',
      amount: 10,
      effect: 'reduceTerm',
      paymentNumber: 3,
      accruedInterest: 0,
      remainingDays: 0,
    } as const;
    expect(() => buildScheduleWithExtraPayment(params, late)).toThrow(
      'The loan is repaid before payment 3.',
    );
  });
});

describe('simulateExistingLoan errors', () => {
  it('returns the field errors of validateExistingLoan first', () => {
    expect(simulateExistingLoan({ ...frenchLoan, balance: 0 })).toEqual({
      ok: false,
      errors: [{ field: 'balance', code: 'mustBePositive' }],
    });
  });

  it('needs a French payment above a month of interest and inside insurance', () => {
    const insured = { ...frenchLoan, insurance: { rate: 1.2, unit: 'percentPerYear' } } as const;
    const min = roundMoney(balanceAfter4 * (0.01 + 0.001));
    expect(simulateExistingLoan({ ...insured, currentPayment: min })).toEqual({
      ok: false,
      errors: [{ field: 'currentPayment', code: 'tooSmall', params: { min } }],
    });
    const onTop = { ...insured, insurance: { ...insured.insurance, onTopOfInstallment: true } };
    expect(simulateExistingLoan({ ...onTop, currentPayment: min }).ok).toBe(true);
  });

  it('needs the extra payment to be more than the interest it pays first', () => {
    const min = accrued(balanceAfter4, 10);
    expect(
      simulateExistingLoan({ ...frenchLoan, extraPayment: extra('2027-04-25', min, 'reduceTerm') }),
    ).toEqual({
      ok: false,
      errors: [{ field: 'extraPayment.amount', code: 'tooSmall', params: { min } }],
    });
  });

  it.each(['2027-04-14', '2027-12-15'])(
    'rejects an extra payment on %s, outside the loan',
    (date) => {
      expect(
        simulateExistingLoan({ ...frenchLoan, extraPayment: extra(date, 2000, 'reduceTerm') }),
      ).toEqual({
        ok: false,
        errors: [
          {
            field: 'extraPayment.date',
            code: 'dateOutOfRange',
            params: { min: '2027-04-15', max: '2027-12-14' },
          },
        ],
      });
    },
  );

  it('ends the range at the last payment the current payment actually reaches', () => {
    const shorter = { ...frenchLoan, currentPayment: 1200 };
    const lastDueDate = runExisting(shorter).withoutExtraPayment.rows.at(-1)!.date!;
    const result = simulateExistingLoan({
      ...shorter,
      extraPayment: extra(lastDueDate, 100, 'reduceTerm'),
    });
    expect(result).toMatchObject({
      ok: false,
      errors: [{ code: 'dateOutOfRange', params: { max: addDays(lastDueDate, -1) } }],
    });
  });
});
