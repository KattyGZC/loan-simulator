import { expect } from 'vitest';
import { roundMoney } from '@/core/money';
import { simulate } from '@/core/simulate';
import type { LoanInput, ScheduleRow } from '@/core/types';

export function run(input: LoanInput) {
  const result = simulate(input);
  if (!result.ok) throw new Error(`Unexpected validation errors: ${JSON.stringify(result.errors)}`);
  return result;
}

type AmountKey = Exclude<keyof ScheduleRow, 'number' | 'date'>;

export function sum(rows: ScheduleRow[], key: AmountKey): number {
  return roundMoney(rows.reduce((total, row) => total + row[key], 0));
}

/** Every row adds up, each balance follows from the previous one, and the loan ends at 0. */
export function expectConsistent(rows: ScheduleRow[], amount: number) {
  let balance = amount;
  for (const row of rows) {
    const payment = roundMoney(row.principal + row.interest + row.insurance + row.otherCharges);
    expect(row.payment, `payment of row ${row.number}`).toBe(payment);
    balance = roundMoney(balance - row.principal - row.extraPayment);
    expect(row.balance, `balance of row ${row.number}`).toBe(balance);
  }
  expect(balance).toBe(0);
}
