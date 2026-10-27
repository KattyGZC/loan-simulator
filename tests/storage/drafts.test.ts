import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { loadDraft, loadDrafts, saveDraft, SCHEMA_VERSION } from '@/storage/drafts';

beforeEach(() => fakeBrowser.reset());

describe('drafts', () => {
  it('reads back the form it saved', async () => {
    await saveDraft('newLoan', { amount: '10000', solcaEnabled: false });
    expect(await loadDraft('newLoan')).toEqual({ amount: '10000', solcaEnabled: false });
  });

  it('keeps each tab apart', async () => {
    await saveDraft('newLoan', { amount: '10000' });
    await saveDraft('existingLoan', { balance: '5843.78' });
    expect(await loadDrafts()).toEqual({
      newLoan: { amount: '10000' },
      existingLoan: { balance: '5843.78' },
    });
  });

  it('keeps only the last save', async () => {
    await saveDraft('newLoan', { amount: '10000' });
    await saveDraft('newLoan', { amount: '12000' });
    expect(await loadDraft('newLoan')).toEqual({ amount: '12000' });
  });

  it('has nothing before the first save', async () => {
    expect(await loadDrafts()).toEqual({ newLoan: undefined, existingLoan: undefined });
  });

  it('stores the schema version with the form', async () => {
    await saveDraft('newLoan', { amount: '10000' });
    expect(await browser.storage.local.get('draft.newLoan')).toEqual({
      'draft.newLoan': { schemaVersion: SCHEMA_VERSION, form: { amount: '10000' } },
    });
  });

  it('ignores a draft from a schema version it does not know', async () => {
    await browser.storage.local.set({
      'draft.newLoan': { schemaVersion: SCHEMA_VERSION + 1, form: { amount: '10000' } },
    });
    expect(await loadDraft('newLoan')).toBeUndefined();
  });

  it('ignores a draft that is not an object', async () => {
    await browser.storage.local.set({ 'draft.newLoan': 'amount=10000' });
    expect(await loadDraft('newLoan')).toBeUndefined();
  });
});
