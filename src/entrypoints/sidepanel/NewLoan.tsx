import { useId } from 'preact/hooks';
import { t } from '@/i18n/translate';
import {
  type LoanForm,
  counterpartRate,
  defaultForm,
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
  draft: unknown;
  onSaveScenario: (name: string, form: LoanForm) => void;
}

/** The new-loan simulator: the loan's fields, then its summary, saving it, and its schedule. */
export function NewLoan({ today, draft, onSaveScenario }: NewLoanProps) {
  const { form, update, simulated, state, errors, errorOf } = useSimulation(
    'newLoan',
    () => restoreLoanForm(draft, defaultForm(today, locale)),
    panelState,
  );
  const emptyTitleId = useId();

  return (
    <>
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
          <Summary
            summary={state.simulation.schedule.summary}
            fixedPayment={hasFixedPayment(simulated, state.simulation.schedule.summary)}
          />
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
          <ScheduleTable schedule={state.simulation.schedule} title="section_schedule" />
        </div>
      )}
    </>
  );
}
