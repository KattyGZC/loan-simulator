import type {
  ExistingLoanWarning,
  LoanSummary,
  PaymentsSummary,
  ScheduleRow,
  SimulationWarning,
} from '@/core';
import type { Format } from '@/i18n/format';
import { t, type MessageKey } from '@/i18n/translate';
import type { ExistingLoanSimulation } from './existing-form';

/** A labelled value of the results, written with the formatter it was built with. */
export interface Line {
  label: string;
  value: string;
}

/** A column of the schedule: its header and what each row shows in it. */
export interface Column {
  label: string;
  cell: (row: ScheduleRow) => string;
}

/** A line of the comparison: the rest of the loan without and with the extra payment. */
export interface ExtraPaymentComparisonLine {
  label: string;
  without: string;
  with: string;
}

/** The schedule a table or a file shows: its rows and the totals that decide its columns. */
export interface ResultSchedule {
  rows: readonly ScheduleRow[];
  summary: PaymentsSummary;
}

/** A notice about the results of either simulator. */
export type Warning = SimulationWarning | ExistingLoanWarning;

function warningText(warning: Warning, format: Format): string {
  switch (warning.code) {
    case 'rateAboveMaximum':
      return t('warning_rateAboveMaximum', [
        format.percent(warning.effectiveRate),
        format.percent(warning.maxRate),
      ]);
    case 'extraPaymentClipped':
      return t('warning_extraPaymentClipped', [format.money(warning.appliedAmount)]);
    case 'paymentDoesNotFitTerm':
      return t('warning_paymentDoesNotFitTerm', [
        format.integer(warning.paymentCount),
        format.money(warning.lastPayment),
      ]);
  }
}

/** Notices about the results: a rate above the maximum, an extra payment cut, a payment off. */
export function warningTexts(warnings: readonly Warning[], format: Format): string[] {
  return warnings.map((warning) => warningText(warning, format));
}

function shownIf<T>(shown: boolean, item: T): T[] {
  return shown ? [item] : [];
}

/** The columns this schedule needs: date, insurance and other charges only if it has them. */
export function scheduleColumns({ rows, summary }: ResultSchedule, format: Format): Column[] {
  const moneyColumn = (label: MessageKey, amount: (row: ScheduleRow) => number): Column => ({
    label: t(label),
    cell: (row) => format.money(amount(row)),
  });
  const dateColumn: Column = {
    label: t('column_date'),
    cell: (row) => (row.date ? format.date(row.date) : ''),
  };
  return [
    ...shownIf(rows[0]?.date != null, dateColumn),
    moneyColumn('column_payment', (row) => row.payment),
    moneyColumn('column_principal', (row) => row.principal),
    moneyColumn('column_interest', (row) => row.interest),
    ...shownIf(
      summary.totalInsurance > 0,
      moneyColumn('column_insurance', (row) => row.insurance),
    ),
    ...shownIf(
      summary.totalOtherCharges > 0,
      moneyColumn('column_otherCharges', (row) => row.otherCharges),
    ),
    moneyColumn('column_balance', (row) => row.balance),
  ];
}

/**
 * The loan as offered: payment, amount received, totals and both annual rates. `fixedPayment`
 * shows one payment for the whole loan (French, insurance inside it); otherwise first and last.
 * Insurance, other charges and SOLCA only when the loan has them.
 */
export function summaryLines(summary: LoanSummary, fixedPayment: boolean, format: Format): Line[] {
  const line = (label: MessageKey, value: string): Line => ({ label: t(label), value });
  const optionalAmount = (label: MessageKey, amount: number) =>
    shownIf(amount !== 0, line(label, format.money(amount)));
  const payments = fixedPayment
    ? [line('summary_payment', format.money(summary.firstPayment))]
    : [
        line('summary_firstPayment', format.money(summary.firstPayment)),
        line('summary_lastPayment', format.money(summary.lastPayment)),
      ];
  return [
    ...payments,
    line('summary_paymentCount', format.integer(summary.paymentCount)),
    line('summary_amountReceived', format.money(summary.amountReceived)),
    line('summary_totalInterest', format.money(summary.totalInterest)),
    ...optionalAmount('summary_totalInsurance', summary.totalInsurance),
    ...optionalAmount('summary_totalOtherCharges', summary.totalOtherCharges),
    ...optionalAmount('summary_solca', summary.solca),
    line('summary_totalCost', format.money(summary.totalCost)),
    line('summary_totalPaid', format.money(summary.totalPaid)),
    line('summary_nominalRate', format.percent(summary.nominalRate)),
    line('summary_effectiveRate', format.percent(summary.effectiveRate)),
  ];
}

/** How the extra payment splits into accrued interest and principal, and the balance left. */
export function appliedExtraPaymentLines(
  { extraPayment }: ExistingLoanSimulation,
  format: Format,
): Line[] {
  return [
    {
      label: t('applied_accruedInterest', [format.date(extraPayment.date)]),
      value: format.money(extraPayment.accruedInterest),
    },
    { label: t('applied_principal'), value: format.money(extraPayment.principal) },
    { label: t('applied_balance'), value: format.money(extraPayment.balance) },
  ];
}

/**
 * When the extra payment also covers the principal of the payment it falls before, which then
 * charges only interest: that payment's number and due date. Null otherwise, or when it ends
 * the loan.
 */
export function appliedExtraPaymentNote(
  { extraPayment, withExtraPayment }: ExistingLoanSimulation,
  format: Format,
): string | null {
  const dueDate = withExtraPayment.rows[extraPayment.paymentNumber - 1]?.date;
  if (extraPayment.balance === 0 || extraPayment.duePrincipal > 0 || !dueDate) return null;
  return t('applied_note', [format.integer(extraPayment.paymentNumber), format.date(dueDate)]);
}

/** What the extra payment saves: the cost, and the payments and new payment when it has them. */
export function savingsLines({ comparison }: ExistingLoanSimulation, format: Format): Line[] {
  return [
    { label: t('saved_cost'), value: format.money(comparison.totalCostSaved) },
    ...shownIf(comparison.paymentsSaved > 0, {
      label: t('saved_payments'),
      value: format.integer(comparison.paymentsSaved),
    }),
    ...(comparison.newPayment === null
      ? []
      : [{ label: t('saved_newPayment'), value: format.money(comparison.newPayment) }]),
  ];
}

/** The lines both schedules share, insurance and other charges only when the loan has them. */
export function comparisonLines(
  simulation: ExistingLoanSimulation,
  format: Format,
): ExtraPaymentComparisonLine[] {
  const without = simulation.withoutExtraPayment.summary;
  const withExtra = simulation.withExtraPayment.summary;
  const line = (
    label: MessageKey,
    value: (summary: PaymentsSummary) => string,
  ): ExtraPaymentComparisonLine => ({
    label: t(label),
    without: value(without),
    with: value(withExtra),
  });
  const moneyLine = (label: MessageKey, amount: (summary: PaymentsSummary) => number) =>
    line(label, (summary) => format.money(amount(summary)));
  return [
    line('summary_paymentCount', (summary) => format.integer(summary.paymentCount)),
    moneyLine('summary_totalInterest', (summary) => summary.totalInterest),
    ...shownIf(
      without.totalInsurance > 0,
      moneyLine('summary_totalInsurance', (summary) => summary.totalInsurance),
    ),
    ...shownIf(
      without.totalOtherCharges > 0,
      moneyLine('summary_totalOtherCharges', (summary) => summary.totalOtherCharges),
    ),
    moneyLine('summary_totalPaid', (summary) => summary.totalPaid),
  ];
}
