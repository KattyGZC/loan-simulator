/**
 * The Chrome Web Store images, from the build: five 1280×800 screenshots and a 440×280 promo tile
 * per language, in store/images/<language>/. Run `npm run build`, then `npm run store:images`.
 *
 * The panel is opened in a tab of its own (Playwright cannot click the toolbar icon) with its
 * forms and scenarios seeded in storage, captured at twice its size, and placed in a frame with a
 * caption. Playwright writes 24-bit PNGs without an alpha channel, as the store asks.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXTENSION_DIR = path.join(ROOT, '.output/chrome-mv3');
const OUT_DIR = path.join(ROOT, 'store/images');
const FONTS_DIR = path.join(ROOT, 'src/assets/fonts');

const SCREENSHOT = { width: 1280, height: 800 };
const PROMO_TILE = { width: 440, height: 280 };
/** The panel as wide as the layout is designed for, captured at 2× so it stays sharp at 1.1×. */
const PANEL = { width: 400, height: 660 };
const PANEL_SCALE = 2;
const PANEL_SHOWN_WIDTH = 440;
/** What a shot scrolls to sits this far below the top of the capture. */
const SCROLL_MARGIN = 16;
/** SCHEMA_VERSION in src/storage/versioned.ts: the panel ignores a draft with another one. */
const SCHEMA_VERSION = 1;

/** The panel's palette (src/styles/theme.css) for the frame around it. */
const FRAME_COLORS = { background: '#0f5132', text: '#faf9f4', muted: '#e1efe4' };

const LANGUAGES = {
  en: {
    chromeLanguage: 'en-US',
    rate: '15.6',
    higherRate: '16.5',
    institutions: ['Credit union', 'Bank'],
    segment: 'Consumer',
    scenarioNames: ['Credit union – 36 months', 'Bank – 48 months'],
    captions: {
      summary: [
        'See what a loan really costs',
        'Payment, interest, insurance and SOLCA, before you sign.',
      ],
      extraPayment: [
        'Know what an extra payment saves',
        'Pay less each month or finish sooner: you choose.',
      ],
      scenarios: [
        'Compare two offers side by side',
        'Save scenarios and see which one costs less.',
      ],
      preset: [
        'Start from what your bank publishes',
        'Seven banks and credit unions in Ecuador, each with its source.',
      ],
      glossary: [
        'Every term explained',
        'A glossary for your first loan, in a light or dark theme.',
      ],
    },
    tagline: 'Simulate any loan. Extra payments included.',
  },
  es: {
    chromeLanguage: 'es',
    rate: '15,6',
    higherRate: '16,5',
    institutions: ['Cooperativa', 'Banco'],
    segment: 'Consumo',
    scenarioNames: ['Cooperativa – 36 meses', 'Banco – 48 meses'],
    captions: {
      summary: [
        'Mira cuánto cuesta de verdad un crédito',
        'Cuota, interés, seguro y SOLCA, antes de firmar.',
      ],
      extraPayment: [
        'Descubre cuánto ahorras con un abono',
        'Paga menos cada mes o termina antes: tú eliges.',
      ],
      scenarios: ['Compara dos ofertas lado a lado', 'Guarda escenarios y mira cuál cuesta menos.'],
      preset: [
        'Empieza con lo que publica tu entidad',
        'Siete bancos y cooperativas del Ecuador, cada uno con su fuente.',
      ],
      glossary: [
        'Cada término, explicado',
        'Un glosario para tu primer crédito, en tema claro u oscuro.',
      ],
    },
    tagline: 'Simula cualquier crédito. Con abonos a capital.',
  },
};

