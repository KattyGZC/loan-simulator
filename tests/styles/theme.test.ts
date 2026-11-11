import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../../src/styles/theme.css', import.meta.url), 'utf8');

/** The color tokens declared in the first `:root` block that `pattern` finds, by name. */
function tokensOf(pattern: RegExp): Map<string, string> {
  const block = pattern.exec(css)?.[1];
  if (block === undefined) throw new Error(`theme.css has no block matching ${String(pattern)}`);
  return new Map(
    [...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name = '', value = '']) => [
      name,
      value.trim(),
    ]),
  );
}

const THEMES = {
  light: tokensOf(/^:root \{([^}]*)\}/m),
  dark: tokensOf(/prefers-color-scheme: dark\)\s*\{\s*:root \{([^}]*)\}/),
};

/** The relative luminance of a `#rrggbb` color, as WCAG 2 defines it. */
function luminance(hex: string): number {
  const [red = 0, green = 0, blue = 0] = [1, 3, 5].map((start) => {
    const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

// WCAG AA: 4.5:1 for text, 3:1 for what identifies a control or its state (1.4.11).
const TEXT = 4.5;
const NON_TEXT = 3;

/** Every pair the side panel and the print page draw, with where they draw it. */
const PAIRS: readonly [foreground: string, background: string, minimum: number, use: string][] = [
  ['text', 'page', TEXT, 'title, headings and text between the cards'],
  ['text', 'surface', TEXT, 'text on a card'],
  ['text', 'surface-alt', TEXT, 'striped rows and the table header'],
  ['text', 'accent-bg', TEXT, 'savings, the extra-payment row, hovered buttons and menu items'],
  ['text', 'warning-bg', TEXT, 'warnings'],
  ['muted', 'page', TEXT, 'notes between the cards, disclaimer'],
  ['muted', 'surface', TEXT, 'hints, legends, labels of the summary cards, unselected tabs'],
  ['muted', 'surface-alt', TEXT, 'disabled buttons'],
  ['muted', 'accent-bg', TEXT, 'labels of the savings'],
  ['accent', 'surface', TEXT, 'selected tab, checked boxes and focus rings on a card'],
  ['accent', 'accent-bg', NON_TEXT, 'focus ring on a highlighted menu item or button'],
  ['on-accent', 'accent', TEXT, 'primary button'],
  ['error', 'surface', TEXT, 'field errors'],
  ['accent', 'surface-alt', NON_TEXT, 'focus ring on a striped row'],
  ['accent', 'page', NON_TEXT, 'focus ring between the cards'],
  ['control-border', 'surface', NON_TEXT, 'outline of fields and buttons'],
  ['control-border', 'surface-alt', NON_TEXT, 'outline of a control on a tinted surface'],
  ['control-border', 'page', NON_TEXT, 'outline of the tabs and of buttons between the cards'],
];

describe.each(Object.entries(THEMES))('%s theme', (_, tokens) => {
  it('writes every color as #rrggbb', () => {
    for (const [name, value] of tokens) expect(value, name).toMatch(/^#[0-9a-f]{6}$/);
  });

  it.each(PAIRS)('%s on %s reaches %d:1 (%s)', (foreground, background, minimum) => {
    const ratio = contrast(tokens.get(foreground) ?? '', tokens.get(background) ?? '');
    expect(ratio).toBeGreaterThanOrEqual(minimum);
  });
});

describe('themes', () => {
  it('define the same colors, so none falls back to the light one in the dark theme', () => {
    expect([...THEMES.dark.keys()]).toEqual([...THEMES.light.keys()]);
  });

  it('check only colors they define', () => {
    const used = new Set(PAIRS.flatMap(([foreground, background]) => [foreground, background]));
    expect([...used].filter((name) => !THEMES.light.has(name))).toEqual([]);
  });
});

describe('contrast', () => {
  it('is 21:1 for black on white, either way round', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21);
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21);
  });

  it('is 1:1 for a color on itself', () => {
    expect(contrast('#1f5fbf', '#1f5fbf')).toBe(1);
  });
});
