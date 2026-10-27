import { roundMoney } from './money';
import type {
  AppliedExtraPayment,
  Comparison,
  LoanSummary,
  PaymentsSummary,
  RemainingSchedule,
  ScheduleRow,
} from './types';

type AmountKey = Exclude<keyof ScheduleRow, 'number' | 'date'>;

/** Figures of the loan that do not depend on the schedule. Rates in percent. */
export interface LoanTerms {
  amount: number;
  solca: number;
  nominalRate: number;
  effectiveRate: number;
}

/** Sum of one amount column, rounded to cents. */
export function total(rows: readonly ScheduleRow[], key: AmountKey): number {
  return roundMoney(rows.reduce((sum, row) => sum + row[key], 0));
}

export function summarizePayments(rows: readonly ScheduleRow[]): PaymentsSummary {
  return {
    paymentCount: rows.length,
    firstPayment: rows[0]?.payment ?? 0,
    lastPayment: rows.at(-1)?.payment ?? 0,
    totalInterest: total(rows, 'interest'),
    totalInsurance: total(rows, 'insurance'),
    totalOtherCharges: total(rows, 'otherCharges'),
    totalPaid: total(rows, 'payment'),
  };
}

export function summarize(rows: readonly ScheduleRow[], loan: LoanTerms): LoanSummary {
  const payments = summarizePayments(rows);
  return {
    ...payments,
    nominalRate: loan.nominalRate,
    effectiveRate: loan.effectiveRate,
    solca: loan.solca,
    amountReceived: roundMoney(loan.amount - loan.solca),
    totalCost: roundMoney(
      payments.totalInterest + payments.totalInsurance + payments.totalOtherCharges + loan.solca,
    ),
  };
}

/**
 * What `extraPayment` saves: `withExtraPayment` against `withoutExtraPayment`.
 */
export function compare(
  withoutExtraPayment: RemainingSchedule,
  withExtraPayment: RemainingSchedule,
  extraPayment: Pick<AppliedExtraPayment, 'paymentNumber' | 'duePrincipal'>,
): Comparison {
  // Only an extra payment that covered its payment's principal reschedules the payments after
  // it. Rows are numbered from 1, so this index is the payment after the extra payment's.
  const rescheduled = extraPayment.duePrincipal === 0;
  const nextPayment = withExtraPayment.rows[extraPayment.paymentNumber]?.payment ?? null;
  const before = withoutExtraPayment.summary;
  const after = withExtraPayment.summary;
  const interestSaved = roundMoney(before.totalInterest - after.totalInterest);
  const insuranceSaved = roundMoney(before.totalInsurance - after.totalInsurance);
  const otherChargesSaved = roundMoney(before.totalOtherCharges - after.totalOtherCharges);
  return {
    interestSaved,
    insuranceSaved,
    otherChargesSaved,
    totalCostSaved: roundMoney(interestSaved + insuranceSaved + otherChargesSaved),
    paymentsSaved: withoutExtraPayment.rows.length - withExtraPayment.rows.length,
    newPayment: rescheduled ? nextPayment : null,
  };
}
