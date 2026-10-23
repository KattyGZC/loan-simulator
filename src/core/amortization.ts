import { paymentDate } from './dates';
import { roundMoney } from './money';
import type {
  AmortizationMethod,
  ExtraPayment,
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
  /** Monthly insurance rate as a fraction; 0 for no insurance. */
  insuranceRate: number;
  insuranceBase: InsuranceBase;
  /** French only: the fixed payment covers principal + interest, and insurance goes on top. */
  insuranceOnTop: boolean;
  otherCharges: number;
  firstPaymentDate?: string;
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

/**
 * Builds the payment schedule, applying extra payments right after the payment they name.
 *
 * Each value is rounded to cents and the rounded balance carries over to the next month.
 * The last payment takes whatever principal is left, so the balance ends at exactly 0.
 *
 * `installment` is the fixed payment (French) or the fixed principal (German). An extra
 * payment either recomputes it over the remaining payments (reduce payment) or keeps it and
 * moves the last payment earlier (reduce term).
 *
 * When the French payment includes insurance, balance-based insurance works like extra
 * interest (the annuity uses interest rate + insurance rate), and insurance on the original
 * amount is a fixed sum added to the annuity. Principal is whatever the payment leaves.
 */
export function buildSchedule(
  params: ScheduleParams,
  extraPayments: readonly ExtraPayment[] = [],
): { rows: ScheduleRow[]; warnings: SimulationWarning[] } {
  const { amount, method, monthlyRate: rate, insuranceRate, otherCharges } = params;
  const french = method === 'french';
  const insuranceInInstallment = french && !params.insuranceOnTop;
  const byBalance = params.insuranceBase === 'balance';
  // Rate and fixed sum the French annuity covers on top of principal.
  const annuityRate = insuranceInInstallment && byBalance ? rate + insuranceRate : rate;
  const fixedInsurance =
    insuranceInInstallment && !byBalance ? roundMoney(amount * insuranceRate) : 0;
  const frenchPayment = (principalLeft: number, periods: number) =>
    roundMoney(annuity(principalLeft, annuityRate, periods) + fixedInsurance);
  const pending = extraPayments
    .map((extra, index) => ({ ...extra, index }))
    .sort((a, b) => a.afterPayment - b.afterPayment);

  const rows: ScheduleRow[] = [];
  const warnings: SimulationWarning[] = [];
  let balance = amount;
  let lastNumber = params.termMonths;
  let installment = french ? frenchPayment(balance, lastNumber) : roundMoney(balance / lastNumber);

  for (let number = 1; balance > 0; number++) {
    const interest = roundMoney(balance * rate);
    const insurance = roundMoney((byBalance ? balance : amount) * insuranceRate);
    const covered = insuranceInInstallment ? interest + insurance : interest;
    let principal = french ? roundMoney(installment - covered) : installment;
    if (number >= lastNumber || principal >= balance) principal = balance;
    balance = roundMoney(balance - principal);

    let extraPaid = 0;
    for (let extra = pending[0]; extra?.afterPayment === number; extra = pending[0]) {
      pending.shift();
      if (balance === 0) {
        warnings.push({ code: 'extraPaymentIgnored', index: extra.index });
        continue;
      }
      const applied = Math.min(extra.amount, balance);
      if (applied < extra.amount) {
        warnings.push({ code: 'extraPaymentClipped', index: extra.index, appliedAmount: applied });
      }
      balance = roundMoney(balance - applied);
      extraPaid = roundMoney(extraPaid + applied);
      if (balance === 0) continue;

      const remaining = lastNumber - number;
      if (extra.effect === 'reducePayment') {
        installment = french ? frenchPayment(balance, remaining) : roundMoney(balance / remaining);
      } else {
        lastNumber =
          number +
          (french
            ? periodsToRepay(balance, annuityRate, installment - fixedInsurance)
            : Math.ceil(balance / installment - TERM_EPSILON));
      }
    }

    rows.push({
      number,
      date: params.firstPaymentDate ? paymentDate(params.firstPaymentDate, number) : null,
      payment: roundMoney(principal + interest + insurance + otherCharges),
      principal,
      interest,
      insurance,
      otherCharges,
      extraPayment: extraPaid,
      balance,
    });
  }

  for (const extra of pending) warnings.push({ code: 'extraPaymentIgnored', index: extra.index });
  return { rows, warnings };
}
