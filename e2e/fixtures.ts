import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  test as base,
  chromium,
  type BrowserContext,
  type Page,
  type Worker,
} from '@playwright/test';

/** What `npm run build` writes: the unpacked extension the browser loads. */
const EXTENSION_DIR = path.resolve(import.meta.dirname, '../.output/chrome-mv3');

/** A page about as wide as the side panel, which the layout is sized for (360px at least). */
const PANEL_SIZE = { width: 400, height: 900 };

interface ExtensionFixtures {
  context: BrowserContext;
  /** The extension's background script, once Chrome has started it. */
  serviceWorker: Worker;
  extensionId: string;
  /** The side panel page, opened in a tab of its own: Playwright cannot click the toolbar icon. */
  panel: Page;
}

/**
 * Each test gets a new browser profile with the built extension loaded, in English, so nothing
 * stored by one test reaches the next.
 */
export const test = base.extend<ExtensionFixtures>({
  context: async ({ headless }, use) => {
    if (!existsSync(path.join(EXTENSION_DIR, 'manifest.json'))) {
      throw new Error(`No extension in ${EXTENSION_DIR}: run "npm run build" first.`);
    }
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless,
      viewport: PANEL_SIZE,
      args: [
        `--disable-extensions-except=${EXTENSION_DIR}`,
        `--load-extension=${EXTENSION_DIR}`,
        // chrome.i18n follows the browser language: --lang on Windows, LANGUAGE on Linux.
        '--lang=en-US',
      ],
      env: { ...process.env, LANGUAGE: 'en' },
    });
    await use(context);
    await context.close();
  },
  serviceWorker: async ({ context }, use) => {
    await use(context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker')));
  },
  extensionId: async ({ serviceWorker }, use) => {
    await use(new URL(serviceWorker.url()).host);
  },
  panel: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await use(page);
  },
});

export { expect } from '@playwright/test';
