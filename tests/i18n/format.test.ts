import { describe, expect, it } from 'vitest';
import {
  CURRENCIES,
  createFormat,
  createFileFormat,
  currencySymbol,
  decimalSignOf,
  formatLocale,
} from '@/i18n/format';

describe('formatLocale', () => {
  it.each([
    ['es', 'es-EC'],
    ['es-419', 'es-EC'],
    ['ES-es', 'es-EC'],
    ['en', 'en-US'],
    ['en-GB', 'en-US'],
    ['fr', 'en-US'],
  ] as const)('formats %s as %s', (language, locale) => {
    expect(formatLocale(language)).toBe(locale);
  });
});

describe('currencies', () => {
  it('formats money in the chosen currency, always with two decimals', () => {
    expect(createFormat('es-EC', 'EUR').money(1234.5)).toBe('€1.234,50');
    // Intl puts a no-break space after the Q.
    expect(createFormat('en-US', 'GTQ').money(1234.5)).toBe('Q 1,234.50');
    expect(createFormat('es-EC', 'COP').money(1234)).toBe('$1.234,00');
  });

  it('gives the sign of each currency', () => {
    expect(currencySymbol('es-EC', 'USD')).toBe('$');
    expect(currencySymbol('en-US', 'BRL')).toBe('R$');
  });

  it('falls back to the code for a currency without a sign of its own', () => {
    expect(currencySymbol('es-EC', 'PEN')).toBe('PEN');
  });

  it('lists every currency once', () => {
    expect(new Set(CURRENCIES).size).toBe(CURRENCIES.length);
  });
});

describe('createFormat', () => {
  const es = createFormat('es-EC', 'USD');
  const en = createFormat('en-US', 'USD');

  it('formats money in dollars with two decimals', () => {
    expect(es.money(1234.5)).toBe('$1.234,50');
    expect(en.money(1234.5)).toBe('$1,234.50');
    expect(es.money(0)).toBe('$0,00');
  });

  it('formats a rate already in percent, with up to two decimals', () => {
    expect(es.percent(15.6)).toBe('15,6%');
    expect(en.percent(16.765236)).toBe('16.77%');
  });

  it('formats whole numbers with grouping', () => {
    expect(es.integer(1e9)).toBe('1.000.000.000');
    expect(en.integer(1e9)).toBe('1,000,000,000');
  });

  it('formats ISO dates as day, month and year without shifting the day', () => {
    expect(es.date('2027-01-31')).toBe('31/01/2027');
    expect(en.date('2027-01-31')).toBe('01/31/2027');
  });
});

describe('createFileFormat', () => {
  const point = createFileFormat('point');
  const comma = createFileFormat('comma');

  it('writes amounts with its decimal sign, no currency sign and no grouping', () => {
    expect(point.money(1234567.5)).toBe('1234567.50');
    expect(comma.money(1234567.5)).toBe('1234567,50');
    expect(point.money(0)).toBe('0.00');
  });

  it('writes rates with a percent sign, whole numbers ungrouped and dates as ISO', () => {
    expect(point.percent(15.6)).toBe('15.6%');
    expect(comma.percent(15.6)).toBe('15,6%');
    expect(point.integer(1200)).toBe('1200');
    expect(comma.integer(1200)).toBe('1200');
    expect(comma.date('2027-01-31')).toBe('2027-01-31');
  });

  it('throws on a date that is not YYYY-MM-DD, as the screen does', () => {
    expect(() => point.date('31/01/2027')).toThrow(RangeError);
    expect(() => point.date('2027-1-31')).toThrow(RangeError);
    expect(() => point.date('2027-13-01')).toThrow(RangeError);
    expect(() => point.date('2027-02-30')).toThrow(RangeError);
    expect(() => point.date('2027-02-29')).toThrow(RangeError);
    expect(point.date('2028-02-29')).toBe('2028-02-29');
  });
});

describe('decimalSignOf', () => {
  it('is a comma in Spanish and a point in English', () => {
    expect(decimalSignOf('es-EC')).toBe('comma');
    expect(decimalSignOf('en-US')).toBe('point');
  });
});
