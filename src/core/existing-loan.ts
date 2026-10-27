import {
  buildSchedule,
  buildScheduleWithExtraPayment,
  type ScheduledExtraPayment,
  type ScheduleParams,
} from './amortization';
import { existingLoanCalendar, type DatedCalendar } from './calendar';
import { addDays } from './dates';
import { insuranceMonthlyRate } from './insurance';
import { roundMoney } from './money';
import { annualRates, monthlyRate, percentToFraction } from './rates';
import { compare, summarizePayments } from './summary';
import type {
  ExistingLoanInput,
  ExistingLoanResult,
  ExistingLoanWarning,
  ScheduleRow,
  ValidationError,
} from './types';
import { validateExistingLoan } from './validate';

// A last payment this far from the current payment, as a fraction of it, means the payment,
// the rate or the remaining payments were entered wrong; less is the lender's rounding.
const PAYMENT_FIT_TOLERANCE = 0.01;

function scheduleParams(input: ExistingLoanInput, calendar: DatedCalendar): ScheduleParams {
  return {
    amount: input.balance,
    termMonths: input.remainingPayments,
    method: input.method,
    calendar,
    insurance: {
      monthlyRate: insuranceMonthlyRate(input.insurance),
      base: 'balance',
      onTopOfInstallment: input.insurance?.onTopOfInstallment ?? false,
    },
    otherCharges: input.otherCharges ?? 0,
    installment: input.method === 'french' ? input.currentPayment : undefined,
  };
}

/**
 * The least a French payment must exceed to repay any principal: a month of interest, and of
 * insurance when it is inside the payment. With actual days a 31-day period charges a little
 * more; `paymentDoesNotFitTerm` then warns about the payment.
 */
function currentPaymentError(params: ScheduleParams, nominal: number): ValidationError[] {
  if (params.installment === undefined) return [];
  const insideRate = params.insurance.onTopOfInstallment ? 0 : params.insurance.monthlyRate;
  const min = roundMoney(params.amount * (monthlyRate(nominal) + insideRate));
  return params.installment > min
    ? []
    : [{ field: 'currentPayment', code: 'tooSmall', params: { min } }];
}

/** Principal + interest of `row`, and its insurance when the insurance is inside the payment. */
function installmentPart(row: ScheduleRow, params: ScheduleParams): number {
  const insurance = params.insurance.onTopOfInstallment ? 0 : row.insurance;
  return roundMoney(row.principal + row.interest + insurance);
}

/** Whether the current payment repays the balance in the remaining payments. */
function paymentFitWarning(
  rows: readonly ScheduleRow[],
  params: ScheduleParams,
): ExistingLoanWarning[] {
  const last = rows.at(-1);
  const { installment } = params;
  if (installment === undefined || last === undefined) return [];
  const lastGap = Math.abs(installmentPart(last, params) - installment);
  const fits = rows.length === params.termMonths && lastGap <= installment * PAYMENT_FIT_TOLERANCE;
  return fits
    ? []
    : [{ code: 'paymentDoesNotFitTerm', paymentCount: rows.length, lastPayment: last.payment }];
}

/** The payment whose period holds `date`: from its previous due date to the day before its own. */
function paymentNumberOn(
  date: string,
  calendar: DatedCalendar,
  paymentCount: number,
): number | null {
  for (let paymentNumber = 1; paymentNumber <= paymentCount; paymentNumber++) {
    // ISO dates sort in calendar order as text.
    const inPeriod =
      calendar.periodStart(paymentNumber) <= date && date < calendar.dueDate(paymentNumber);
    if (inPeriod) return paymentNumber;
  }
  return null;
}

/**
 * The extra payment placed in the schedule without it, or why it cannot be: a date outside
 * the loan, or an amount that does not cover the interest accrued up to it. That interest is a
 * day's interest rounded to cents, times the days, as lenders do.
 */
function scheduleExtraPayment(
  input: ExistingLoanInput,
  calendar: DatedCalendar,
  without: readonly ScheduleRow[],
): { ok: true; extra: ScheduledExtraPayment } | { ok: false; error: ValidationError } {
  const { extraPayment } = input;
  const paymentNumber = paymentNumberOn(extraPayment.date, calendar, without.length);
  if (paymentNumber === null) {
    const min = calendar.periodStart(1);
    const max = addDays(calendar.dueDate(without.length), -1);
    return {
      ok: false,
      error: { field: 'extraPayment.date', code: 'dateOutOfRange', params: { min, max } },
    };
  }

  const balance = without[paymentNumber - 2]?.balance ?? input.balance;
  const { elapsedDays, remainingDays } = calendar.splitPeriod(paymentNumber, extraPayment.date);
  const accruedInterest = roundMoney(roundMoney(balance * calendar.dailyRate) * elapsedDays);
  if (extraPayment.amount <= accruedInterest) {
    return {
      ok: false,
      error: { field: 'extraPayment.amount', code: 'tooSmall', params: { min: accruedInterest } },
    };
  }
  return { ok: true, extra: { ...extraPayment, paymentNumber, accruedInterest, remainingDays } };
}

/**
 * The rest of a loan already running, with and without one extra payment, and what the extra
 * payment saves. The extra payment pays the interest accrued since the previous due date first;
 * the rest repays principal, starting with the principal of the payment it falls before.
 */
export function simulateExistingLoan(input: ExistingLoanInput): ExistingLoanResult {
  const fieldErrors = validateExistingLoan(input);
  if (fieldErrors.length > 0) return { ok: false, errors: fieldErrors };

  const { nominalRate } = annualRates(input.annualRate, input.rateType);
  const nominal = percentToFraction(nominalRate);
  const calendar = existingLoanCalendar(input, nominal);
  const params = scheduleParams(input, calendar);
  const paymentErrors = currentPaymentError(params, nominal);
  if (paymentErrors.length > 0) return { ok: false, errors: paymentErrors };

  const without = buildSchedule(params);
  const scheduled = scheduleExtraPayment(input, calendar, without);
  if (!scheduled.ok) return { ok: false, errors: [scheduled.error] };

  const withExtra = buildScheduleWithExtraPayment(params, scheduled.extra);
  const withoutExtraPayment = { rows: without, summary: summarizePayments(without) };
  const withExtraPayment = { rows: withExtra.rows, summary: summarizePayments(withExtra.rows) };
  return {
    ok: true,
    withoutExtraPayment,
    withExtraPayment,
    extraPayment: withExtra.extraPayment,
    comparison: compare(withoutExtraPayment, withExtraPayment, withExtra.extraPayment),
    warnings: [...paymentFitWarning(without, params), ...withExtra.warnings],
  };
}
