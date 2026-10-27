import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { loadPreferences, savePreferences } from '@/storage/preferences';

beforeEach(() => fakeBrowser.reset());

describe('preferences storage', () => {
  it('reads back the preferences it saved', async () => {
    await savePreferences({ currency: 'EUR', solcaEnabled: false, solcaPercent: '0.5' });
    expect(await loadPreferences()).toEqual({
      currency: 'EUR',
      solcaEnabled: false,
      solcaPercent: '0.5',
    });
  });

  it('has nothing before the first save', async () => {
    expect(await loadPreferences()).toBeUndefined();
  });
});
