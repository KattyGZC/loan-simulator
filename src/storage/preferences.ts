import { loadVersioned, saveVersioned } from './versioned';

const PREFERENCES_KEY = 'preferences';

/** The preferences, as stored: unchecked until the panel restores them. */
export function loadPreferences(): Promise<unknown> {
  return loadVersioned(PREFERENCES_KEY);
}

export function savePreferences(preferences: object): Promise<void> {
  return saveVersioned(PREFERENCES_KEY, preferences);
}
