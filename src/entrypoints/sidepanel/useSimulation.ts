import { useMemo, useState } from 'preact/hooks';
import type { FormatLocale } from '@/i18n/format';
import { fieldErrors } from './errors';
import { errorsOf, type PanelState } from './form';
import { locale } from './locale';
import { useDebounced } from './useDebounced';

const RECOMPUTE_DELAY_MS = 250;

/**
 * A form and what its results area shows. The results follow the form once typing pauses;
 * `simulated` is the form they were computed from.
 */
export function useSimulation<Form extends object, Simulation>(
  initialForm: () => Form,
  stateOf: (form: Form, locale: FormatLocale) => PanelState<Simulation>,
) {
  const [form, setForm] = useState(initialForm);
  const update = (changes: Partial<Form>) => setForm((current) => ({ ...current, ...changes }));
  const simulated = useDebounced(form, RECOMPUTE_DELAY_MS);
  const state = useMemo(() => stateOf(simulated, locale), [stateOf, simulated]);
  const errors = errorsOf(state);
  const errorOf = useMemo(() => fieldErrors(errors), [errors]);
  return { form, update, simulated, state, errors, errorOf };
}
