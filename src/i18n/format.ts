/**
 * Locales the UI formats numbers and dates in. Spanish uses Ecuador's conventions
 * (`$1.234,56`), English the United States' (`$1,234.56`).
 */
export type FormatLocale = 'es-EC' | 'en-US';

/**
 * The currencies the user can show amounts in. Only ones with cents: the engine rounds every
 * amount to 2 decimals, so a currency without them (CLP, PYG) would show cents it does not have.
 */
export const CURRENCIES = [
  'USD',
  'EUR',
  'MXN',
  'GTQ',
  'HNL',
  'NIO',
  'CRC',
  'DOP',
  'COP',
  'PEN',
  'BOB',
  'ARS',
  'UYU',
  'BRL',
] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

const MONEY_DECIMALS = 2;
const PERCENT_DECIMALS = 2;

/** The format locale for a UI language such as `es`, `es-419` or `en-GB`. English otherwise. */
export function formatLocale(uiLanguage: string): FormatLocale {
  return uiLanguage.toLowerCase().startsWith('es') ? 'es-EC' : 'en-US';
}

export interface Format {
  /** `1234.5` → `$1.234,50` (es-EC) or `$1,234.50` (en-US), in USD. */
  money(amount: number): string;
  /** A rate already in percent: `15.6` → `15,6%` or `15.6%`. */
  percent(percent: number): string;
  /** A whole number with grouping: `1000000000` → `1.000.000.000` or `1,000,000,000`. */
  integer(value: number): string;
  /**
   * An ISO date from the engine (`2027-01-31`) → `31/01/2027` or `01/31/2027`. Throws a
   * `RangeError` on text that is not `YYYY-MM-DD`.
   */
  date(isoDate: string): string;
}

function moneyFormat(locale: FormatLocale, currency: CurrencyCode) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: MONEY_DECIMALS,
    maximumFractionDigits: MONEY_DECIMALS,
  });
}

/** The sign amounts in `currency` show, such as `$`, `€` or `Q`; the code when it has none. */
export function currencySymbol(locale: FormatLocale, currency: CurrencyCode): string {
  const parts = moneyFormat(locale, currency).formatToParts(0);
  return parts.find((part) => part.type === 'currency')?.value ?? currency;
}

/**
 * Formatters for `locale`, with amounts in `currency`. Create them once and reuse them:
 * building one is not cheap.
 */
export function createFormat(locale: FormatLocale, currency: CurrencyCode): Format {
  const money = moneyFormat(locale, currency);
  const percent = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'percent',
    maximumFractionDigits: PERCENT_DECIMALS,
  });
  const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const date = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return {
    money: (amount) => money.format(amount),
    percent: (value) => percent.format(value),
    integer: (value) => integer.format(value),
    date: (isoDate) => date.format(new Date(`${isoDate}T00:00:00Z`)),
  };
}
