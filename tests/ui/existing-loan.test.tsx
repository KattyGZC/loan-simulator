// @vitest-environment happy-dom
import { cleanup, screen, waitFor, within } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { produbancoForm } from '../sidepanel/fixtures';
import { axeViolations } from './axe';
import { renderApp } from './render-app';

afterEach(cleanup);

async function openWithLoan() {
  const user = userEvent.setup();
  await renderApp('en', { drafts: { newLoan: undefined, existingLoan: produbancoForm() } });
  await user.click(screen.getByRole('tab', { name: 'Loan I already have' }));
  return screen.findByRole('table', { name: 'Schedule with the extra payment' });
}

describe('existing-loan fields', () => {
  it('keeps the hint when the field shows an error, and describes it by both', async () => {
    await openWithLoan();
    const user = userEvent.setup();
    const balance = screen.getByRole('textbox', { name: 'Balance owed' });

    await user.clear(balance);
    await user.type(balance, 'abc');
    await user.tab();

    // The error follows the results, which wait for typing to pause.
    await waitFor(() => expect(balance.getAttribute('aria-invalid')).toBe('true'));
    const notes = (balance.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent);
    expect(notes).toEqual([
      'Principal left after your last payment, as your statement shows it.',
      'Enter a number.',
    ]);
  });
});

describe('existing-loan results', () => {
  it('says in words which row holds the extra payment', async () => {
    const table = await openWithLoan();
    const marked = within(table)
      .getAllByRole('rowheader')
      .filter((cell) => cell.textContent.includes('(extra payment)'));
    expect(marked.map((cell) => cell.textContent)).toEqual(['1 (extra payment)']);
  });

  it('announces what the extra payment saves', async () => {
    await openWithLoan();
    const status = screen
      .getAllByRole('status')
      .find((region) => region.textContent.startsWith('You save: $'));
    expect(status).toBeTruthy();
  });

  it('names the comparison table after its section', async () => {
    await openWithLoan();
    expect(screen.getByRole('table', { name: 'Without vs. with the extra payment' })).toBeTruthy();
  });

  it('breaks no axe rule with results on screen', async () => {
    await openWithLoan();
    expect(await axeViolations()).toEqual([]);
  });
});
