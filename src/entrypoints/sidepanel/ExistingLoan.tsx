import { useId } from 'preact/hooks';
import { t } from '@/i18n/translate';
import { ExistingLoanFields } from './ExistingLoanFields';
import { defaultExistingLoanForm, existingLoanState } from './existing-form';
import { AppliedExtraPayment, Comparison } from './ExtraPaymentResults';
import { counterpartRate } from './form';
import { locale } from './locale';
import { ScheduleTable } from './ScheduleTable';
import { useSimulation } from './useSimulation';
import { Warnings } from './Warnings';

/** An extra payment on a loan already running: the loan and the payment, then what it saves. */
export function ExistingLoan({ today }: { today: string }) {
  const { form, update, simulated, state, errors, errorOf } = useSimulation(
    () => defaultExistingLoanForm(today),
    existingLoanState,
  );
  const emptyTitleId = useId();

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
      {state.kind === 'loanIncomplete' && (
        <section class="empty-state" aria-labelledby={emptyTitleId}>
          <h2 id={emptyTitleId}>{t('emptyExisting_title')}</h2>
          <p>{t('emptyExisting_body')}</p>
        </section>
      )}
      {state.kind === 'invalid' && <p class="note">{t('invalid_body')}</p>}
      {state.kind === 'simulated' && (
        <div class="results">
          <Warnings warnings={state.simulation.warnings} />
          <AppliedExtraPayment simulation={state.simulation} />
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
