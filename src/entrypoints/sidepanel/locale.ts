import { createFormat, formatLocale, type CurrencyCode, type Format } from '@/i18n/format';
import { uiLanguage } from '@/i18n/translate';

/** The locale the panel reads and writes numbers in, from the browser's language. */
export const locale = formatLocale(uiLanguage());

let shownCurrency: CurrencyCode = 'USD';
let current = createFormat(locale, shownCurrency);

/**
 * Shows amounts in `currency` from the next render on. The app calls it as it renders, before
 * any amount, so every component keeps importing one `format` instead of threading it through.
 */
export function showAmountsIn(currency: CurrencyCode) {
  if (currency === shownCurrency) return;
  shownCurrency = currency;
  current = createFormat(locale, currency);
}

/** The panel's formatters, with amounts in the currency the user prefers. */
export const format: Format = {
  money: (amount) => current.money(amount),
  percent: (value) => current.percent(value),
  integer: (value) => current.integer(value),
  date: (isoDate) => current.date(isoDate),
};
