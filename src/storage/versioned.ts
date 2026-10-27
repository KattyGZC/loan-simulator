import { storedRecord } from './stored-fields';

/**
 * The version of what the panel stores. A new form field needs no new version: restoring fills
 * it with its default. Renaming a field or changing what a value means does, with a step in
 * `dataOf()` that turns the older save into the new shape.
 */
export const SCHEMA_VERSION = 1;

/** The data inside a stored value, or undefined when there is none or its version is unknown. */
function dataOf(stored: unknown): unknown {
  const fields = storedRecord(stored);
  return fields.get('schemaVersion') === SCHEMA_VERSION ? fields.get('data') : undefined;
}

/** What `saveVersioned()` stored under `key`: unchecked until its reader restores it. */
export async function loadVersioned(key: string): Promise<unknown> {
  const stored = await browser.storage.local.get(key);
  return dataOf(stored[key]);
}

export async function saveVersioned(key: string, data: unknown): Promise<void> {
  await browser.storage.local.set({ [key]: { schemaVersion: SCHEMA_VERSION, data } });
}
