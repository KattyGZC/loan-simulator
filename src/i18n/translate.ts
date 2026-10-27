import type englishMessages from '../../public/_locales/en/messages.json';

export type MessageKey = keyof typeof englishMessages;

/**
 * The UI text for `key` in the browser's language. `substitutions` fill the message's
 * placeholders in order. A key missing in Spanish falls back to English, like Chrome does with
 * `default_locale`; `tests/i18n/messages.test.ts` fails when the languages differ. Throws when
 * no language has the key, instead of showing an empty label.
 */
export function t(key: MessageKey, substitutions: string[] = []): string {
  const message = browser.i18n.getMessage(key, substitutions);
  if (!message) throw new Error(`No message for "${key}"`);
  return message;
}

/** The browser's UI language, e.g. `es`, `es-419` or `en-US`. */
export function uiLanguage(): string {
  return browser.i18n.getUILanguage();
}
