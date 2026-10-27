import { CURRENCIES, type CurrencyCode, type FormatLocale } from '@/i18n/format';
import { storedFields } from '@/storage/stored-fields';

const DEFAULT_CURRENCY: CurrencyCode = 'USD';
const DEFAULT_SOLCA_PERCENT = 0.5;

/** What the user set once for every loan. SOLCA's two only set up a new-loan form. */
export interface Preferences {
  currency: CurrencyCode;
  solcaEnabled: boolean;
  /** As typed, like the form's field. */
  solcaPercent: string;
}

/** USD, and SOLCA on at 0.5 % written with the locale's decimal separator. */
export function defaultPreferences(locale: FormatLocale): Preferences {
  return {
    currency: DEFAULT_CURRENCY,
    solcaEnabled: true,
    solcaPercent: new Intl.NumberFormat(locale).format(DEFAULT_SOLCA_PERCENT),
  };
}

/** The stored preferences, with `defaults` for every one missing or invalid. */
export function restorePreferences(stored: unknown, defaults: Preferences): Preferences {
  const { text, flag, oneOf } = storedFields(stored);
  return {
    currency: oneOf('currency', CURRENCIES, defaults.currency),
    solcaEnabled: flag('solcaEnabled', defaults.solcaEnabled),
    solcaPercent: text('solcaPercent', defaults.solcaPercent),
  };
}
