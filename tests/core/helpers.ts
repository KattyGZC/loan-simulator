import { expect } from 'vitest';
import { roundMoney } from '@/core/money';
import { simulateExistingLoan } from '@/core/existing-loan';
import { simulate } from '@/core/simulate';
import type { ExistingLoanInput, InsuranceInput, LoanInput, ScheduleRow } from '@/core/types';

/** $10,000 over 12 months at 12 % nominal: 1 % a month, so the numbers are easy to check. */
export const french: LoanInput = {
  amount: 10000,
  termMonths: 12,
  annualRate: 12,
  rateType: 'nominal',
  method: 'french',
};

/** $12,000 over 12 months at 12 % nominal: $1,000 of principal a month. */
export const german: LoanInput = { ...french, amount: 12000, method: 'german' };

/** 1.2 % per year on the balance: 0.1 % a month. */
export const balanceInsurance: InsuranceInput = {
  rate: 1.2,
  unit: 'percentPerYear',
  base: 'balance',
};

export function run(input: LoanInput) {
  const result = simulate(input);
  if (!result.ok) throw new Error(`Unexpected validation errors: ${JSON.stringify(result.errors)}`);
  return result;
}

export function runExisting(input: ExistingLoanInput) {
  const result = simulateExistingLoan(input);
  if (!result.ok) throw new Error(`Unexpected validation errors: ${JSON.stringify(result.errors)}`);
  return result;
}

/** Every row adds up, each balance follows from the previous one, and the loan ends at 0. */
export function expectConsistent(rows: readonly ScheduleRow[], amount: number) {
  let balance = amount;
  for (const row of rows) {
    const payment = roundMoney(row.principal + row.interest + row.insurance + row.otherCharges);
    expect(row.payment, `payment of row ${row.number}`).toBe(payment);
    balance = roundMoney(balance - row.principal);
    expect(row.balance, `balance of row ${row.number}`).toBe(balance);
  }
  expect(balance).toBe(0);
}
