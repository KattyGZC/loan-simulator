import { paymentDate } from './dates';
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
  /** Monthly interest rate as a fraction. */
  monthlyRate: number;
  insurance: ScheduleInsurance;
  otherCharges: number;
  firstPaymentDate?: string;
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
  installment(balance: number, payments: number): number;
  principal(installment: number, interest: number, insurance: number): number;
  paymentsToRepay(balance: number, installment: number): number;
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

/**
 * Fixed payment of principal + interest, plus the insurance when it is inside the payment.
 * Balance-based insurance then works like extra interest, and insurance on the original amount
 * is a fixed sum added to the annuity. Principal is whatever the payment leaves.
 */
function frenchMethod({ amount, monthlyRate, insurance }: ScheduleParams): Method {
  const insuranceInside = !insurance.onTopOfInstallment;
  const onBalance = insurance.base === 'balance';
  const annuityRate =
    insuranceInside && onBalance ? monthlyRate + insurance.monthlyRate : monthlyRate;
  const fixedInsurance =
    insuranceInside && !onBalance ? roundMoney(amount * insurance.monthlyRate) : 0;
  return {
    installment: (balance, payments) =>
      roundMoney(annuity(balance, annuityRate, payments) + fixedInsurance),
    principal: (installment, interest, insuranceCharge) =>
      roundMoney(installment - (insuranceInside ? interest + insuranceCharge : interest)),
    paymentsToRepay: (balance, installment) =>
      periodsToRepay(balance, annuityRate, installment - fixedInsurance),
  };
}

const germanMethod: Method = {
  installment: (balance, payments) => roundMoney(balance / payments),
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
        installment: method.installment(balance, lastPaymentNumber - paymentNumber),
      }
    : {
        ...outstanding,
        lastPaymentNumber: paymentNumber + method.paymentsToRepay(balance, installment),
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
    installment: method.installment(params.amount, params.termMonths),
    lastPaymentNumber: params.termMonths,
  };

  while (outstanding.balance > 0) {
    const paymentNumber = rows.length + 1;
    const { balance, installment, lastPaymentNumber } = outstanding;
    const interest = roundMoney(balance * params.monthlyRate);
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
      date: params.firstPaymentDate ? paymentDate(params.firstPaymentDate, paymentNumber) : null,
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
