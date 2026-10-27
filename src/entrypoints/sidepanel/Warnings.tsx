import type { ExistingLoanWarning, SimulationWarning } from '@/core';
import { t } from '@/i18n/translate';
import { format } from './locale';

type Warning = SimulationWarning | ExistingLoanWarning;

function warningText(warning: Warning): string {
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
export function Warnings({ warnings }: { warnings: readonly Warning[] }) {
  if (warnings.length === 0) return null;
  return (
    <div role="status">
      <ul class="warnings">
        {warnings.map((warning) => {
          const text = warningText(warning);
          return <li key={text}>{text}</li>;
        })}
      </ul>
    </div>
  );
}