/** The forms and scenarios the panel opens with, as the panel stores them. */
function seededStorage(language) {
  const versioned = (data) => ({ schemaVersion: SCHEMA_VERSION, data });
  const newLoan = {
    amount: '15000',
    termMonths: '36',
    annualRate: language.rate,
    insuranceRate: '0.5',
    institution: language.institutions[0],
    segment: language.segment,
  };
  const otherOffer = {
    ...newLoan,
    termMonths: '48',
    annualRate: language.higherRate,
    institution: language.institutions[1],
  };
  return {
    'draft.newLoan': versioned(newLoan),
    'draft.existingLoan': versioned({
      balance: '8000',
      remainingPayments: '30',
      annualRate: language.rate,
      method: 'german',
      nextPaymentDate: '2026-12-15',
      extraPaymentDate: '2026-12-01',
      extraPaymentAmount: '2000',
      extraPaymentEffect: 'reduceTerm',
    }),
    scenarios: versioned([
      { id: 'credit-union', name: language.scenarioNames[0], form: newLoan },
      { id: 'bank', name: language.scenarioNames[1], form: otherOffer },
    ]),
  };
}

async function readMessages(code) {
  const file = path.join(EXTENSION_DIR, '_locales', code, 'messages.json');
  const messages = JSON.parse(await readFile(file, 'utf8'));
  return (key) => messages[key].message;
}

async function scrollTo(target) {
  await target.waitFor();
  await target.evaluate((element, margin) => {
    window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - margin);
  }, SCROLL_MARGIN);
}

const heading = (panel, name) => panel.getByRole('heading', { name, exact: true }).first();

/** Each screenshot: its caption and how to bring the panel to the state it shows. */
const SHOTS = [
  {
    name: 'summary',
    show: (panel, t) => scrollTo(heading(panel, t('section_summary'))),
  },
  {
    name: 'extraPayment',
    show: async (panel, t) => {
      await panel.getByRole('tab', { name: t('tab_existingLoan') }).click();
      await scrollTo(heading(panel, t('section_appliedExtraPayment')));
    },
  },
  {
    name: 'scenarios',
    show: async (panel, t) => {
      await panel.getByRole('tab', { name: t('tab_scenarios') }).click();
      const boxes = panel.getByRole('checkbox');
      for (const box of await boxes.all()) await box.check();
      await heading(panel, t('section_scenarioComparison')).waitFor();
      // From the second scenario down, so the comparison's last row, total paid, fits.
      await scrollTo(boxes.last());
    },
  },
  {
    name: 'preset',
    show: async (panel, t) => {
      const form = panel.getByRole('tabpanel', { name: t('tab_newLoan') });
      const advanced = form.getByText(t('section_advanced'), { exact: true });
      await advanced.click();
      await form
        .getByRole('combobox', { name: t('field_institutionPreset') })
        .selectOption({ index: 1 });
      await scrollTo(advanced);
    },
  },
  {
    name: 'glossary',
    colorScheme: 'dark',
    show: async (panel, t) => {
      await panel.getByRole('button', { name: t('button_glossary') }).click();
      await panel.getByRole('heading', { name: t('section_glossary') }).waitFor();
    },
  },
];

function fontFaces() {
  const face = (family, file) => `@font-face {
    font-family: '${family}';
    src: url('${pathToFileURL(path.join(FONTS_DIR, file)).href}') format('woff2-variations');
    font-weight: 100 900;
  }`;
  return [
    face('Newsreader', 'newsreader-latin-wght-normal.woff2'),
    face('Newsreader', 'newsreader-latin-ext-wght-normal.woff2'),
    face('Inter', 'inter-latin-wght-normal.woff2'),
    face('Inter', 'inter-latin-ext-wght-normal.woff2'),
  ].join('\n');
}

