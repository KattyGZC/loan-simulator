import { simulate, type LoanInput } from '@/core';
import {
  defaultExistingLoanForm,
  simulateExistingLoanForm,
} from '@/entrypoints/sidepanel/existing-form';

const LOAN: LoanInput = {
  amount: 10000,
  termMonths: 12,
  annualRate: 15.6,
  rateType: 'nominal',
  method: 'french',
};

/** A new loan of 10,000 over 12 months at 15.6 % nominal, French, changed by `input`. */
export function simulation(input: Partial<LoanInput> = {}) {
  const result = simulate({ ...LOAN, ...input });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
}

/** The Produbanco loan after payment 4, with an extra payment made on 2025-11-24. */
export function produbancoExtraPayment(extraPaymentAmount = '2700') {
  const result = simulateExistingLoanForm(
    {
      ...defaultExistingLoanForm('2025-11-24'),
      balance: '5843.78',
      remainingPayments: '32',
      annualRate: '15.6',
      method: 'german',
      nextPaymentDate: '2025-12-17',
      dayCount: 'actual360',
      extraPaymentAmount,
      extraPaymentEffect: 'reducePayment',
    },
    'en-US',
  );
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
}
