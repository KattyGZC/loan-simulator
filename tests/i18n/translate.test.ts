import { describe, expect, it } from 'vitest';
import { t, uiLanguage, type MessageKey } from '@/i18n/translate';
import { useLocale } from './fake-i18n';

describe('t', () => {
  it('returns the message in the browser language', () => {
    useLocale('es');
    expect(t('extName')).toBe('Simulador de Créditos');
    useLocale('en');
    expect(t('extName')).toBe('Loan Simulator');
  });

  it('fills the placeholders in order', () => {
    useLocale('en');
    expect(t('validation_outOfRange', ['1', '360'])).toBe('Enter a value from 1 to 360.');
  });

  it('finds keys ignoring case, as Chrome does', () => {
    useLocale('es');
    expect(t('EXTNAME' as MessageKey)).toBe('Simulador de Créditos');
  });

  it('throws when Chrome has no message for the key', () => {
    useLocale('en');
    expect(() => t('missing' as MessageKey)).toThrow('No message for "missing"');
  });
});

describe('uiLanguage', () => {
  it('is the browser UI language', () => {
    useLocale('es');
    expect(uiLanguage()).toBe('es');
  });
});
