import { render } from 'preact';
import { t, uiLanguage } from '@/i18n/translate';
import { loadDrafts } from '@/storage/drafts';
import { loadPreferences } from '@/storage/preferences';
import { loadScenarios } from '@/storage/scenarios';
import { App, type StoredState } from './App';
import './style.css';

const root = document.getElementById('app');
if (!root) throw new Error('The side panel page has no #app element to render into.');
document.documentElement.lang = uiLanguage();
document.title = t('extName');
// What was stored loads before the first render, so the panel never shows the empty form
// first. When it cannot be read, the panel opens empty rather than not at all.
const nothingStored: StoredState = {
  drafts: { newLoan: undefined, existingLoan: undefined },
  scenarios: undefined,
  preferences: undefined,
};
Promise.all([loadDrafts(), loadScenarios(), loadPreferences()])
  .then(([drafts, scenarios, preferences]): StoredState => ({ drafts, scenarios, preferences }))
  .catch((error: unknown) => {
    console.error(error);
    return nothingStored;
  })
  .then((stored) => render(<App stored={stored} />, root));
