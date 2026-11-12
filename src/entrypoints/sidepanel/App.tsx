import type { ComponentChildren } from 'preact';
import { useId, useRef, useState } from 'preact/hooks';
import { t, type MessageKey } from '@/i18n/translate';
import { saveDraft, type Drafts } from '@/storage/drafts';
import { savePreferences } from '@/storage/preferences';
import { ExistingLoan } from './ExistingLoan';
import { defaultForm, type LoanForm } from './form';
import { Glossary, OpenGlossary } from './Glossary';
import type { GlossaryTerm } from './glossary-terms';
import { BackIcon, BookIcon, SlidersIcon } from './icons';
import { locale, showAmountsIn } from './locale';
import { NewLoan } from './NewLoan';
import { defaultPreferences, restorePreferences } from './preferences';
import { PreferencesForm } from './PreferencesForm';
import { restoreScenarios, type Scenario } from './saved-scenarios';
import { Scenarios } from './Scenarios';
import { useFocusAfterRender } from './useFocusAfterRender';
import { useSaveOnChange } from './useSaveOnChange';
import { useScenarios } from './useScenarios';

type Tab = 'newLoan' | 'existingLoan' | 'scenarios';
const TABS: readonly { tab: Tab; label: MessageKey }[] = [
  { tab: 'newLoan', label: 'tab_newLoan' },
  { tab: 'existingLoan', label: 'tab_existingLoan' },
  { tab: 'scenarios', label: 'tab_scenarios' },
];

/** What a header button opens in place of the tabs. */
type HeaderView = 'glossary' | 'preferences';

/** The tab an arrow key, Home or End moves to from `current`, wrapping around; undefined for other keys. */
function tabForKey(key: string, current: Tab): Tab | undefined {
  const index = TABS.findIndex(({ tab }) => tab === current);
  const last = TABS.length - 1;
  switch (key) {
    case 'ArrowRight':
      return TABS[index === last ? 0 : index + 1]?.tab;
    case 'ArrowLeft':
      return TABS[index === 0 ? last : index - 1]?.tab;
    case 'Home':
      return TABS[0]?.tab;
    case 'End':
      return TABS[last]?.tab;
    default:
      return undefined;
  }
}

/** What the panel had stored, unchecked until each part restores it. */
export interface StoredState {
  drafts: Drafts;
  scenarios: unknown;
  preferences: unknown;
}

/** Today in the user's time zone, as an ISO date. */
function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Two simulators and the saved scenarios, in tabs, and the glossary and the preferences behind
 * header buttons.
 * The tabs stay mounted, so each simulator keeps what was typed in it, and each starts from its
 * draft: what it held when the panel last closed.
 */
