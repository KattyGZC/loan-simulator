import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { loadScenarios, saveScenarios } from '@/storage/scenarios';

beforeEach(() => fakeBrowser.reset());

describe('scenarios storage', () => {
  it('reads back the scenarios it saved', async () => {
    const scenarios = [{ id: 'a', name: 'JEP – Consumo', form: { amount: '10000' } }];
    await saveScenarios(scenarios);
    expect(await loadScenarios()).toEqual(scenarios);
  });

  it('replaces the list on every save', async () => {
    await saveScenarios([{ id: 'a' }, { id: 'b' }]);
    await saveScenarios([{ id: 'b' }]);
    expect(await loadScenarios()).toEqual([{ id: 'b' }]);
  });

  it('has nothing before the first save', async () => {
    expect(await loadScenarios()).toBeUndefined();
  });

  it('does not touch the drafts', async () => {
    await saveScenarios([{ id: 'a' }]);
    expect(await browser.storage.local.get(null)).toEqual({
      scenarios: expect.anything(),
    });
  });
});
