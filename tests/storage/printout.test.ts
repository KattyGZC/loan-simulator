import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { loadPrintout, savePrintout } from '@/storage/printout';

beforeEach(() => fakeBrowser.reset());

describe('printout storage', () => {
  it('reads back the last printout it saved', async () => {
    await savePrintout({ title: 'First' });
    await savePrintout({ title: 'Second' });
    expect(await loadPrintout()).toEqual({ title: 'Second' });
  });

  it('keeps it in session storage, not with the drafts and scenarios', async () => {
    await savePrintout({ title: 'Loan' });
    expect(await fakeBrowser.storage.local.get(null)).toEqual({});
  });

  it('has nothing before the first save', async () => {
    expect(await loadPrintout()).toBeUndefined();
  });
});
