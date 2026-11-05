// @vitest-environment happy-dom
import { cleanup, render, screen, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PrintPage } from '@/entrypoints/print/PrintPage';
import { existingLoanPrintout } from '@/entrypoints/sidepanel/printout';
import { createFormat } from '@/i18n/format';
import { useLocale } from '../i18n/fake-i18n';
import { produbancoExtraPayment } from '../sidepanel/fixtures';
import { axeViolations } from './axe';

beforeEach(() => {
  useLocale('en');
  document.documentElement.lang = 'en';
  document.title = 'Print';
});
afterEach(cleanup);

function renderPrintout() {
  const printout = existingLoanPrintout(
    produbancoExtraPayment(),
    '2026-11-04',
    createFormat('en-US', 'USD'),
  );
  return render(<PrintPage printout={printout} />);
}

describe('print page', () => {
  it('names each table after its section and says which row holds the extra payment', () => {
    renderPrintout();
    const schedule = screen.getByRole('table', { name: 'Schedule with the extra payment' });
    const marked = within(schedule)
      .getAllByRole('rowheader')
      .filter((cell) => cell.textContent.includes('(extra payment)'));
    expect(marked.map((cell) => cell.textContent)).toEqual(['1 (extra payment)']);
  });

  it('breaks no axe rule', async () => {
    renderPrintout();
    expect(await axeViolations()).toEqual([]);
  });
});
