import { useState } from 'preact/hooks';
import { saveScenarios } from '@/storage/scenarios';
import type { LoanForm } from './form';
import { removeScenario, renameScenario, type Scenario } from './saved-scenarios';
import { useSaveOnChange } from './useSaveOnChange';

/** The saved scenarios, stored again after every change. */
export function useScenarios(initialScenarios: () => Scenario[]) {
  const [scenarios, setScenarios] = useState(initialScenarios);
  useSaveOnChange(scenarios, saveScenarios);
  return {
    scenarios,
    add: (name: string, form: LoanForm) =>
      setScenarios((current) => [...current, { id: crypto.randomUUID(), name: name.trim(), form }]),
    rename: (id: string, name: string) =>
      setScenarios((current) => renameScenario(current, id, name)),
    remove: (id: string) => setScenarios((current) => removeScenario(current, id)),
  };
}
