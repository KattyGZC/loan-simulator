import { useId } from 'preact/hooks';
import { t } from '@/i18n/translate';
import { newLoanCsv, type CsvSettings } from './csv';
import { ExportCsv } from './ExportCsv';
import {
  type LoanForm,
  counterpartRate,
  hasFixedPayment,
  panelState,
  restoreLoanForm,
} from './form';
import { LoanFields } from './LoanFields';
import { locale } from './locale';
import { SaveScenario } from './SaveScenario';
import { ScheduleTable } from './ScheduleTable';
import { Summary } from './Summary';
import { useSimulation } from './useSimulation';
import { Warnings } from './Warnings';

interface NewLoanProps {
  today: string;
  /** The currency and decimal sign of the exported file. */
  csvSettings: CsvSettings;
  draft: unknown;
  /** The empty form, for every field the draft lacks. */
  defaults: LoanForm;
  onSaveScenario: (name: string, form: LoanForm) => void;
  onStartOver: () => void;
}

/** The new-loan simulator: the loan's fields, then its summary, saving it, and its schedule. */
export function NewLoan({
  today,
  csvSettings,
  draft,
  defaults,
  onSaveScenario,
  onStartOver,
}: NewLoanProps) {
  const { form, update, simulated, state, errors, errorOf } = useSimulation(
    'newLoan',
    () => restoreLoanForm(draft, defaults),
    panelState,
  );
  const emptyTitleId = useId();
  const fixedPayment =
    state.kind === 'simulated' && hasFixedPayment(simulated, state.simulation.schedule.summary);

  return (
    <>
      <div class="actions tab-actions">
        <button type="button" class="button" onClick={onStartOver}>
          {t('button_startOver')}
        </button>
      </div>
      <form class="loan-form" onSubmit={(event) => event.preventDefault()} noValidate>
        <LoanFields
          form={form}
          update={update}
          errorOf={errorOf}
          counterpartRate={counterpartRate(simulated, errors, locale)}
        />
      </form>
      {state.kind === 'loanIncomplete' && (
        <section class="empty-state" aria-labelledby={emptyTitleId}>
          <h2 id={emptyTitleId}>{t('empty_title')}</h2>
          <p>{t('empty_body')}</p>
        </section>
      )}
      {state.kind === 'invalid' && <p class="note">{t('invalid_body')}</p>}
      {state.kind === 'simulated' && (
        <div class="results">
          <Warnings warnings={state.simulation.warnings} />
          <Summary summary={state.simulation.schedule.summary} fixedPayment={fixedPayment} />
          <SaveScenario
            form={form}
            update={update}
            onSave={(name) =>
              // The loan whose results are on screen, with the labels as typed this instant.
              onSaveScenario(name, {
                ...simulated,
                institution: form.institution,
                segment: form.segment,
              })
            }
          />
          <ExportCsv
            fileName={t('file_newLoanCsv', [today])}
            csv={() => newLoanCsv(state.simulation, fixedPayment, csvSettings)}
          />
          <ScheduleTable schedule={state.simulation.schedule} title="section_schedule" />
        </div>
      )}
    </>
  );
}