const escapeHtml = (text) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function framePage(body, size) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${fontFaces()}
    * { box-sizing: border-box; margin: 0; }
    body {
      width: ${size.width}px; height: ${size.height}px; overflow: hidden;
      background: ${FRAME_COLORS.background}; color: ${FRAME_COLORS.text};
      font-family: Inter, sans-serif;
    }
    h1, .name { font-family: Newsreader, serif; font-weight: 500; }
    .muted { color: ${FRAME_COLORS.muted}; }
    /* The icon is a forest tile, the frame's own color: an outline shows its edge. */
    .icon { border-radius: 22%; box-shadow: 0 0 0 2px rgb(250 249 244 / 0.45); }
  </style></head><body>${body}</body></html>`;
}

function screenshotFrame(panelImage, [title, subtitle], icon, extensionName) {
  return framePage(
    `<div style="display: flex; align-items: center; gap: 72px; height: 100%; padding: 0 88px;">
      <div style="flex: 1;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 40px;">
          <img class="icon" src="${icon}" width="40" height="40" alt="">
          <span class="name" style="font-size: 24px;">${escapeHtml(extensionName)}</span>
        </div>
        <h1 style="font-size: 54px; line-height: 1.1; margin-bottom: 24px;">${escapeHtml(title)}</h1>
        <p class="muted" style="font-size: 22px; line-height: 1.45;">${escapeHtml(subtitle)}</p>
      </div>
      <img src="${panelImage}" width="${PANEL_SHOWN_WIDTH}" alt=""
        style="border-radius: 12px; box-shadow: 0 24px 64px rgb(0 0 0 / 0.35);">
    </div>`,
    SCREENSHOT,
  );
}

function promoTileFrame(icon, extensionName, tagline) {
  return framePage(
    `<div style="display: flex; flex-direction: column; justify-content: center; height: 100%; padding: 0 36px;">
      <img class="icon" src="${icon}" width="64" height="64" alt="" style="margin-bottom: 20px;">
      <p class="name" style="font-size: 36px; line-height: 1.1; margin-bottom: 10px;">${escapeHtml(extensionName)}</p>
      <p class="muted" style="font-size: 17px; line-height: 1.4;">${escapeHtml(tagline)}</p>
    </div>`,
    PROMO_TILE,
  );
}

const dataUrl = (png) => `data:image/png;base64,${png.toString('base64')}`;

async function capturePanel(code, language, t) {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    viewport: PANEL,
    deviceScaleFactor: PANEL_SCALE,
    args: [
      `--disable-extensions-except=${EXTENSION_DIR}`,
      `--load-extension=${EXTENSION_DIR}`,
      // chrome.i18n follows the browser language: --lang on Windows, LANGUAGE on Linux.
      `--lang=${language.chromeLanguage}`,
    ],
    env: { ...process.env, LANGUAGE: code },
  });
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  await worker.evaluate(
    (items) => globalThis.chrome.storage.local.set(items),
    seededStorage(language),
  );
  const extensionId = new URL(worker.url()).host;

  const captures = new Map();
  for (const shot of SHOTS) {
    const panel = await context.newPage();
    await panel.emulateMedia({ colorScheme: shot.colorScheme ?? 'light' });
    await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await shot.show(panel, t);
    await panel.evaluate(() => document.fonts.ready);
    captures.set(shot.name, await panel.screenshot());
    await panel.close();
  }
  await context.close();
  return captures;
}

async function renderFrame(browser, html, size, file) {
  const page = await browser.newPage({ viewport: size });
  const htmlFile = path.join(tmpdir(), `loan-simulator-frame-${process.pid}.html`);
  await writeFile(htmlFile, html);
  await page.goto(pathToFileURL(htmlFile).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file });
  await page.close();
  await rm(htmlFile);
}

async function main() {
  if (!existsSync(path.join(EXTENSION_DIR, 'manifest.json'))) {
    throw new Error(`No extension in ${EXTENSION_DIR}: run "npm run build" first.`);
  }
  const icon = dataUrl(await readFile(path.join(EXTENSION_DIR, 'icon/128.png')));
  const browser = await chromium.launch();
  for (const [code, language] of Object.entries(LANGUAGES)) {
    const t = await readMessages(code);
    const dir = path.join(OUT_DIR, code);
    await mkdir(dir, { recursive: true });
    const captures = await capturePanel(code, language, t);
    for (const [index, shot] of SHOTS.entries()) {
      const html = screenshotFrame(
        dataUrl(captures.get(shot.name)),
        language.captions[shot.name],
        icon,
        t('extName'),
      );
      await renderFrame(browser, html, SCREENSHOT, path.join(dir, `${index + 1}-${shot.name}.png`));
    }
    const tile = promoTileFrame(icon, t('extName'), language.tagline);
    await renderFrame(browser, tile, PROMO_TILE, path.join(dir, 'promo-tile.png'));
    process.stdout.write(`${code}: ${SHOTS.length} screenshots and the promo tile in ${dir}\n`);
  }
  await browser.close();
}

await main();
