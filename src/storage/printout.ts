const PRINTOUT_KEY = 'printout';

/**
 * Keeps what the print page shows next. Session storage, unlike the rest, empties when the
 * browser closes or the extension updates, so a printout is never read by another version and
 * needs no `schemaVersion`.
 */
export async function savePrintout(printout: object): Promise<void> {
  await browser.storage.session.set({ [PRINTOUT_KEY]: printout });
}

/** The last printout saved, as stored: unchecked until the print page restores it. */
export async function loadPrintout(): Promise<unknown> {
  const stored = await browser.storage.session.get(PRINTOUT_KEY);
  return stored[PRINTOUT_KEY];
}
