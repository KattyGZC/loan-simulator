import type { RefObject } from 'preact';
import { useId, useState } from 'preact/hooks';
import { t } from '@/i18n/translate';
import { TextField } from './fields';
import type { LoanForm } from './form';
import { defaultScenarioName } from './saved-scenarios';

interface SaveScenarioProps {
  /** The dialog, which the results menu opens with `showModal()`. */
  dialogRef: RefObject<HTMLDialogElement | null>;
  form: LoanForm;
  update: (changes: Partial<LoanForm>) => void;
  onSave: (name: string) => void;
}

/**
 * A dialog with institution, segment and the name they suggest, to save the scenario; and,
 * outside it, the status that says it was saved.
 */
export function SaveScenario({ dialogRef, form, update, onSave }: SaveScenarioProps) {
  // Null while the name follows institution and segment; the text once the user edits it.
  const [typedName, setTypedName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const name = typedName ?? defaultScenarioName(form);
  const titleId = useId();
  const edit = (changes: Partial<LoanForm>) => {
    update(changes);
    setSaved(false);
  };

  return (
    <>
      <dialog ref={dialogRef} class="dialog" aria-labelledby={titleId}>
        <form
          class="save-scenario"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim() === '') return;
            onSave(name);
            setTypedName(null);
            setSaved(true);
            dialogRef.current?.close();
          }}
          noValidate
        >
          <h2 id={titleId}>{t('section_saveScenario')}</h2>
          <div class="row">
            <TextField
              label={t('field_institution')}
              value={form.institution}
              onInput={(institution) => edit({ institution })}
            />
            <TextField
              label={t('field_segment')}
              value={form.segment}
              onInput={(segment) => edit({ segment })}
            />
          </div>
          <TextField
            label={t('field_scenarioName')}
            value={name}
            onInput={(typed) => {
              setTypedName(typed);
              setSaved(false);
            }}
            hint={t('hint_scenarioName')}
          />
          <div class="actions dialog-actions">
            <button type="button" class="button" onClick={() => dialogRef.current?.close()}>
              {t('button_cancel')}
            </button>
            <button type="submit" class="button primary" disabled={name.trim() === ''}>
              {t('button_saveScenario')}
            </button>
          </div>
        </form>
      </dialog>
      <p class="note" role="status">
        {saved ? t('scenario_saved') : ''}
      </p>
    </>
  );
}
