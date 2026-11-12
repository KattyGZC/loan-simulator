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
import { format, locale } from './locale';
import { openPrintPage } from './print-page';
import { existingLoanPrintout } from './printout';
import { announcement, missingFields, savingsLines } from './results';
import { ResultStatus } from './ResultStatus';
import { ScheduleTable } from './ScheduleTable';
import { useSimulation } from './useSimulation';
import { Warnings } from './Warnings';

interface ExistingLoanProps {
  today: string;
  /** The currency and decimal sign of the exported file. */
  csvSettings: CsvSettings;
  draft: unknown;
}

/** An extra payment on a loan already running: the loan and the payment, then what it saves. */
export function ExistingLoan({ today, csvSettings, draft }: ExistingLoanProps) {
  const { form, update, simulated, state, errors, errorOf } = useSimulation(
    'existingLoan',
    () => restoreExistingLoanForm(draft, defaultExistingLoanForm(today)),
    existingLoanState,
  );
  const status = announcement(state, (simulation) => savingsLines(simulation, format));

  return (
    <>
      <form class="loan-form" onSubmit={(event) => event.preventDefault()} noValidate>
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
