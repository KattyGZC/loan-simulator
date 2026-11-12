import { useEffect, useRef } from 'preact/hooks';
import { t } from '@/i18n/translate';
import { ActionsMenu } from './ActionsMenu';
import { newLoanCsv, type CsvSettings } from './csv';
import { downloadCsv } from './download-csv';
import {
  type LoanForm,
  counterpartRate,
  hasFixedPayment,
  panelState,
  restoreLoanForm,
} from './form';
import { ResetIcon } from './icons';
import { LoanFields } from './LoanFields';
import { format, locale } from './locale';
import { openPrintPage } from './print-page';
import { newLoanPrintout } from './printout';
import { announcement, missingFields, summaryLines } from './results';
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
  const loanForm = useRef<HTMLFormElement>(null);
  const saveDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (focusFirstField) loanForm.current?.querySelector('input')?.focus();
  }, [focusFirstField]);
  const fixedPayment =
    state.kind === 'simulated' && hasFixedPayment(simulated, state.simulation.schedule.summary);
  const status = announcement(state, ({ schedule }) =>
    summaryLines(schedule.summary, fixedPayment, format),
  );

  return (
    <>
      <div class="actions tab-actions">
        <button type="button" class="button" onClick={onStartOver}>
          <ResetIcon />
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
          defaults={defaults}
          errorOf={errorOf}
          counterpartRate={counterpartRate(simulated, errors, locale)}
        />
      </form>
      <ResultStatus text={status} />
      {state.kind === 'loanIncomplete' && (
        <p class="note">{t('missing_newLoan', [missingFields(state.errors, locale)])}</p>
      )}
      {state.kind === 'invalid' && <p class="note">{t('invalid_body')}</p>}
      {state.kind === 'simulated' && (
        <div class="results">
          <Warnings warnings={state.simulation.warnings} />
          <Summary
            summary={state.simulation.schedule.summary}
            fixedPayment={fixedPayment}
            menu={
              <ActionsMenu
                actions={[
                  {
                    label: t('menu_saveScenario'),
                    onSelect: () => saveDialog.current?.showModal(),
                  },
                  {
                    label: t('button_exportCsv'),
                    onSelect: () =>
                      downloadCsv(
                        t('file_newLoanCsv', [today]),
                        newLoanCsv(state.simulation, fixedPayment, csvSettings),
                      ),
                  },
                  {
                    label: t('button_print'),
                    onSelect: () =>
                      openPrintPage(newLoanPrintout(state.simulation, fixedPayment, today, format)),
                  },
                ]}
              />
            }
          />
          <SaveScenario
            dialogRef={saveDialog}
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
          <ScheduleTable schedule={state.simulation.schedule} title="section_schedule" />
        </div>
      )}
    </>
  );
}
