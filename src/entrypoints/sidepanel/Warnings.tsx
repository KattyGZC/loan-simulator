import type { SimulationWarning } from '@/core';
import { t } from '@/i18n/translate';
import { format } from './locale';

function warningText(warning: SimulationWarning): string {
  switch (warning.code) {
    case 'rateAboveMaximum':
      return t('warning_rateAboveMaximum', [
        format.percent(warning.effectiveRate),
        format.percent(warning.maxRate),
      ]);
    case 'extraPaymentClipped':
      return t('warning_extraPaymentClipped', [
        String(warning.index + 1),
        format.money(warning.appliedAmount),
      ]);
    case 'extraPaymentIgnored':
      return t('warning_extraPaymentIgnored', [String(warning.index + 1)]);
  }
}

/** Notices about the simulation: a rate above the segment maximum, or extra payments adjusted. */
export function Warnings({ warnings }: { warnings: readonly SimulationWarning[] }) {
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
