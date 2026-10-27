import { storedRecord } from './stored-fields';

/**
 * The version of what a draft stores. A new form field needs no new version: restoring fills it
 * with its default. Renaming a field or changing what a value means does, with a step in
 * `formOf()` that turns the older save into the new shape.
 */
export const SCHEMA_VERSION = 1;

/** Each tab keeps its own draft. */
export type DraftName = 'newLoan' | 'existingLoan';

/** The last form of each tab, as stored: unchecked until the tab restores it. */
export type Drafts = Record<DraftName, unknown>;

const storageKey = (name: DraftName) => `draft.${name}`;

/** The form inside a stored draft, or undefined when there is none or its version is unknown. */
function formOf(stored: unknown): unknown {
  const fields = storedRecord(stored);
  return fields.get('schemaVersion') === SCHEMA_VERSION ? fields.get('form') : undefined;
}

export async function loadDraft(name: DraftName): Promise<unknown> {
  const key = storageKey(name);
  const stored = await browser.storage.local.get(key);
  return formOf(stored[key]);
}

/** Both tabs' drafts. A tab whose draft cannot be read starts empty. */
export async function loadDrafts(): Promise<Drafts> {
  const [newLoan, existingLoan] = await Promise.all([
    loadDraft('newLoan'),
    loadDraft('existingLoan'),
  ]);
  return { newLoan, existingLoan };
}

export async function saveDraft(name: DraftName, form: object): Promise<void> {
  await browser.storage.local.set({ [storageKey(name)]: { schemaVersion: SCHEMA_VERSION, form } });
}
