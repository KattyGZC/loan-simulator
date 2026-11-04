import { describe, expect, it } from 'vitest';
import { defaultPreferences, restorePreferences } from '@/entrypoints/sidepanel/preferences';

describe('defaultPreferences', () => {
  it('starts in USD, files and SOLCA (on at 0.5 %) with the locale decimal sign', () => {
    expect(defaultPreferences('en-US')).toEqual({
      currency: 'USD',
      fileDecimalSign: 'point',
      solcaEnabled: true,
      solcaPercent: '0.5',
    });
    expect(defaultPreferences('es-EC')).toMatchObject({
      fileDecimalSign: 'comma',
      solcaPercent: '0,5',
    });
  });
});

describe('restorePreferences', () => {
  const defaults = defaultPreferences('en-US');

  it('restores what it saved', () => {
    const saved = {
      currency: 'GTQ',
      fileDecimalSign: 'comma',
      solcaEnabled: false,
      solcaPercent: '1',
    } as const;
    expect(restorePreferences(saved, defaults)).toEqual(saved);
  });

  it('starts from the defaults when nothing was stored', () => {
    expect(restorePreferences(undefined, defaults)).toEqual(defaults);
  });

  it('drops a currency or decimal sign it does not offer and values of another type', () => {
    expect(
      restorePreferences(
        { currency: 'CLP', fileDecimalSign: 'space', solcaEnabled: 'no', solcaPercent: 1 },
        defaults,
      ),
    ).toEqual(defaults);
  });

  it('gives preferences saved before the decimal sign existed the locale one', () => {
    const saved = { currency: 'EUR', solcaEnabled: false, solcaPercent: '1' };
    expect(restorePreferences(saved, defaultPreferences('es-EC'))).toEqual({
      ...saved,
      fileDecimalSign: 'comma',
    });
  });
});
