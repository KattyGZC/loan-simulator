import { describe, expect, it } from 'vitest';
import { defaultPreferences, restorePreferences } from '@/entrypoints/sidepanel/preferences';

describe('defaultPreferences', () => {
  it('starts in USD with SOLCA on at 0.5 %, written for the locale', () => {
    expect(defaultPreferences('en-US')).toEqual({
      currency: 'USD',
      solcaEnabled: true,
      solcaPercent: '0.5',
    });
    expect(defaultPreferences('es-EC').solcaPercent).toBe('0,5');
  });
});

describe('restorePreferences', () => {
  const defaults = defaultPreferences('en-US');

  it('restores what it saved', () => {
    const saved = { currency: 'GTQ', solcaEnabled: false, solcaPercent: '1' } as const;
    expect(restorePreferences(saved, defaults)).toEqual(saved);
  });

  it('starts from the defaults when nothing was stored', () => {
    expect(restorePreferences(undefined, defaults)).toEqual(defaults);
  });

  it('drops a currency it does not offer and values of another type', () => {
    expect(
      restorePreferences({ currency: 'CLP', solcaEnabled: 'no', solcaPercent: 1 }, defaults),
    ).toEqual(defaults);
  });
});
