import type { Calendar } from './calendar';
import { roundMoney } from './money';
import type {
  AmortizationMethod,
  AppliedExtraPayment,
  ExistingLoanWarning,
  ExtraPayment,
  ExtraPaymentEffect,
  InsuranceBase,
  ScheduleRow,
} from './types';

export interface ScheduleParams {
  amount: number;
  termMonths: number;
  method: AmortizationMethod;
  /** Due dates and the interest each payment charges. */
  calendar: Calendar;
  insurance: ScheduleInsurance;
  otherCharges: number;
  /**
   * French only: the fixed payment the lender set, used instead of the one computed from the
   * term. The term still sets the last payment, which takes what is left.
   */
  installment?: number;
}

/**
 * An extra payment in the period of payment `paymentNumber`, which ends on its due date, with
 * the interest it pays first and the days of the period left after it.
 */
export interface ScheduledExtraPayment extends ExtraPayment {
  paymentNumber: number;
  accruedInterest: number;
  remainingDays: number;
}

export interface ScheduleInsurance {
  /** Monthly rate as a fraction; 0 for no insurance. */
  monthlyRate: number;
  base: InsuranceBase;
  /** French only: insurance is added on top of the fixed payment instead of inside it. */
  onTopOfInstallment: boolean;
}

/**
 * What differs between amortization methods. The installment is the fixed payment (French)
 * or the fixed principal (German).
 */
interface Method {
  /** The installment that repays `balance` with payments `first` to `last`. */
  installment(balance: number, first: number, last: number): number;
  principal(installment: number, interest: number, insurance: number): number;
  /** How many payments from `first` on repay `balance`, at most up to `last`. */
  paymentsToRepay(balance: number, installment: number, first: number, last: number): number;
}

/** What is left to repay after a payment. */
interface Outstanding {
  balance: number;
  installment: number;
  lastPaymentNumber: number;
}

// Guards against float noise when a remaining term is a whole number (e.g. 6.0000000001).
const TERM_EPSILON = 1e-9;

/** Fixed payment at a monthly `rate` that repays `balance` in `periods` payments. */
function annuity(balance: number, rate: number, periods: number): number {
  if (rate === 0) return roundMoney(balance / periods);
  return roundMoney((balance * rate) / (1 - (1 + rate) ** -periods));
}

/** Payments needed to repay `balance` with a fixed `payment` at a monthly `rate`. */
function periodsToRepay(balance: number, rate: number, payment: number): number {
  const periods =
    rate === 0 ? balance / payment : -Math.log(1 - (balance * rate) / payment) / Math.log(1 + rate);
  return Math.ceil(periods - TERM_EPSILON);
}

/** Fixed payment that repays `balance` with payments `first` to `last`, each at its own rate. */
function annuityOverPeriods(
  balance: number,
  rate: (paymentNumber: number) => number,
  first: number,
  last: number,
): number {
  // What 1 paid at the end of every period is worth today, period rates compounded.
  let discount = 1;
  let presentValue = 0;
  for (let paymentNumber = first; paymentNumber <= last; paymentNumber++) {
    discount /= 1 + rate(paymentNumber);
    presentValue += discount;
  }
  return roundMoney(balance / presentValue);
}

/**
 * Payments from `first` on that repay `balance` with a fixed `payment`, each period at its own
 * rate. Never more than up to `last`, the payment the loan ended with before.
 */
function periodsToRepayOverPeriods(
  balance: number,
  rate: (paymentNumber: number) => number,
  payment: number,
  first: number,
  last: number,
): number {
  let discount = 1;
  let presentValue = 0;
  let paymentNumber = first;
  for (; paymentNumber < last; paymentNumber++) {
    discount /= 1 + rate(paymentNumber);
    presentValue += discount;
    if (payment * presentValue >= balance - TERM_EPSILON) break;
  }
  return paymentNumber - first + 1;
}

/**
 * Fixed payment of principal + interest, plus the insurance when it is inside the payment.
 * Balance-based insurance then works like extra interest, and insurance on the original amount
 * is a fixed sum added to the annuity. Principal is whatever the payment leaves.
 *
 * Under 30/360 every period has the same rate and the annuity has a closed form. With actual
 * days each period charges its own rate, so the payment is the one that repays the loan over
 * those rates; a payment from the monthly rate would leave a large last payment.
 */
