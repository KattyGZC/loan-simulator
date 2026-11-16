import { useEffect, useRef } from 'preact/hooks';
import { t } from '@/i18n/translate';
import { ActionsMenu } from './ActionsMenu';
import { existingLoanCsv, type CsvSettings } from './csv';
import { downloadCsv } from './download-csv';
import { ExistingLoanFields } from './ExistingLoanFields';
import {
  defaultExistingLoanForm,
  existingLoanState,
  restoreExistingLoanForm,
} from './existing-form';
import { AppliedExtraPayment, Comparison } from './ExtraPaymentResults';
import { counterpartRate } from './form';
import { ResetIcon } from './icons';
import { format, locale } from './locale';
import { openPrintPage } from './print-page';
import { existingLoanPrintout } from './printout';
import { announcement, missingFields, savingsLines } from './results';
import { ResultStatus } from './ResultStatus';
import { ScheduleTable } from './ScheduleTable';
import { useSimulation } from './useSimulation';
import { Warnings } from './Warnings';

interface ExistingLoanProps {
  /** Focus the first field on mount: the form was just started over. */
  focusFirstField: boolean;
  today: string;
  /** The currency and decimal sign of the exported file. */
  csvSettings: CsvSettings;
  draft: unknown;
  onStartOver: () => void;
}

/** An extra payment on a loan already running: the loan and the payment, then what it saves. */
export function ExistingLoan({
  focusFirstField,
  today,
  csvSettings,
  draft,
  onStartOver,
}: ExistingLoanProps) {
  const { form, update, simulated, state, errors, errorOf } = useSimulation(
    'existingLoan',
    () => restoreExistingLoanForm(draft, defaultExistingLoanForm(today)),
    existingLoanState,
  );
  const loanForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (focusFirstField) loanForm.current?.querySelector('input')?.focus();
  }, [focusFirstField]);
  const status = announcement(state, (simulation) => savingsLines(simulation, format));

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
        <ExistingLoanFields
          form={form}
          update={update}
          errorOf={errorOf}
          counterpartRate={counterpartRate(simulated, errors, locale)}
        />
      </form>
      <ResultStatus text={status} />
      {state.kind === 'loanIncomplete' && (
        <p class="note">{t('missing_existingLoan', [missingFields(state.errors, locale)])}</p>
      )}
      {state.kind === 'invalid' && <p class="note">{t('invalid_body')}</p>}
      {state.kind === 'simulated' && (
        <div class="results">
          <Warnings warnings={state.simulation.warnings} />
          <AppliedExtraPayment
            simulation={state.simulation}
            menu={
              <ActionsMenu
                actions={[
                  {
                    label: t('button_exportCsv'),
                    onSelect: () =>
                      downloadCsv(
                        t('file_existingLoanCsv', [today]),
                        existingLoanCsv(state.simulation, csvSettings),
                      ),
                  },
                  {
                    label: t('button_print'),
                    onSelect: () =>
                      openPrintPage(existingLoanPrintout(state.simulation, today, format)),
                  },
                ]}
              />
            }
          />
          <Comparison simulation={state.simulation} />
          <ScheduleTable
            schedule={state.simulation.withExtraPayment}
            title="section_scheduleWithExtraPayment"
            extraPaymentNumber={state.simulation.extraPayment.paymentNumber}
          />
        </div>
      )}
    </>
  );
}
