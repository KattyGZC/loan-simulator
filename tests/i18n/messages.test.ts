import { describe, expect, it } from 'vitest';
import { locales } from './fake-i18n';

const { en, es } = locales;
const placeholdersOf = (message: string) =>
  [...message.matchAll(/\$(\w+)\$/g)].map(([, name]) => name!.toLowerCase()).sort();

describe('messages.json', () => {
  it('has the same keys in English and Spanish', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });

  it('uses the same placeholders in both languages', () => {
    for (const [key, { message }] of Object.entries(en)) {
      expect(placeholdersOf(es[key]!.message), key).toEqual(placeholdersOf(message));
    }
  });

  it('defines every placeholder a message uses', () => {
    for (const messages of [en, es]) {
      for (const [key, { message, placeholders = {} }] of Object.entries(messages)) {
        expect(Object.keys(placeholders).sort(), key).toEqual(placeholdersOf(message));
      }
    }
  });

  it('uses key names Chrome accepts and no empty messages', () => {
    for (const messages of [en, es]) {
      for (const [key, { message }] of Object.entries(messages)) {
        expect(key).toMatch(/^[A-Za-z0-9_]+$/);
        expect(message.trim(), key).not.toBe('');
      }
    }
  });
});