function frenchMethod({ amount, calendar, insurance }: ScheduleParams): Method {
  const insuranceInside = !insurance.onTopOfInstallment;
  const onBalance = insurance.base === 'balance';
  const insuranceAsInterest = insuranceInside && onBalance ? insurance.monthlyRate : 0;
  const fixedInsurance =
    insuranceInside && !onBalance ? roundMoney(amount * insurance.monthlyRate) : 0;
  const principal: Method['principal'] = (installment, interest, insuranceCharge) =>
    roundMoney(installment - (insuranceInside ? interest + insuranceCharge : interest));

  if (calendar.fixedRate !== null) {
    const annuityRate = calendar.fixedRate + insuranceAsInterest;
    return {
      installment: (balance, first, last) =>
        roundMoney(annuity(balance, annuityRate, last - first + 1) + fixedInsurance),
      principal,
      paymentsToRepay: (balance, installment) =>
        periodsToRepay(balance, annuityRate, installment - fixedInsurance),
    };
  }
  const annuityRate = (paymentNumber: number) =>
    calendar.periodRate(paymentNumber) + insuranceAsInterest;
  return {
    installment: (balance, first, last) =>
      roundMoney(annuityOverPeriods(balance, annuityRate, first, last) + fixedInsurance),
    principal,
    paymentsToRepay: (balance, installment, first, last) =>
      periodsToRepayOverPeriods(balance, annuityRate, installment - fixedInsurance, first, last),
  };
}

const germanMethod: Method = {
  installment: (balance, first, last) => roundMoney(balance / (last - first + 1)),
  principal: (installment) => installment,
  paymentsToRepay: (balance, installment) => Math.ceil(balance / installment - TERM_EPSILON),
};

function reschedule(
  outstanding: Outstanding,
  effect: ExtraPaymentEffect,
  paymentNumber: number,
  method: Method,
): Outstanding {
  const { balance, installment, lastPaymentNumber } = outstanding;
  if (effect === 'reducePayment') {
    return {
      ...outstanding,
      installment: method.installment(balance, paymentNumber + 1, lastPaymentNumber),
    };
  }
  const paymentsLeft = method.paymentsToRepay(
    balance,
    installment,
    paymentNumber + 1,
    lastPaymentNumber,
  );
  return {
    ...outstanding,
    lastPaymentNumber: Math.min(paymentNumber + paymentsLeft, lastPaymentNumber),
  };
}

function methodOf(params: ScheduleParams): Method {
  return params.method === 'french' ? frenchMethod(params) : germanMethod;
}

function initialOutstanding(params: ScheduleParams, method: Method): Outstanding {
  return {
    balance: params.amount,
    installment: params.installment ?? method.installment(params.amount, 1, params.termMonths),
    lastPaymentNumber: params.termMonths,
  };
}

function insuranceCharge(params: ScheduleParams, balance: number): number {
  const insuredAmount = params.insurance.base === 'balance' ? balance : params.amount;
  return roundMoney(insuredAmount * params.insurance.monthlyRate);
}

/** Payment `paymentNumber`, which repays `principal` of `balance` and charges `interest`. */
function paymentRow(
  params: ScheduleParams,
  paymentNumber: number,
  balance: number,
  principal: number,
  interest: number,
): ScheduleRow {
  const insurance = insuranceCharge(params, balance);
  return {
    number: paymentNumber,
    date: params.calendar.dueDate(paymentNumber),
    payment: roundMoney(principal + interest + insurance + params.otherCharges),
    principal,
    interest,
    insurance,
    otherCharges: params.otherCharges,
    balance: roundMoney(balance - principal),
  };
}

/** Payment `paymentNumber` as scheduled: the interest of its whole period on `outstanding`. */
function scheduledPayment(
  params: ScheduleParams,
  method: Method,
  outstanding: Outstanding,
  paymentNumber: number,
): ScheduleRow {
  const { balance, installment, lastPaymentNumber } = outstanding;
  const interest = roundMoney(balance * params.calendar.periodRate(paymentNumber));
  const insurance = insuranceCharge(params, balance);
  const principal =
    paymentNumber >= lastPaymentNumber
      ? balance
      : Math.min(method.principal(installment, interest, insurance), balance);
  return paymentRow(params, paymentNumber, balance, principal, interest);
}

/**
 * The scheduled payments from `firstPaymentNumber` on, until the balance is repaid or payment
 * `stopBefore` is next.
 */
function repay(
  params: ScheduleParams,
  method: Method,
  outstanding: Outstanding,
  firstPaymentNumber: number,
  stopBefore = Number.POSITIVE_INFINITY,
): { rows: ScheduleRow[]; outstanding: Outstanding } {
  const rows: ScheduleRow[] = [];
  let current = outstanding;
  let paymentNumber = firstPaymentNumber;
  while (current.balance > 0 && paymentNumber < stopBefore) {
    const row = scheduledPayment(params, method, current, paymentNumber);
    rows.push(row);
    current = { ...current, balance: row.balance };
    paymentNumber++;
  }
  return { rows, outstanding: current };
}

