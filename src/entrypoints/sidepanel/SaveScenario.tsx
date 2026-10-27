import { useId, useState } from 'preact/hooks';
import { t } from '@/i18n/translate';
import { TextField } from './fields';
import type { LoanForm } from './form';
import { defaultScenarioName } from './saved-scenarios';

interface SaveScenarioProps {
  form: LoanForm;
  update: (changes: Partial<LoanForm>) => void;
  onSave: (name: string) => void;
}

/** Institution and segment, the name they suggest, and the button that saves the scenario. */
export function SaveScenario({ form, update, onSave }: SaveScenarioProps) {
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
    <section class="save-scenario" aria-labelledby={titleId}>
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
      <div class="actions">
        <button
          type="button"
          class="button primary"
          disabled={name.trim() === ''}
          onClick={() => {
            onSave(name);
            setTypedName(null);
            setSaved(true);
          }}
        >
          {t('button_saveScenario')}
        </button>
      </div>
      <p class="note" role="status">
        {saved ? t('scenario_saved') : ''}
      </p>
    </section>
  );
}