export function App({ stored }: { stored: StoredState }) {
  const [selected, setSelected] = useState<Tab>('newLoan');
  const [headerView, setHeaderView] = useState<HeaderView | null>(null);
  // The term a field's definition opened the glossary at, and the button that did it, which
  // gets the focus back when the glossary closes.
  const [glossaryTerm, setGlossaryTerm] = useState<GlossaryTerm>();
  const glossaryOpener = useRef<HTMLElement | null>(null);
  const [todayDate] = useState(today);
  const [preferences, setPreferences] = useState(() =>
    restorePreferences(stored.preferences, defaultPreferences(locale)),
  );
  useSaveOnChange(preferences, savePreferences);
  showAmountsIn(preferences.currency);
  const newLoanDefaults = defaultForm(todayDate, locale, preferences);

  const { scenarios, add, rename, remove } = useScenarios(() =>
    restoreScenarios(stored.scenarios, newLoanDefaults),
  );
  // Restarting mounts the new-loan tab again (a new key), from `form`. A tab saves its draft
  // only when the form changes, so `form` becomes the draft here.
  const [newLoan, setNewLoan] = useState({ draft: stored.drafts.newLoan, restarts: 0 });
  const restartNewLoan = (form: LoanForm) => {
    setNewLoan((current) => ({ draft: form, restarts: current.restarts + 1 }));
    saveDraft('newLoan', form).catch((error: unknown) => console.error(error));
  };
  const openScenario = (scenario: Scenario) => {
    restartNewLoan(scenario.form);
    setSelected('newLoan');
  };

  const content = (tab: Tab) => {
    switch (tab) {
      case 'newLoan':
        return (
          <NewLoan
            key={newLoan.restarts}
            focusFirstField={newLoan.restarts > 0}
            today={todayDate}
            csvSettings={preferences}
            draft={newLoan.draft}
            defaults={newLoanDefaults}
            onSaveScenario={add}
            onStartOver={() => restartNewLoan(newLoanDefaults)}
          />
        );
      case 'existingLoan':
        return (
          <ExistingLoan
            today={todayDate}
            csvSettings={preferences}
            draft={stored.drafts.existingLoan}
          />
        );
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
  const viewId = (view: HeaderView) => `${idPrefix}-${view}`;
  const headerButtons = {
    glossary: useRef<HTMLButtonElement>(null),
    preferences: useRef<HTMLButtonElement>(null),
  };
  const focusAfterRender = useFocusAfterRender();
  const showView = (view: HeaderView | null) => {
    setHeaderView(view);
    setGlossaryTerm(undefined);
    glossaryOpener.current = null;
  };
  const closeView = (view: HeaderView) => {
    const opener = glossaryOpener.current;
    showView(null);
    focusAfterRender(() => opener ?? headerButtons[view].current);
  };
  const openGlossaryAt = (term: GlossaryTerm) => {
    showView('glossary');
    setGlossaryTerm(term);
    glossaryOpener.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  };
  const headerButton = (view: HeaderView, label: MessageKey, icon: ComponentChildren) => (
    <button ref={headerButtons[view]} type="button" class="button" onClick={() => showView(view)}>
      {icon}
      {t(label)}
    </button>
  );
  const moveToTab = (key: string) => {
    const tab = tabForKey(key, selected);
    if (!tab) return false;
    setSelected(tab);
    document.getElementById(tabId(tab))?.focus();
    return true;
  };

  return (
    <>
      <header>
        {/* Chrome names the panel above it, so the title is only for screen readers. */}
        <h1 class="visually-hidden">{t('extName')}</h1>
        <div
          class="tabs"
          role="tablist"
          aria-label={t('tabs_label')}
          hidden={headerView !== null}
          onKeyDown={(event) => {
            if (moveToTab(event.key)) event.preventDefault();
          }}
        >
          {TABS.map(({ tab, label }) => (
            <button
              key={tab}
              id={tabId(tab)}
              type="button"
              role="tab"
              aria-selected={selected === tab}
              aria-controls={panelId(tab)}
              tabIndex={selected === tab ? 0 : -1}
              onClick={() => setSelected(tab)}
            >
              {t(label)}
            </button>
          ))}
        </div>
        {/* The glossary and the preferences are pages of their own: while one shows, the only way
            on is back to the tabs. */}
        <div class="toolbar">
          {headerView === null ? (
            <>
              {headerButton('glossary', 'button_glossary', <BookIcon />)}
              {headerButton('preferences', 'button_preferences', <SlidersIcon />)}
            </>
          ) : (
            <button type="button" class="button" onClick={() => closeView(headerView)}>
              <BackIcon />
              {t('button_back')}
            </button>
          )}
        </div>
      </header>
      <main>
        {headerView === 'glossary' && (
          <Glossary
            key={glossaryTerm}
            id={viewId('glossary')}
            term={glossaryTerm}
            onClose={() => closeView('glossary')}
          />
        )}
        {headerView === 'preferences' && (
          <PreferencesForm
            id={viewId('preferences')}
            preferences={preferences}
            onChange={setPreferences}
            onClose={() => closeView('preferences')}
          />
        )}
        <OpenGlossary.Provider value={openGlossaryAt}>
          {TABS.map(({ tab }) => (
            <div
              key={tab}
              id={panelId(tab)}
              class="tab-panel"
              role="tabpanel"
              aria-labelledby={tabId(tab)}
              tabIndex={0}
              hidden={headerView !== null || selected !== tab}
            >
              {content(tab)}
            </div>
          ))}
        </OpenGlossary.Provider>
      </main>
      <footer class="disclaimer">{t('disclaimer')}</footer>
    </>
  );
}