/** The loan paid off on the extra payment's date: no insurance or charges after it. */
function payoffRow(
  paymentNumber: number,
  date: string,
  principal: number,
  interest: number,
): ScheduleRow {
  return {
    number: paymentNumber,
    date,
    payment: roundMoney(principal + interest),
    principal,
    interest,
    insurance: 0,
    otherCharges: 0,
    balance: 0,
  };
}

/** How much of an extra payment goes to principal: what is left after the accrued interest. */
function applyExtraPayment(
  extra: ScheduledExtraPayment,
  balance: number,
): { applied: Omit<AppliedExtraPayment, 'duePrincipal'>; warnings: ExistingLoanWarning[] } {
  const offeredPrincipal = roundMoney(extra.amount - extra.accruedInterest);
  const principal = Math.min(offeredPrincipal, balance);
  const applied = {
    date: extra.date,
    paymentNumber: extra.paymentNumber,
    amount: roundMoney(extra.accruedInterest + principal),
    accruedInterest: extra.accruedInterest,
    principal,
    balance: roundMoney(balance - principal),
  };
  const warnings: ExistingLoanWarning[] =
    offeredPrincipal > balance
      ? [{ code: 'extraPaymentClipped', appliedAmount: applied.amount }]
      : [];
  return { applied, warnings };
}

interface PeriodWithExtraPayment {
  row: ScheduleRow;
  outstanding: Outstanding;
  applied: AppliedExtraPayment;
  warnings: ExistingLoanWarning[];
}

/**
 * The period of the payment that holds the extra payment. The extra payment's principal covers
 * this payment's scheduled principal first, so on the due date the payment repays only what the
 * extra payment left of it, and charges the interest for the days after the extra payment.
 * Principal beyond the scheduled one reduces the balance, and the payments after this one are
 * rescheduled.
 */
function periodWithExtraPayment(
  params: ScheduleParams,
  method: Method,
  outstanding: Outstanding,
  extra: ScheduledExtraPayment,
): PeriodWithExtraPayment {
  const { paymentNumber } = extra;
  const { balance } = outstanding;
  const { applied, warnings } = applyExtraPayment(extra, balance);
  if (applied.balance === 0) {
    const row = payoffRow(paymentNumber, extra.date, applied.principal, applied.accruedInterest);
    return {
      row,
      outstanding: { ...outstanding, balance: 0 },
      applied: { ...applied, duePrincipal: 0 },
      warnings,
    };
  }

  const scheduled = scheduledPayment(params, method, outstanding, paymentNumber);
  const duePrincipal = Math.max(roundMoney(scheduled.principal - applied.principal), 0);
  const interestAfterExtra = roundMoney(
    applied.balance * params.calendar.dailyRate * extra.remainingDays,
  );
  const row = paymentRow(
    params,
    paymentNumber,
    balance,
    roundMoney(applied.principal + duePrincipal),
    roundMoney(applied.accruedInterest + interestAfterExtra),
  );
  const afterPayment = { ...outstanding, balance: row.balance };
  const repaysMoreThanScheduled = applied.principal > scheduled.principal;
  return {
    row,
    outstanding: repaysMoreThanScheduled
      ? reschedule(afterPayment, extra.effect, paymentNumber, method)
      : afterPayment,
    applied: { ...applied, duePrincipal },
    warnings,
  };
}

/**
 * Builds the payment schedule.
 *
 * Each value is rounded to cents and the rounded balance carries over to the next month.
 * The last payment takes whatever principal is left, so the balance ends at exactly 0.
 */
export function buildSchedule(params: ScheduleParams): ScheduleRow[] {
  const method = methodOf(params);
  return repay(params, method, initialOutstanding(params, method), 1).rows;
}

/**
 * Builds the payment schedule with an extra payment in the period it names. One that reduces
 * the payment recomputes the installment over the payments after its own; one that reduces the
 * term keeps it and moves the last payment earlier.
 */
export function buildScheduleWithExtraPayment(
  params: ScheduleParams,
  extra: ScheduledExtraPayment,
): { rows: ScheduleRow[]; extraPayment: AppliedExtraPayment; warnings: ExistingLoanWarning[] } {
  const method = methodOf(params);
  const before = repay(params, method, initialOutstanding(params, method), 1, extra.paymentNumber);
  if (before.rows.length !== extra.paymentNumber - 1) {
    throw new Error(`The loan is repaid before payment ${extra.paymentNumber}.`);
  }
  const period = periodWithExtraPayment(params, method, before.outstanding, extra);
  const after = repay(params, method, period.outstanding, extra.paymentNumber + 1);
  return {
    rows: [...before.rows, period.row, ...after.rows],
    extraPayment: period.applied,
    warnings: period.warnings,
  };
}
