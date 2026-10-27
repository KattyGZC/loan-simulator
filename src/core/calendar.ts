import {
  DAYS_PER_30_360_MONTH,
  daysBetween,
  days360Between,
  paymentDate,
  weekdayOnOrAfter,
} from './dates';
import { actualDaysRate, dailyRate, monthlyRate } from './rates';
import type { ExistingLoanInput, LoanInput } from './types';

/** When each payment falls due and how much interest it charges, by day-count basis. */
export interface Calendar {
  /** The rate every payment charges (30/360), or null when it changes from period to period. */
  fixedRate: number | null;
  /** Due date of payment `paymentNumber` (1-based), or null when the loan has no dates. */
  dueDate(paymentNumber: number): string | null;
  /** Interest charged by payment `paymentNumber`, as a fraction of the balance. */
  periodRate(paymentNumber: number): number;
  /** Interest of one day, as a fraction of the balance. */
  dailyRate: number;
}

/** The days of interest of a period, before and after a date inside it. */
export interface PeriodSplit {
  elapsedDays: number;
  remainingDays: number;
}

/** A calendar whose payments all have dates. */
export interface DatedCalendar extends Calendar {
  dueDate(paymentNumber: number): string;
  /** Date the interest of payment `paymentNumber` starts to count: the previous due date. */
  periodStart(paymentNumber: number): string;
  /** The days of payment `paymentNumber`'s period before and after `date`, which lies in it. */
  splitPeriod(paymentNumber: number, date: string): PeriodSplit;
}

/**
 * 30/360: every payment charges the monthly rate, and due dates are never moved. Each period
 * starts on the previous due date, or a month before the first payment, and counts 30 days.
 */
function thirty360(nominal: number, firstPaymentDate: string): DatedCalendar {
  const rate = monthlyRate(nominal);
  const dueDate = (paymentNumber: number) => paymentDate(firstPaymentDate, paymentNumber);
  const periodStart = (paymentNumber: number) => dueDate(paymentNumber - 1);
  return {
    fixedRate: rate,
    dueDate,
    periodStart,
    periodRate: () => rate,
    dailyRate: dailyRate(nominal),
    splitPeriod: (paymentNumber, date) => {
      // A due date clamped to a short month (the 29th in February) would count 31 days.
      const elapsedDays = Math.min(
        days360Between(periodStart(paymentNumber), date),
        DAYS_PER_30_360_MONTH,
      );
      return { elapsedDays, remainingDays: DAYS_PER_30_360_MONTH - elapsedDays };
    },
  };
}

/** 30/360 for a loan without dates: the schedule only numbers its payments. */
function undatedThirty360(nominal: number): Calendar {
  const rate = monthlyRate(nominal);
  return {
    fixedRate: rate,
    dueDate: () => null,
    periodRate: () => rate,
    dailyRate: dailyRate(nominal),
  };
}

/**
 * Actual/360: each payment charges the days since the previous due date, or since
 * `firstPeriodStart` for the first one. A due date on a weekend moves to Monday, and the
 * interest counts up to the moved date, as banks do.
 */
function actual360(
  nominal: number,
  firstPaymentDate: string,
  firstPeriodStart: string,
): DatedCalendar {
  const dueDate = (paymentNumber: number) =>
    weekdayOnOrAfter(paymentDate(firstPaymentDate, paymentNumber));
  const periodStart = (paymentNumber: number) =>
    paymentNumber === 1 ? firstPeriodStart : dueDate(paymentNumber - 1);
  return {
    fixedRate: null,
    dueDate,
    periodStart,
    periodRate: (paymentNumber) =>
      actualDaysRate(nominal, daysBetween(periodStart(paymentNumber), dueDate(paymentNumber))),
    dailyRate: dailyRate(nominal),
    splitPeriod: (paymentNumber, date) => ({
      elapsedDays: daysBetween(periodStart(paymentNumber), date),
      remainingDays: daysBetween(date, dueDate(paymentNumber)),
    }),
  };
}

/**
 * The calendar of a new loan at the nominal annual rate `nominal` (a fraction). The input must
 * be valid: with `actual360`, `validate()` requires both dates.
 */
export function loanCalendar(input: LoanInput, nominal: number): Calendar {
  const { firstPaymentDate, disbursementDate } = input;
  if (input.dayCount !== 'actual360') {
    return firstPaymentDate ? thirty360(nominal, firstPaymentDate) : undatedThirty360(nominal);
  }
  if (!firstPaymentDate || !disbursementDate) {
    throw new Error('actual360 needs the first payment and disbursement dates.');
  }
  return actual360(nominal, firstPaymentDate, disbursementDate);
}

/**
 * The calendar of a loan already running, from its next payment. Its interest counts from the
 * due date a month before, the last one paid.
 */
export function existingLoanCalendar(input: ExistingLoanInput, nominal: number): DatedCalendar {
  const { nextPaymentDate } = input;
  if (input.dayCount !== 'actual360') return thirty360(nominal, nextPaymentDate);
  const previousDueDate = weekdayOnOrAfter(paymentDate(nextPaymentDate, 0));
  return actual360(nominal, nextPaymentDate, previousDueDate);
}
