import { describe, expect, it } from 'vitest';
import { parseDecimal } from '@/i18n/parse-number';

describe('parseDecimal', () => {
  it.each([
    ['15,6', 15.6],
    ['15.6', 15.6],
    ['0,884', 0.884],
    ['0.884', 0.884],
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['1.234.567', 1234567],
    ['1,234,567.8', 1234567.8],
    ['10000', 10000],
    [' 2 500,5 ', 2500.5],
    ['1 000 000', 1000000],
    [',5', 0.5],
    ['-1,5', -1.5],
  ])('reads %s as %d in both locales', (text, value) => {
    expect(parseDecimal(text, 'es-EC')).toBe(value);
    expect(parseDecimal(text, 'en-US')).toBe(value);
  });

  it('lets the locale decide a single separator before exactly three digits', () => {
    expect(parseDecimal('10.000', 'es-EC')).toBe(10000);
    expect(parseDecimal('10,000', 'es-EC')).toBe(10);
    expect(parseDecimal('10,000', 'en-US')).toBe(10000);
    expect(parseDecimal('10.000', 'en-US')).toBe(10);
    expect(parseDecimal('1 000.000', 'en-US')).toBe(1000);
    expect(parseDecimal('1 000.000', 'es-EC')).toBeNaN();
  });

  it('reads minus zero as zero, so it never prints as -$0.00', () => {
    expect(Object.is(parseDecimal('-0', 'es-EC'), 0)).toBe(true);
    expect(Object.is(parseDecimal('-0,00', 'en-US'), 0)).toBe(true);
  });

  it('returns undefined for empty text', () => {
    expect(parseDecimal('', 'es-EC')).toBeUndefined();
    expect(parseDecimal('   ', 'en-US')).toBeUndefined();
  });

  it.each([
    'abc',
    '12a',
    '$100',
    '-',
    '.',
    '1,2,3',
    '1.23.4',
    '1.234,5.6',
    '12,34,567',
    '0.123.456',
    '1 5',
    '1000 50',
    '1,5 0',
    '- 5',
    '--1',
  ])('returns NaN for %s', (text) => {
    expect(parseDecimal(text, 'es-EC')).toBeNaN();
    expect(parseDecimal(text, 'en-US')).toBeNaN();
  });
});
