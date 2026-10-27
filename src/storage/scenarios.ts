import { loadVersioned, saveVersioned } from './versioned';

const SCENARIOS_KEY = 'scenarios';

/** The saved scenarios, as stored: unchecked until the panel restores them. */
export function loadScenarios(): Promise<unknown> {
  return loadVersioned(SCENARIOS_KEY);
}

/** Replaces every saved scenario with `scenarios`. */
export function saveScenarios(scenarios: readonly object[]): Promise<void> {
  return saveVersioned(SCENARIOS_KEY, scenarios);
}
