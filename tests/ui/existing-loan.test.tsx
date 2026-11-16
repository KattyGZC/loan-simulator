// @vitest-environment happy-dom
import { cleanup, screen, waitFor, within } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { produbancoForm } from '../sidepanel/fixtures';
import { axeViolations } from './axe';
import { renderApp } from './render-app';

afterEach(cleanup);

async function openWithLoan() {
  const user = userEvent.setup();
  await renderApp('en', { drafts: { newLoan: undefined, existingLoan: produbancoForm() } });
  await user.click(screen.getByRole('tab', { name: 'My loan' }));
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
      'Principal left after the last payment you made, as your statement shows it.',
      'Enter a number.',
    ]);
  });
});

describe('existing-loan rate', () => {
  it('points to the statement for the rate, not to the website', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('tab', { name: 'My loan' }));
    const panel = within(screen.getByRole('tabpanel', { name: 'My loan' }));
    const rate = panel.getByRole('textbox', { name: 'Annual interest rate (%)' });
    const hint = document.getElementById(rate.getAttribute('aria-describedby') ?? '');
    expect(hint?.textContent).toBe(
      "It's on your statement or your lender's amortization schedule.",
    );
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

describe('existing-loan start over', () => {
  const myLoan = () => within(screen.getByRole('tabpanel', { name: 'My loan' }));
  const NEW_LOAN = { amount: '10000', termMonths: '12', annualRate: '15.6' };

  it('empties the form and puts the focus on its first field', async () => {
    const user = userEvent.setup();
    await openWithLoan();
    await user.click(myLoan().getByRole('button', { name: 'Start over' }));

    const balance = myLoan().getByRole<HTMLInputElement>('textbox', { name: 'Balance owed' });
    expect(document.activeElement).toBe(balance);
    expect(balance.value).toBe('');
    expect(screen.queryByRole('table', { name: 'Schedule with the extra payment' })).toBeNull();
  });

  it('keeps the new-loan form, and saves the empty form as the draft', async () => {
    const user = userEvent.setup();
    await renderApp('en', { drafts: { newLoan: NEW_LOAN, existingLoan: produbancoForm() } });
    await user.click(screen.getByRole('tab', { name: 'My loan' }));
    await user.click(myLoan().getByRole('button', { name: 'Start over' }));

    await waitFor(async () => {
      const stored = await fakeBrowser.storage.local.get('draft.existingLoan');
      expect(stored['draft.existingLoan']).toMatchObject({ data: { balance: '' } });
    });
    await user.click(screen.getByRole('tab', { name: 'New loan' }));
    expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Amount' }).value).toBe('10000');
  });
});
