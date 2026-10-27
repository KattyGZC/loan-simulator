import { loadVersioned, saveVersioned } from './versioned';

/** Each tab keeps its own draft. */
export type DraftName = 'newLoan' | 'existingLoan';

/** The last form of each tab, as stored: unchecked until the tab restores it. */
export type Drafts = Record<DraftName, unknown>;

const storageKey = (name: DraftName) => `draft.${name}`;

export function loadDraft(name: DraftName): Promise<unknown> {
  return loadVersioned(storageKey(name));
}

/** Both tabs' drafts. */
export async function loadDrafts(): Promise<Drafts> {
  const [newLoan, existingLoan] = await Promise.all([
    loadDraft('newLoan'),
    loadDraft('existingLoan'),
  ]);
  return { newLoan, existingLoan };
}

export function saveDraft(name: DraftName, form: object): Promise<void> {
  return saveVersioned(storageKey(name), form);
}
