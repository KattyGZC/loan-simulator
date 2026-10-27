import { useId } from 'preact/hooks';
import type { LoanSummary } from '@/core';
import { t, type MessageKey } from '@/i18n/translate';
import { format } from './locale';

interface SummaryProps {
  summary: LoanSummary;
  /** One payment for the whole loan (French, insurance inside it); otherwise first and last. */
  fixedPayment: boolean;
}

interface Line {
  label: MessageKey;
  value: string;
}

function paymentLines(summary: LoanSummary, fixedPayment: boolean): Line[] {
  if (fixedPayment)
    return [{ label: 'summary_payment', value: format.money(summary.firstPayment) }];
  return [
    { label: 'summary_firstPayment', value: format.money(summary.firstPayment) },
    { label: 'summary_lastPayment', value: format.money(summary.lastPayment) },
  ];
}

/** The line for an amount the loan may not have, left out when it is zero. */
function optionalAmountLine(label: MessageKey, amount: number): Line[] {
  return amount === 0 ? [] : [{ label, value: format.money(amount) }];
}

/** The loan as offered: payment, amount received, totals and both annual rates. */
export function Summary({ summary, fixedPayment }: SummaryProps) {
  const lines: Line[] = [
    ...paymentLines(summary, fixedPayment),
    { label: 'summary_paymentCount', value: format.integer(summary.paymentCount) },
    { label: 'summary_amountReceived', value: format.money(summary.amountReceived) },
    { label: 'summary_totalInterest', value: format.money(summary.totalInterest) },
    ...optionalAmountLine('summary_totalInsurance', summary.totalInsurance),
    ...optionalAmountLine('summary_totalOtherCharges', summary.totalOtherCharges),
    ...optionalAmountLine('summary_solca', summary.solca),
    { label: 'summary_totalCost', value: format.money(summary.totalCost) },
    { label: 'summary_totalPaid', value: format.money(summary.totalPaid) },
    { label: 'summary_nominalRate', value: format.percent(summary.nominalRate) },
    { label: 'summary_effectiveRate', value: format.percent(summary.effectiveRate) },
  ];
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId}>{t('section_summary')}</h2>
      <dl class="summary">
        {lines.map(({ label, value }) => (
          <div key={label}>
            <dt>{t(label)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
