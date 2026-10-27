import type { LoanSummary } from '@/core';
import type { FormatLocale } from '@/i18n/format';
import { storedFields, storedRecord } from '@/storage/stored-fields';
import { panelState, restoreLoanForm, type LoanForm } from './form';

/** A new-loan form saved under a name, to load it again or compare it with another. */
export interface Scenario {
  id: string;
  name: string;
  form: LoanForm;
}

/** How many scenarios the comparison shows side by side. */
export const MAX_COMPARED = 2;
const NAME_SEPARATOR = ' – ';

/** "Institution – Segment" from the form, either alone if the other is empty, or empty. */
export function defaultScenarioName(form: Pick<LoanForm, 'institution' | 'segment'>): string {
  return [form.institution, form.segment]
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .join(NAME_SEPARATOR);
}

/**
 * The scenarios read back from storage. One without an id or a name is dropped; its form is
 * restored as a draft is, with `defaults` for every field it lacks or cannot hold.
 */
export function restoreScenarios(stored: unknown, defaults: LoanForm): Scenario[] {
  if (!Array.isArray(stored)) return [];
  const items: unknown[] = stored;
  return items.flatMap((item) => {
    const { text } = storedFields(item);
    const id = text('id', '');
    const name = text('name', '').trim();
    if (id === '' || name === '') return [];
    return [{ id, name, form: restoreLoanForm(storedRecord(item).get('form'), defaults) }];
  });
}

/** `scenarios` with `name` on the one with `id`. A blank name keeps the one it had. */
export function renameScenario(
  scenarios: readonly Scenario[],
  id: string,
  name: string,
): Scenario[] {
  const trimmed = name.trim();
  return scenarios.map((scenario) =>
    scenario.id === id && trimmed !== '' ? { ...scenario, name: trimmed } : scenario,
  );
}

export function removeScenario(scenarios: readonly Scenario[], id: string): Scenario[] {
  return scenarios.filter((scenario) => scenario.id !== id);
}

/**
 * The scenarios to compare after the user checks or unchecks `id`. Checking one more than
 * `MAX_COMPARED` changes nothing.
 */
export function toggleCompared(compared: readonly string[], id: string): string[] {
  if (compared.includes(id)) return compared.filter((comparedId) => comparedId !== id);
  return compared.length < MAX_COMPARED ? [...compared, id] : [...compared];
}

/** The summary of the loan a scenario describes, or null when its form no longer simulates. */
export function scenarioSummary(scenario: Scenario, locale: FormatLocale): LoanSummary | null {
  const state = panelState(scenario.form, locale);
  return state.kind === 'simulated' ? state.simulation.schedule.summary : null;
}
