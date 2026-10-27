import { describe, expect, it } from 'vitest';
import { createFormat, formatLocale } from '@/i18n/format';

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

describe('createFormat', () => {
  const es = createFormat('es-EC');
  const en = createFormat('en-US');

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
