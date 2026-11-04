import { t } from '@/i18n/translate';
import { savePrintout } from '@/storage/printout';
import type { Printout } from './printout';

interface PrintResultsProps {
  /** What goes on paper, built only when the user asks for it. */
  printout: () => Printout;
}

// The panel is narrower than paper and holds the forms, so a page in its own tab prints instead.
async function openPrintPage(printout: Printout) {
  await savePrintout(printout);
  await browser.tabs.create({ url: browser.runtime.getURL('/print.html') });
}

/** The button that opens the results on screen in a page laid out for paper, to print or save. */
export function PrintResults({ printout }: PrintResultsProps) {
  return (
    <button
      type="button"
      class="button"
      onClick={() => openPrintPage(printout()).catch((error: unknown) => console.error(error))}
    >
      {t('button_print')}
    </button>
  );
}
