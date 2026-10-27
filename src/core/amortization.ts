import type { Calendar } from './calendar';
import { roundMoney } from './money';
import type {
  AmortizationMethod,
  ExtraPayment,
  ExtraPaymentEffect,
  InsuranceBase,
  ScheduleRow,
  SimulationWarning,
} from './types';

export interface ScheduleParams {
  amount: number;
  termMonths: number;
  method: AmortizationMethod;
  /** Due dates and the interest each payment charges. */
  calendar: Calendar;
  insurance: ScheduleInsurance;
  otherCharges: number;
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

/** What is left to repay after a payment and its extra payments. */
interface Outstanding {
  balance: number;
  installment: number;
  lastPaymentNumber: number;
}

type NumberedExtraPayment = ExtraPayment & { index: number };

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
  if (outstanding.balance === 0) return outstanding;
  const { balance, installment, lastPaymentNumber } = outstanding;
  return effect === 'reducePayment'
    ? {
        ...outstanding,
        installment: method.installment(balance, paymentNumber + 1, lastPaymentNumber),
      }
    : {
        ...outstanding,
        lastPaymentNumber:
          paymentNumber +
          method.paymentsToRepay(balance, installment, paymentNumber + 1, lastPaymentNumber),
      };
}

/** Applies the extra payments made right after `paymentNumber`, in order. */
function applyExtraPayments(
  outstanding: Outstanding,
  due: readonly NumberedExtraPayment[],
  paymentNumber: number,
  method: Method,
): { outstanding: Outstanding; extraPaid: number; warnings: SimulationWarning[] } {
  let current = outstanding;
  let extraPaid = 0;
  const warnings: SimulationWarning[] = [];
  for (const extra of due) {
    if (current.balance === 0) {
      warnings.push({ code: 'extraPaymentIgnored', index: extra.index });
      continue;
    }
    const applied = Math.min(extra.amount, current.balance);
    if (applied < extra.amount) {
      warnings.push({ code: 'extraPaymentClipped', index: extra.index, appliedAmount: applied });
    }
    extraPaid = roundMoney(extraPaid + applied);
    const balance = roundMoney(current.balance - applied);
    current = reschedule({ ...current, balance }, extra.effect, paymentNumber, method);
  }
  return { outstanding: current, extraPaid, warnings };
}

/**
 * Builds the payment schedule, applying each extra payment right after the payment it names.
 *
 * Each value is rounded to cents and the rounded balance carries over to the next month.
 * The last payment takes whatever principal is left, so the balance ends at exactly 0.
 * An extra payment that reduces the payment recomputes the installment over the remaining
 * payments; one that reduces the term keeps it and moves the last payment earlier.
 */
export function buildSchedule(
  params: ScheduleParams,
  extraPayments: readonly ExtraPayment[] = [],
): { rows: ScheduleRow[]; warnings: SimulationWarning[] } {
  const method = params.method === 'french' ? frenchMethod(params) : germanMethod;
  const scheduled: NumberedExtraPayment[] = extraPayments
    .map((extra, index) => ({ ...extra, index }))
    .sort((a, b) => a.afterPayment - b.afterPayment);

  const rows: ScheduleRow[] = [];
  const warnings: SimulationWarning[] = [];
  let outstanding: Outstanding = {
    balance: params.amount,
    installment: method.installment(params.amount, 1, params.termMonths),
    lastPaymentNumber: params.termMonths,
  };

  while (outstanding.balance > 0) {
    const paymentNumber = rows.length + 1;
    const { balance, installment, lastPaymentNumber } = outstanding;
    const interest = roundMoney(balance * params.calendar.periodRate(paymentNumber));
    const insuredAmount = params.insurance.base === 'balance' ? balance : params.amount;
    const insurance = roundMoney(insuredAmount * params.insurance.monthlyRate);
    const principal =
      paymentNumber >= lastPaymentNumber
        ? balance
        : Math.min(method.principal(installment, interest, insurance), balance);

    const due = scheduled.filter((extra) => extra.afterPayment === paymentNumber);
    const afterPayment = { ...outstanding, balance: roundMoney(balance - principal) };
    const prepaid = applyExtraPayments(afterPayment, due, paymentNumber, method);
    outstanding = prepaid.outstanding;
    warnings.push(...prepaid.warnings);

    rows.push({
      number: paymentNumber,
      date: params.calendar.dueDate(paymentNumber),
      payment: roundMoney(principal + interest + insurance + params.otherCharges),
      principal,
      interest,
      insurance,
      otherCharges: params.otherCharges,
      extraPayment: prepaid.extraPaid,
      balance: outstanding.balance,
    });
  }

  const dueAfterPayoff = scheduled.filter((extra) => extra.afterPayment > rows.length);
  for (const { index } of dueAfterPayoff) warnings.push({ code: 'extraPaymentIgnored', index });
  return { rows, warnings };
}
