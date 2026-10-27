import { describe, expect, it } from 'vitest';
import { CURRENCIES, createFormat, currencySymbol, formatLocale } from '@/i18n/format';

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
