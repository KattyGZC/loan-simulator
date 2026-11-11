import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';
import type { LoanSummary } from '@/core';
import { t } from '@/i18n/translate';
import { format } from './locale';
import { summaryLines } from './results';

interface SummaryProps {
  summary: LoanSummary;
  /** One payment for the whole loan (French, insurance inside it); otherwise first and last. */
  fixedPayment: boolean;
  /** Shown beside the heading: the results menu. */
  menu: ComponentChildren;
}

/** The loan as offered: payment, amount received, totals and both annual rates. */
export function Summary({ summary, fixedPayment, menu }: SummaryProps) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <div class="section-header">
        <h2 id={titleId}>{t('section_summary')}</h2>
        {menu}
      </div>
      <dl class="summary">
        {summaryLines(summary, fixedPayment, format).map(({ label, value }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
