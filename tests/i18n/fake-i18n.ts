import { vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import english from '../../public/_locales/en/messages.json';
import spanish from '../../public/_locales/es/messages.json';

interface ChromeMessage {
  message: string;
  placeholders?: Record<string, { content: string }>;
}

export const locales: Record<'en' | 'es', Record<string, ChromeMessage>> = {
  en: english,
  es: spanish,
};

function find(messages: Record<string, ChromeMessage>, key: string): ChromeMessage | undefined {
  const name = key.toLowerCase();
  return Object.entries(messages).find(([candidate]) => candidate.toLowerCase() === name)?.[1];
}

/**
 * `chrome.i18n.getMessage` over our `messages.json`, resolved as Chrome does: names ignore case,
 * a key missing in `language` falls back to English (`default_locale`), `$name$` takes its
 * placeholder's content, `$1`…`$9` take the substitutions, in a placeholder or in the message
 * itself, `$$` is a `$`, and a key no language has gives an empty string. So `$10` reads as the
 * first substitution and a `0`, as in Chrome: a written dollar sign must be `$$`.
 */
export function useLocale(language: keyof typeof locales): void {
  vi.spyOn(fakeBrowser.i18n, 'getUILanguage').mockReturnValue(language);
  vi.spyOn(fakeBrowser.i18n, 'getMessage').mockImplementation(
    (key: string, substitutions?: string | (string | number)[]) => {
      const entry = find(locales[language], key) ?? find(locales.en, key);
      if (!entry) return '';
      const values = typeof substitutions === 'string' ? [substitutions] : (substitutions ?? []);
      const text = values.map(String);
      const substitute = (position: string) => text[Number(position) - 1] ?? '';
      return entry.message.replace(
        /\$\$|\$(\d)|\$(\w+)\$/g,
        (_, position?: string, name?: string) => {
          if (position !== undefined) return substitute(position);
          if (name === undefined) return '$';
          const content = entry.placeholders?.[name.toLowerCase()]?.content ?? '';
          return content.replace(/\$(\d)/g, (__, digit: string) => substitute(digit));
        },
      );
    },
  );
}
