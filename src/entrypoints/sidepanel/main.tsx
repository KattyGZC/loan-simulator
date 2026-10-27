import { render } from 'preact';
import { t, uiLanguage } from '@/i18n/translate';
import { loadDrafts, type Drafts } from '@/storage/drafts';
import { App } from './App';
import './style.css';

const root = document.getElementById('app');
if (!root) throw new Error('The side panel page has no #app element to render into.');
document.documentElement.lang = uiLanguage();
document.title = t('extName');
// The drafts load before the first render, so the panel never shows the empty form first.
// When they cannot be read, the panel opens empty rather than not at all.
const noDrafts: Drafts = { newLoan: undefined, existingLoan: undefined };
loadDrafts()
  .catch((error: unknown) => {
    console.error(error);
    return noDrafts;
  })
  .then((drafts) => render(<App drafts={drafts} />, root));
