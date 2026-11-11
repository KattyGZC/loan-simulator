import { savePrintout } from '@/storage/printout';
import type { Printout } from './printout';

async function storeAndOpen(printout: Printout) {
  await savePrintout(printout);
  await browser.tabs.create({ url: browser.runtime.getURL('/print.html') });
}

/**
 * Opens `printout` in a page laid out for paper, to print or save. The panel is narrower than
 * paper and holds the forms, so a page in its own tab prints instead.
 */
export function openPrintPage(printout: Printout) {
  storeAndOpen(printout).catch((error: unknown) => console.error(error));
}
