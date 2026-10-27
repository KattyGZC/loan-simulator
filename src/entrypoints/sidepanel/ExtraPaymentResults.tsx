import { useId } from 'preact/hooks';
import type { PaymentsSummary } from '@/core';
import { t, type MessageKey } from '@/i18n/translate';
import type { ExistingLoanSimulation } from './existing-form';
import { format } from './locale';

/** How the extra payment splits into accrued interest and principal, and the balance left. */
export function AppliedExtraPayment({ simulation }: { simulation: ExistingLoanSimulation }) {
  const { extraPayment, withExtraPayment } = simulation;
  const dueDate = withExtraPayment.rows[extraPayment.paymentNumber - 1]?.date;
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId}>{t('section_appliedExtraPayment')}</h2>
      <dl class="summary">
        <div>
          <dt>{t('applied_accruedInterest', [format.date(extraPayment.date)])}</dt>
          <dd>{format.money(extraPayment.accruedInterest)}</dd>
        </div>
        <div>
          <dt>{t('applied_principal')}</dt>
          <dd>{format.money(extraPayment.principal)}</dd>
        </div>
        <div>
          <dt>{t('applied_balance')}</dt>
          <dd>{format.money(extraPayment.balance)}</dd>
        </div>
      </dl>
      {extraPayment.balance > 0 && extraPayment.duePrincipal === 0 && dueDate && (
        <p class="note">
          {t('applied_note', [format.integer(extraPayment.paymentNumber), format.date(dueDate)])}
        </p>
      )}
    </section>
  );
}

interface ComparisonLine {
  label: MessageKey;
  value: (summary: PaymentsSummary) => string;
}

function moneyLine(label: MessageKey, amount: (summary: PaymentsSummary) => number) {
  return { label, value: (summary: PaymentsSummary) => format.money(amount(summary)) };
}

function shownIf(shown: boolean, line: ComparisonLine): ComparisonLine[] {
  return shown ? [line] : [];
}

/** The lines both schedules share, insurance and other charges only when the loan has them. */
function comparisonLines(without: PaymentsSummary): ComparisonLine[] {
  return [
    { label: 'summary_paymentCount', value: (summary) => format.integer(summary.paymentCount) },
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

/** The rest of the loan without and with the extra payment, and what it saves. */
export function Comparison({ simulation }: { simulation: ExistingLoanSimulation }) {
  const { comparison } = simulation;
  const without = simulation.withoutExtraPayment.summary;
  const withExtra = simulation.withExtraPayment.summary;
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId}>{t('section_comparison')}</h2>
      <dl class="summary savings">
        <div>
          <dt>{t('saved_cost')}</dt>
          <dd>{format.money(comparison.totalCostSaved)}</dd>
        </div>
        {comparison.paymentsSaved > 0 && (
          <div>
            <dt>{t('saved_payments')}</dt>
            <dd>{format.integer(comparison.paymentsSaved)}</dd>
          </div>
        )}
        {comparison.newPayment !== null && (
          <div>
            <dt>{t('saved_newPayment')}</dt>
            <dd>{format.money(comparison.newPayment)}</dd>
          </div>
        )}
      </dl>
      <table class="comparison">
        <thead>
          <tr>
            <td />
            <th scope="col">{t('column_without')}</th>
            <th scope="col">{t('column_with')}</th>
          </tr>
        </thead>
        <tbody>
          {comparisonLines(without).map(({ label, value }) => (
            <tr key={label}>
              <th scope="row">{t(label)}</th>
              <td>{value(without)}</td>
              <td>{value(withExtra)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
