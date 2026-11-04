import { render } from 'preact';
import { restorePrintout } from '@/entrypoints/sidepanel/printout';
import { t, uiLanguage } from '@/i18n/translate';
import { loadPrintout } from '@/storage/printout';
import { PrintPage } from './PrintPage';
import './style.css';

const root = document.getElementById('app');
if (!root) throw new Error('The print page has no #app element to render into.');
document.documentElement.lang = uiLanguage();
loadPrintout()
  .then(restorePrintout)
  .catch((error: unknown) => {
    console.error(error);
    return null;
  })
  .then((printout) => {
    // Chrome names the PDF after the page title.
    document.title = printout?.title ?? t('extName');
    render(<PrintPage printout={printout} />, root);
    if (printout) window.print();
  });
