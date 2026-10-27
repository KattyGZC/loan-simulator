import { useMemo, useState } from 'preact/hooks';
import { t } from '@/i18n/translate';
import { fieldErrors } from './errors';
import {
  counterpartRate,
  defaultForm,
  errorsOf,
  hasFixedPayment,
  panelState,
  type LoanForm,
  type PanelState,
} from './form';
import { LoanFields } from './LoanFields';
import { locale } from './locale';
import { ScheduleTable } from './ScheduleTable';
import { Summary } from './Summary';
import { useDebounced } from './useDebounced';
import { Warnings } from './Warnings';

const RECOMPUTE_DELAY_MS = 250;

/** Today in the user's time zone, as an ISO date. */
function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function App() {
  const [form, setForm] = useState(() => defaultForm(today(), locale));
  const update = (changes: Partial<LoanForm>) => setForm((current) => ({ ...current, ...changes }));

  const simulated = useDebounced(form, RECOMPUTE_DELAY_MS);
  const state = useMemo(() => panelState(simulated, locale), [simulated]);
  const errors = errorsOf(state);
  const errorOf = useMemo(() => fieldErrors(errors), [errors]);

  return (
    <>
      <header>
        <h1>{t('extName')}</h1>
      </header>
      <main>
        <form class="loan-form" onSubmit={(event) => event.preventDefault()} noValidate>
          <LoanFields
            form={form}
            update={update}
            errorOf={errorOf}
            counterpartRate={counterpartRate(simulated, errors, locale)}
          />
        </form>
        <Results state={state} form={simulated} />
      </main>
      <footer class="disclaimer">{t('disclaimer')}</footer>
    </>
  );
}

function Results({ state, form }: { state: PanelState; form: LoanForm }) {
  switch (state.kind) {
    case 'loanIncomplete':
      return (
        <section class="empty-state" aria-labelledby="empty-title">
          <h2 id="empty-title">{t('empty_title')}</h2>
          <p>{t('empty_body')}</p>
        </section>
      );
    case 'invalid':
      return <p class="note">{t('invalid_body')}</p>;
    case 'simulated': {
      const { base, warnings } = state.simulation;
      return (
        <div class="results">
          <Warnings warnings={warnings} />
          <Summary summary={base.summary} fixedPayment={hasFixedPayment(form, base.summary)} />
          <ScheduleTable schedule={base} />
        </div>
      );
    }
  }
}
