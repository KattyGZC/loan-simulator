import { useEffect, useId, useRef } from 'preact/hooks';
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
import { format, locale } from './locale';
import { newLoanPrintout } from './printout';
import { PrintResults } from './PrintResults';
import { announcement, summaryLines } from './results';
import { ResultStatus } from './ResultStatus';
import { SaveScenario } from './SaveScenario';
import { ScheduleTable } from './ScheduleTable';
import { Summary } from './Summary';
import { useSimulation } from './useSimulation';
import { Warnings } from './Warnings';

interface NewLoanProps {
  /** Focus the first field on mount: the form was just started over or filled from a scenario. */
  focusFirstField: boolean;
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
  focusFirstField,
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
  const loanForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (focusFirstField) loanForm.current?.querySelector('input')?.focus();
  }, []);
  const fixedPayment =
    state.kind === 'simulated' && hasFixedPayment(simulated, state.simulation.schedule.summary);
  const status = announcement(state, ({ schedule }) =>
    summaryLines(schedule.summary, fixedPayment, format),
  );

  return (
    <>
      <div class="actions tab-actions">
        <button type="button" class="button" onClick={onStartOver}>
          {t('button_startOver')}
        </button>
      </div>
      <form
        ref={loanForm}
        class="loan-form"
        onSubmit={(event) => event.preventDefault()}
        noValidate
      >
        <LoanFields
          form={form}
          update={update}
          errorOf={errorOf}
          counterpartRate={counterpartRate(simulated, errors, locale)}
        />
      </form>
      <ResultStatus text={status} />
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
          <div class="actions">
            <ExportCsv
              fileName={t('file_newLoanCsv', [today])}
              csv={() => newLoanCsv(state.simulation, fixedPayment, csvSettings)}
            />
            <PrintResults
              printout={() => newLoanPrintout(state.simulation, fixedPayment, today, format)}
            />
          </div>
          <ScheduleTable schedule={state.simulation.schedule} title="section_schedule" />
        </div>
      )}
    </>
  );
}
