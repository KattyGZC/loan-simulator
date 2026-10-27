import { daysBetween, paymentDate, weekdayOnOrAfter } from './dates';
import { actualDaysRate, monthlyRate } from './rates';
import type { LoanInput } from './types';

/** When each payment falls due and how much interest it charges, by day-count basis. */
export interface Calendar {
  /** The rate every payment charges (30/360), or null when it changes from period to period. */
  fixedRate: number | null;
  /** Due date of payment `paymentNumber` (1-based), or null when the loan has no dates. */
  dueDate(paymentNumber: number): string | null;
  /** Interest charged by payment `paymentNumber`, as a fraction of the balance. */
  periodRate(paymentNumber: number): number;
}

/** 30/360: every payment charges the monthly rate, and due dates are never moved. */
function thirty360(nominal: number, firstPaymentDate: string | undefined): Calendar {
  const rate = monthlyRate(nominal);
  return {
    fixedRate: rate,
    dueDate: (paymentNumber) =>
      firstPaymentDate ? paymentDate(firstPaymentDate, paymentNumber) : null,
    periodRate: () => rate,
  };
}

/**
 * Actual/360: each payment charges the days since the previous due date, or since the
 * disbursement for the first one. A due date on a weekend moves to Monday, and the interest
 * counts up to the moved date, as banks do.
 */
function actual360(nominal: number, firstPaymentDate: string, disbursementDate: string): Calendar {
  const dueDate = (paymentNumber: number) =>
    weekdayOnOrAfter(paymentDate(firstPaymentDate, paymentNumber));
  const periodStart = (paymentNumber: number) =>
    paymentNumber === 1 ? disbursementDate : dueDate(paymentNumber - 1);
  return {
    fixedRate: null,
    dueDate,
    periodRate: (paymentNumber) =>
      actualDaysRate(nominal, daysBetween(periodStart(paymentNumber), dueDate(paymentNumber))),
  };
}

/**
 * The calendar of a loan at the nominal annual rate `nominal` (a fraction). The input must be
 * valid: with `actual360`, `validate()` requires both dates.
 */
export function loanCalendar(input: LoanInput, nominal: number): Calendar {
  if (input.dayCount !== 'actual360') return thirty360(nominal, input.firstPaymentDate);
  const { firstPaymentDate, disbursementDate } = input;
  if (!firstPaymentDate || !disbursementDate) {
    throw new Error('actual360 needs the first payment and disbursement dates.');
  }
  return actual360(nominal, firstPaymentDate, disbursementDate);
}
