import { useId } from 'preact/hooks';
import { CURRENCIES, DECIMAL_SIGNS, currencySymbol, type CurrencyCode } from '@/i18n/format';
import { parseDecimal } from '@/i18n/parse-number';
import { t } from '@/i18n/translate';
import { CheckboxField, NumberField, SelectField } from './fields';
import { locale } from './locale';
import type { Preferences } from './preferences';

/** `USD · $`, or the code alone when the currency has no sign of its own. */
function currencyLabel(currency: CurrencyCode): string {
  const symbol = currencySymbol(locale, currency);
  return symbol === currency ? currency : `${currency} · ${symbol}`;
}

interface PreferencesFormProps {
  preferences: Preferences;
  onChange: (preferences: Preferences) => void;
}

/** The currency of every amount, the decimal sign of exported files, and how SOLCA starts. */
export function PreferencesForm({ preferences, onChange }: PreferencesFormProps) {
  const titleId = useId();
  const update = (changes: Partial<Preferences>) => onChange({ ...preferences, ...changes });
  // Empty is fine: a new loan then starts with no SOLCA percent, as an emptied field does.
  const typedSolcaPercent = parseDecimal(preferences.solcaPercent, locale);
  const solcaPercentIsNumber = !Number.isNaN(typedSolcaPercent ?? 0);

  return (
    <section class="preferences" aria-labelledby={titleId}>
      <h2 id={titleId}>{t('section_preferences')}</h2>
      <SelectField
        label={t('field_currency')}
        value={preferences.currency}
        options={CURRENCIES.map((value) => ({ value, label: currencyLabel(value) }))}
        onChange={(currency) => update({ currency })}
      />
      <SelectField
        label={t('field_fileDecimalSign')}
        value={preferences.fileDecimalSign}
        options={DECIMAL_SIGNS.map((value) => ({ value, label: t(`decimalSign_${value}`) }))}
        onChange={(fileDecimalSign) => update({ fileDecimalSign })}
      />
      <CheckboxField
        label={t('field_solcaByDefault')}
        checked={preferences.solcaEnabled}
        onChange={(solcaEnabled) => update({ solcaEnabled })}
      />
      {preferences.solcaEnabled && (
        <NumberField
          label={t('field_solcaPercent')}
          inputMode="decimal"
          value={preferences.solcaPercent}
          onInput={(solcaPercent) => update({ solcaPercent })}
          error={
            solcaPercentIsNumber
              ? undefined
              : { message: t('validation_notANumber'), required: false }
          }
        />
      )}
      <p class="note">{t('preferences_note')}</p>
    </section>
  );
}
