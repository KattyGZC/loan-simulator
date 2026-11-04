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

/**
 * The decimal sign of the numbers in an exported file. It must match the spreadsheet's, which
 * follows the computer's regional settings, not the UI language: Spanish in Ecuador uses a
 * comma, Spanish in Mexico a point.
 */
export const DECIMAL_SIGNS = ['comma', 'point'] as const;
export type DecimalSign = (typeof DECIMAL_SIGNS)[number];

const MONEY_DECIMALS = 2;
const PERCENT_DECIMALS = 2;

/** The decimal sign `locale` writes numbers with: a comma in es-EC, a point in en-US. */
export function decimalSignOf(locale: FormatLocale): DecimalSign {
  return locale === 'es-EC' ? 'comma' : 'point';
}

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

function percentFormat(locale: FormatLocale, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'percent',
    maximumFractionDigits: PERCENT_DECIMALS,
    ...options,
  });
}

function integerFormat(locale: FormatLocale, options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0, ...options });
}

function dateFormat(locale: FormatLocale) {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** The day an engine ISO date names, at midnight UTC. Invalid on text that is not one. */
function utcDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

/**
 * Formatters for `locale`, with amounts in `currency`. Create them once and reuse them:
 * building one is not cheap.
 */
export function createFormat(locale: FormatLocale, currency: CurrencyCode): Format {
  const money = moneyFormat(locale, currency);
  const percent = percentFormat(locale);
  const integer = integerFormat(locale);
  const date = dateFormat(locale);
  return {
    money: (amount) => money.format(amount),
    percent: (value) => percent.format(value),
    integer: (value) => integer.format(value),
    date: (isoDate) => date.format(utcDay(isoDate)),
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `isoDate` itself, once it is a real `YYYY-MM-DD` date. Throws a `RangeError` otherwise. */
function checkedIsoDate(isoDate: string): string {
  const day = utcDay(isoDate);
  // A day past the month's end (2027-02-30) rolls over to the next month instead of failing.
  const isRealDate =
    ISO_DATE.test(isoDate) && !Number.isNaN(day.getTime()) && day.toISOString().startsWith(isoDate);
  if (!isRealDate) throw new RangeError(`Not an ISO date: ${isoDate}`);
  return isoDate;
}

// A spreadsheet reads a grouped number as text, or `1.234` as one point two three four.
const UNGROUPED: Intl.NumberFormatOptions = { useGrouping: false };

// The two locales write ungrouped numbers the same but for the decimal sign.
const FILE_NUMBER_LOCALE: Record<DecimalSign, FormatLocale> = { comma: 'es-EC', point: 'en-US' };

/**
 * How an exported file writes values, so a spreadsheet whose decimal sign is `decimalSign`
 * reads them as numbers and dates: amounts without a currency sign (the file names its
 * currency once) or thousands separators, `1234,50` or `1234.50`; rates as `15,6%` or
 * `15.6%`; dates as ISO `2027-01-31`. A date that is not `YYYY-MM-DD` throws a `RangeError`,
 * as on screen.
 */
export function createFileFormat(decimalSign: DecimalSign): Format {
  const locale = FILE_NUMBER_LOCALE[decimalSign];
  const money = new Intl.NumberFormat(locale, {
    minimumFractionDigits: MONEY_DECIMALS,
    maximumFractionDigits: MONEY_DECIMALS,
    ...UNGROUPED,
  });
  const percent = percentFormat(locale, UNGROUPED);
  const integer = integerFormat(locale, UNGROUPED);
  return {
    money: (amount) => money.format(amount),
    percent: (value) => percent.format(value),
    integer: (value) => integer.format(value),
    date: checkedIsoDate,
  };
}
