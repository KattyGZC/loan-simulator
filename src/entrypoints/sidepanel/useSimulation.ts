import { useMemo, useState } from 'preact/hooks';
import type { FormatLocale } from '@/i18n/format';
import { saveDraft, type DraftName } from '@/storage/drafts';
import { fieldErrors } from './errors';
import { errorsOf, type PanelState } from './form';
import { locale } from './locale';
import { useDebounced } from './useDebounced';
import { useSaveOnChange } from './useSaveOnChange';

const RECOMPUTE_DELAY_MS = 250;

/**
 * A form and what its results area shows. The results follow the form once typing pauses;
 * `simulated` is the form they were computed from. It is also saved as the `draft`, so the
 * form survives closing the panel.
 */
export function useSimulation<Form extends object, Simulation>(
  draft: DraftName,
  initialForm: () => Form,
  stateOf: (form: Form, locale: FormatLocale) => PanelState<Simulation>,
) {
  const [form, setForm] = useState(initialForm);
  const update = (changes: Partial<Form>) => setForm((current) => ({ ...current, ...changes }));
  const simulated = useDebounced(form, RECOMPUTE_DELAY_MS);
  useSaveOnChange(simulated, (form) => saveDraft(draft, form));
  const state = useMemo(() => stateOf(simulated, locale), [stateOf, simulated]);
  const errors = errorsOf(state);
  const errorOf = useMemo(() => fieldErrors(errors), [errors]);
  return { form, update, simulated, state, errors, errorOf };
}
