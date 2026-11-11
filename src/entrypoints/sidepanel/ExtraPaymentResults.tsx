import type { ComponentChildren } from 'preact';
import { useId } from 'preact/hooks';
import { t } from '@/i18n/translate';
import type { ExistingLoanSimulation } from './existing-form';
import { format } from './locale';
import {
  appliedExtraPaymentLines,
  appliedExtraPaymentNote,
  comparisonLines,
  savingsLines,
} from './results';

interface AppliedExtraPaymentProps {
  simulation: ExistingLoanSimulation;
  /** Shown beside the heading: the results menu. */
  menu: ComponentChildren;
}

/** How the extra payment splits into accrued interest and principal, and the balance left. */
export function AppliedExtraPayment({ simulation, menu }: AppliedExtraPaymentProps) {
  const note = appliedExtraPaymentNote(simulation, format);
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <div class="section-header">
        <h2 id={titleId}>{t('section_appliedExtraPayment')}</h2>
        {menu}
      </div>
      <dl class="summary">
        {appliedExtraPaymentLines(simulation, format).map(({ label, value }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {note && <p class="note">{note}</p>}
    </section>
  );
}

/** The rest of the loan without and with the extra payment, and what it saves. */
export function Comparison({ simulation }: { simulation: ExistingLoanSimulation }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId}>{t('section_comparison')}</h2>
      <dl class="summary savings">
        {savingsLines(simulation, format).map(({ label, value }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <table class="comparison" aria-labelledby={titleId}>
        <thead>
          <tr>
            <td />
            <th scope="col">{t('column_without')}</th>
            <th scope="col">{t('column_with')}</th>
          </tr>
        </thead>
        <tbody>
          {comparisonLines(simulation, format).map((line) => (
            <tr key={line.label}>
              <th scope="row">{line.label}</th>
              <td>{line.without}</td>
              <td>{line.with}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
