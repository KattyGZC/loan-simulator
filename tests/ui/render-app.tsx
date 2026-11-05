import { render } from '@testing-library/preact';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { StoredState } from '@/entrypoints/sidepanel/App';
import { useLocale, type locales } from '../i18n/fake-i18n';

const NOTHING_STORED: StoredState = {
  drafts: { newLoan: undefined, existingLoan: undefined },
  scenarios: undefined,
  preferences: undefined,
};

let loadedLanguage: keyof typeof locales | undefined;

/**
 * Renders the side panel as `main.tsx` does, over WXT's fake browser and the real
 * `messages.json`, from what `stored` holds (nothing by default). The panel reads the browser
 * language once, when its modules load, so `App` is imported only after the language is set and
 * a test file renders in a single language: asking for another one throws.
 */
export async function renderApp(
  language: keyof typeof locales = 'en',
  stored: Partial<StoredState> = {},
) {
  if (loadedLanguage !== undefined && loadedLanguage !== language) {
    throw new Error(`This file already rendered the panel in "${loadedLanguage}".`);
  }
  loadedLanguage = language;
  fakeBrowser.reset();
  useLocale(language);
  const { App } = await import('@/entrypoints/sidepanel/App');
  const { t, uiLanguage } = await import('@/i18n/translate');
  document.documentElement.lang = uiLanguage();
  document.title = t('extName');
  return render(<App stored={{ ...NOTHING_STORED, ...stored }} />);
}
