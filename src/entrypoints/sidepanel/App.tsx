import { useId, useState } from 'preact/hooks';
import { t, type MessageKey } from '@/i18n/translate';
import { ExistingLoan } from './ExistingLoan';
import { NewLoan } from './NewLoan';

type Tab = 'newLoan' | 'existingLoan';
const TABS: readonly { tab: Tab; label: MessageKey }[] = [
  { tab: 'newLoan', label: 'tab_newLoan' },
  { tab: 'existingLoan', label: 'tab_existingLoan' },
];

/** Today in the user's time zone, as an ISO date. */
function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Two simulators in tabs. Both stay mounted, so each keeps what was typed in it. */
export function App() {
  const [selected, setSelected] = useState<Tab>('newLoan');
  const [todayDate] = useState(today);
  const idPrefix = useId();
  const tabId = (tab: Tab) => `${idPrefix}-tab-${tab}`;
  const panelId = (tab: Tab) => `${idPrefix}-panel-${tab}`;

  return (
    <>
      <header>
        <h1>{t('extName')}</h1>
        <div class="tabs" role="tablist">
          {TABS.map(({ tab, label }) => (
            <button
              key={tab}
              id={tabId(tab)}
              type="button"
              role="tab"
              aria-selected={selected === tab}
              aria-controls={panelId(tab)}
              onClick={() => setSelected(tab)}
            >
              {t(label)}
            </button>
          ))}
        </div>
      </header>
      <main>
        {TABS.map(({ tab }) => (
          <div
            key={tab}
            id={panelId(tab)}
            class="tab-panel"
            role="tabpanel"
            aria-labelledby={tabId(tab)}
            hidden={selected !== tab}
          >
            {tab === 'newLoan' ? <NewLoan today={todayDate} /> : <ExistingLoan today={todayDate} />}
          </div>
        ))}
      </main>
      <footer class="disclaimer">{t('disclaimer')}</footer>
    </>
  );
}
