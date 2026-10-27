import type { FormatLocale } from './format';

type Separator = '.' | ',';

const DECIMAL_SEPARATOR: Record<FormatLocale, Separator> = { 'es-EC': ',', 'en-US': '.' };
const DIGITS_IN_A_GROUP = 3;
const INNER_SPACES = /\s+/g;
const NUMBER_TEXT = /^-?[\d., ]+$/;
const ANY_DIGIT = /\d/;
const DIGITS_OR_EMPTY = /^\d*$/;
const THOUSANDS_LEAD = /^[1-9]\d{0,2}(?: \d{3})*$/;
const GROUPED_THOUSANDS = /^[1-9]\d{0,2}(?:(?:\.\d{3})+|(?:,\d{3})+|(?: \d{3})+)$/;

function count(text: string, separator: Separator): number {
  return text.split(separator).length - 1;
}

/** Which separator marks the decimals in `unsigned`, or null when it has no decimals. */
function decimalSeparatorOf(unsigned: string, locale: FormatLocale): Separator | null {
  const dots = count(unsigned, '.');
  const commas = count(unsigned, ',');
  if (dots > 0 && commas > 0) {
    return unsigned.lastIndexOf('.') > unsigned.lastIndexOf(',') ? '.' : ',';
  }
  if (dots + commas !== 1) return null;
  const separator: Separator = dots === 1 ? '.' : ',';
  const [before, after] = splitAtLast(unsigned, separator);
  const mayGroupThousands = THOUSANDS_LEAD.test(before) && after.length === DIGITS_IN_A_GROUP;
  return mayGroupThousands && separator !== DECIMAL_SEPARATOR[locale] ? null : separator;
}

/** `whole` without its thousands separators, or null when they are not every three digits. */
function ungroup(whole: string): string | null {
  if (DIGITS_OR_EMPTY.test(whole)) return whole;
  return GROUPED_THOUSANDS.test(whole) ? whole.replace(/[., ]/g, '') : null;
}

function splitAtLast(text: string, separator: Separator): [string, string] {
  const at = text.lastIndexOf(separator);
  return [text.slice(0, at), text.slice(at + 1)];
}

/**
 * Reads a number typed by the user, with `,` or `.` as the decimal separator.
 *
 * With both separators, the last one marks the decimals (`1.234,56`, `1,234.56`). A separator
 * that repeats groups thousands (`1.234.567`). A single one marks the decimals (`15,6`, `0,884`),
 * except when it could also group thousands: one to three digits not starting with 0, maybe
 * followed by space-grouped thousands, then exactly three (`10.000`, `1 000.000`). There the locale decides: `es-EC` reads `10.000` as ten thousand
 * and `10,000` as ten; `en-US` the other way around.
 *
 * Spaces at the ends are ignored. Spaces inside may only group thousands (`1 000`), so a typo
 * such as `1 5` is not read as 15.
 *
 * Returns `undefined` for empty text and `NaN` for text that is not a number, which `validate`
 * reports as `required` and `notANumber`.
 */
export function parseDecimal(text: string, locale: FormatLocale): number | undefined {
  const compact = text.trim().replace(INNER_SPACES, ' ');
  if (compact === '') return undefined;
  if (!NUMBER_TEXT.test(compact) || !ANY_DIGIT.test(compact)) return Number.NaN;

  const negative = compact.startsWith('-');
  const unsigned = negative ? compact.slice(1) : compact;
  const decimal = decimalSeparatorOf(unsigned, locale);
  const [whole, fraction] = decimal ? splitAtLast(unsigned, decimal) : [unsigned, ''];
  const wholeDigits = ungroup(whole);
  if (wholeDigits === null || !DIGITS_OR_EMPTY.test(fraction)) return Number.NaN;

  const value = Number(`${wholeDigits || '0'}.${fraction || '0'}`);
  return negative && value !== 0 ? -value : value;
}
