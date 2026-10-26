import { roundMoney } from './money';
import type { Comparison, LoanSummary, Schedule, ScheduleRow } from './types';

type AmountKey = Exclude<keyof ScheduleRow, 'number' | 'date'>;

function total(rows: readonly ScheduleRow[], key: AmountKey): number {
  return roundMoney(rows.reduce((sum, row) => sum + row[key], 0));
}

export function summarize(
  rows: readonly ScheduleRow[],
  loan: { amount: number; solca: number; nominalRate: number; effectiveRate: number },
): LoanSummary {
  const totalInterest = total(rows, 'interest');
  const totalInsurance = total(rows, 'insurance');
  const totalOtherCharges = total(rows, 'otherCharges');
  const totalExtraPayments = total(rows, 'extraPayment');
  return {
    nominalRate: loan.nominalRate,
    effectiveRate: loan.effectiveRate,
    paymentCount: rows.length,
    firstPayment: rows[0]?.payment ?? 0,
    lastPayment: rows.at(-1)?.payment ?? 0,
    totalInterest,
    totalInsurance,
    totalOtherCharges,
    totalExtraPayments,
    solca: loan.solca,
    amountReceived: roundMoney(loan.amount - loan.solca),
    totalPaid: roundMoney(total(rows, 'payment') + totalExtraPayments),
    totalCost: roundMoney(totalInterest + totalInsurance + totalOtherCharges + loan.solca),
  };
}

export function compare(base: Schedule, withExtras: Schedule): Comparison {
  const { rows } = withExtras;
  const lastExtra = rows.findLastIndex((row) => row.extraPayment > 0);
  return {
    interestSaved: roundMoney(base.summary.totalInterest - withExtras.summary.totalInterest),
    insuranceSaved: roundMoney(base.summary.totalInsurance - withExtras.summary.totalInsurance),
    otherChargesSaved: roundMoney(
      base.summary.totalOtherCharges - withExtras.summary.totalOtherCharges,
    ),
    totalCostSaved: roundMoney(base.summary.totalCost - withExtras.summary.totalCost),
    paymentsSaved: base.rows.length - rows.length,
    newPayment: lastExtra === -1 ? null : (rows[lastExtra + 1]?.payment ?? null),
  };
}
