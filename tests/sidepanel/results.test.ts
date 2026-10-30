import { beforeEach, describe, expect, it } from 'vitest';
import { simulate, type LoanInput, type Schedule } from '@/core';
import {
  defaultExistingLoanForm,
  simulateExistingLoanForm,
  type ExistingLoanForm,
} from '@/entrypoints/sidepanel/existing-form';
import {
  appliedExtraPaymentLines,
  appliedExtraPaymentNote,
  comparisonLines,
  savingsLines,
  scheduleColumns,
  summaryLines,
  warningTexts,
} from '@/entrypoints/sidepanel/results';
import { createFormat } from '@/i18n/format';
import { useLocale } from '../i18n/fake-i18n';

const format = createFormat('en-US', 'USD');

const LOAN: LoanInput = {
  amount: 10000,
  termMonths: 12,
  annualRate: 15.6,
  rateType: 'nominal',
  method: 'french',
};

function schedule(input: Partial<LoanInput> = {}): Schedule {
  const result = simulate({ ...LOAN, ...input });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.schedule;
}

/** The Produbanco loan after payment 4, with an extra payment made on 2025-11-24. */
function extraPayment(overrides: Partial<ExistingLoanForm> = {}) {
  const result = simulateExistingLoanForm(
    {
      ...defaultExistingLoanForm('2025-11-24'),
      balance: '5843.78',
      remainingPayments: '32',
      annualRate: '15.6',
      method: 'german',
      nextPaymentDate: '2025-12-17',
      dayCount: 'actual360',
      extraPaymentAmount: '2700',
      extraPaymentEffect: 'reducePayment',
      ...overrides,
    },
    'en-US',
  );
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
}

const labels = (items: readonly { label: string }[]) => items.map(({ label }) => label);

beforeEach(() => useLocale('en'));

describe('scheduleColumns', () => {
  it('has payment, principal, interest and balance for a loan without dates or charges', () => {
    const columns = scheduleColumns(schedule(), format);
    expect(columns.map((column) => column.label)).toEqual([
      'Payment',
      'Principal',
      'Interest',
      'Balance',
    ]);
    const firstRow = schedule().rows[0]!;
    expect(columns.map((column) => column.cell(firstRow))).toEqual([
      '$905.42',
      '$775.42',
      '$130.00',
      '$9,224.58',
    ]);
  });

  it('adds the date, insurance and other charges when the loan has them', () => {
    const withAll = schedule({
      firstPaymentDate: '2027-01-31',
      insurance: { rate: 0.5, unit: 'percentPerYear', base: 'balance' },
      otherCharges: 2,
    });
    const columns = scheduleColumns(withAll, format);
    expect(columns.map((column) => column.label)).toEqual([
      'Date',
      'Payment',
      'Principal',
      'Interest',
      'Insurance',
      'Other',
      'Balance',
    ]);
    expect(columns[0]!.cell(withAll.rows[0]!)).toBe('01/31/2027');
  });

  it('leaves the date cell empty on a row without a date', () => {
    const [dateColumn] = scheduleColumns(schedule({ firstPaymentDate: '2027-01-31' }), format);
    expect(dateColumn!.cell({ ...schedule().rows[0]!, date: null })).toBe('');
  });
});

describe('summaryLines', () => {
  it('shows one payment when it is fixed, and leaves out the charges the loan does not have', () => {
    const { summary } = schedule();
    expect(labels(summaryLines(summary, true, format))).toEqual([
      'Monthly payment',
      'Payments',
      'Amount received',
      'Total interest',
      'Total cost',
      'Total paid',
      'Nominal rate',
      'Effective rate',
    ]);
    expect(summaryLines(summary, true, format)[0]).toEqual({
      label: 'Monthly payment',
      value: '$905.42',
    });
  });

  it('shows the first and last payment, insurance, other charges and SOLCA when they apply', () => {
    const { summary } = schedule({
      method: 'german',
      insurance: { rate: 0.5, unit: 'percentPerYear', base: 'balance' },
      otherCharges: 2,
      solcaPercent: 0.5,
    });
    expect(labels(summaryLines(summary, false, format))).toEqual([
      'First payment',
      'Last payment',
      'Payments',
      'Amount received',
      'Total interest',
      'Total insurance',
      'Total other charges',
      'SOLCA',
      'Total cost',
      'Total paid',
      'Nominal rate',
      'Effective rate',
    ]);
  });
});

describe('appliedExtraPaymentLines', () => {
  it('splits the extra payment into accrued interest and principal, and gives the balance', () => {
    expect(appliedExtraPaymentLines(extraPayment(), format)).toEqual([
      { label: 'Interest accrued to 11/24/2025', value: '$17.71' },
      { label: 'To principal', value: '$2,682.29' },
      { label: 'New balance', value: '$3,161.49' },
    ]);
  });
});

describe('appliedExtraPaymentNote', () => {
  it('names the payment whose principal the extra payment also covered, and its due date', () => {
    expect(appliedExtraPaymentNote(extraPayment(), format)).toBe(
      'It also covers the principal of payment 1 (12/17/2025), which then charges only interest.',
    );
  });

  it('is null when that payment still repays principal on its due date', () => {
    expect(appliedExtraPaymentNote(extraPayment({ extraPaymentAmount: '100' }), format)).toBeNull();
  });

  it('is null when the extra payment ends the loan', () => {
    expect(
      appliedExtraPaymentNote(extraPayment({ extraPaymentAmount: '10000' }), format),
    ).toBeNull();
  });
});

describe('warningTexts', () => {
  it('writes every warning with the formatter it is given', () => {
    expect(
      warningTexts(
        [
          { code: 'rateAboveMaximum', effectiveRate: 16.77, maxRate: 15.5 },
          { code: 'extraPaymentClipped', appliedAmount: 5862.13 },
          { code: 'paymentDoesNotFitTerm', paymentCount: 40, lastPayment: 12.5 },
        ],
        format,
      ),
    ).toEqual([
      'The effective rate (16.77%) is above the segment maximum (15.5%).',
      expect.stringContaining('$5,862.13'),
      expect.stringMatching(/40.*\$12\.50/),
    ]);
  });

  it('is empty without warnings', () => {
    expect(warningTexts([], format)).toEqual([]);
  });
});

describe('savingsLines', () => {
  it('shows the new payment when the extra payment lowers it', () => {
    expect(labels(savingsLines(extraPayment(), format))).toEqual(['You save', 'New payment']);
  });

  it('shows the payments saved when the extra payment shortens the loan', () => {
    const lines = savingsLines(extraPayment({ extraPaymentEffect: 'reduceTerm' }), format);
    expect(labels(lines)).toContain('Payments saved');
  });

  it('shows only the cost saved when the extra payment is too small to reschedule the loan', () => {
    const lines = savingsLines(extraPayment({ extraPaymentAmount: '100' }), format);
    expect(labels(lines)).toEqual(['You save']);
  });
});

describe('comparisonLines', () => {
  it('compares payments, interest and total paid without and with the extra payment', () => {
    const lines = comparisonLines(extraPayment(), format);
    expect(labels(lines)).toEqual(['Payments', 'Total interest', 'Total paid']);
    expect(lines[0]).toEqual({ label: 'Payments', without: '32', with: '32' });
  });

  it('adds insurance and other charges when the loan has them', () => {
    const lines = comparisonLines(
      extraPayment({ insuranceRate: '0.05', insuranceUnit: 'percentPerMonth', otherCharges: '1' }),
      format,
    );
    expect(labels(lines)).toEqual([
      'Payments',
      'Total interest',
      'Total insurance',
      'Total other charges',
      'Total paid',
    ]);
  });
});
