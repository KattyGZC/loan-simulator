import { useId, useState } from 'preact/hooks';
import { t, type MessageKey } from '@/i18n/translate';
import { saveDraft, type Drafts } from '@/storage/drafts';
import { ExistingLoan } from './ExistingLoan';
import { defaultForm } from './form';
import { locale } from './locale';
import { NewLoan } from './NewLoan';
import { restoreScenarios, type Scenario } from './saved-scenarios';
import { Scenarios } from './Scenarios';
import { useScenarios } from './useScenarios';

type Tab = 'newLoan' | 'existingLoan' | 'scenarios';
const TABS: readonly { tab: Tab; label: MessageKey }[] = [
  { tab: 'newLoan', label: 'tab_newLoan' },
  { tab: 'existingLoan', label: 'tab_existingLoan' },
  { tab: 'scenarios', label: 'tab_scenarios' },
];

/** What the panel had stored, unchecked until each part restores it. */
export interface StoredState {
  drafts: Drafts;
  scenarios: unknown;
}

/** Today in the user's time zone, as an ISO date. */
function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Two simulators and the saved scenarios, in tabs. The tabs stay mounted, so each simulator
 * keeps what was typed in it, and each starts from its draft: what it held when the panel last
 * closed.
 */
export function App({ stored }: { stored: StoredState }) {
  const [selected, setSelected] = useState<Tab>('newLoan');
  const [todayDate] = useState(today);
  const { scenarios, add, rename, remove } = useScenarios(() =>
    restoreScenarios(stored.scenarios, defaultForm(todayDate, locale)),
  );
  // Opening a scenario mounts the new-loan tab again (a new key), starting from its form. A tab
  // saves its draft only when the form changes, so the scenario becomes the draft here.
  const [newLoan, setNewLoan] = useState({ draft: stored.drafts.newLoan, opened: 0 });
  const openScenario = (scenario: Scenario) => {
    setNewLoan((current) => ({ draft: scenario.form, opened: current.opened + 1 }));
    setSelected('newLoan');
    saveDraft('newLoan', scenario.form).catch((error: unknown) => console.error(error));
  };
  const content = (tab: Tab) => {
    switch (tab) {
      case 'newLoan':
        return (
          <NewLoan
            key={newLoan.opened}
            today={todayDate}
            draft={newLoan.draft}
            onSaveScenario={add}
          />
        );
      case 'existingLoan':
        return <ExistingLoan today={todayDate} draft={stored.drafts.existingLoan} />;
      case 'scenarios':
        return (
          <Scenarios
            scenarios={scenarios}
            onOpen={openScenario}
            onRename={rename}
            onRemove={remove}
          />
        );
    }
  };
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
            {content(tab)}
          </div>
        ))}
      </main>
      <footer class="disclaimer">{t('disclaimer')}</footer>
    </>
  );
}
