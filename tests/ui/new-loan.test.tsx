// @vitest-environment happy-dom
import { cleanup, screen, within } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { axeViolations } from './axe';
import { renderApp } from './render-app';

afterEach(cleanup);

const LOAN = { amount: '10000', termMonths: '12', annualRate: '15.6', solcaEnabled: false };
const field = (name: string) => screen.getByRole<HTMLInputElement>('textbox', { name });
describe('new-loan fields', () => {
  it('marks the fields the results wait for as required', async () => {
    await renderApp();
    const required = ['Amount', 'Term (months)', 'Annual interest rate (%)'];
    for (const name of required) expect(field(name).getAttribute('aria-required')).toBe('true');
    expect(field('Other charges per payment').getAttribute('aria-required')).toBeNull();
  });
});

describe('new-loan results', () => {
  it('announces the payment once the loan is complete', async () => {
    await renderApp('en', { drafts: { newLoan: LOAN, existingLoan: undefined } });
    const status = await screen.findByText(/^Monthly payment: \$/);
    expect(status.getAttribute('role')).toBe('status');
  });

  it('announces that the fields need fixing when one is invalid', async () => {
    const user = userEvent.setup();
    await renderApp('en', { drafts: { newLoan: LOAN, existingLoan: undefined } });
    await screen.findByText(/^Monthly payment: \$/);

    await user.clear(field('Term (months)'));
    await user.type(field('Term (months)'), '0');

    const statuses = await screen.findAllByText('Fix the marked fields to see the results.');
    expect(statuses.some((status) => status.getAttribute('role') === 'status')).toBe(true);
  });

  it('keeps an empty status region while the loan is incomplete', async () => {
    await renderApp();
    const regions = screen.getAllByRole('status');
    expect(regions.map((region) => region.textContent)).toContain('');
  });

  it('names the schedule table after its title', async () => {
    await renderApp('en', { drafts: { newLoan: LOAN, existingLoan: undefined } });
    const table = await screen.findByRole('table', { name: 'Amortization schedule' });
    expect(within(table).getAllByRole('row')).toHaveLength(13);
  });

  it('breaks no axe rule with results on screen', async () => {
    await renderApp('en', { drafts: { newLoan: LOAN, existingLoan: undefined } });
    await screen.findByRole('table', { name: 'Amortization schedule' });
    expect(await axeViolations()).toEqual([]);
  });
});

describe('start over', () => {
  it('puts the focus on the first field of the new form', async () => {
    const user = userEvent.setup();
    await renderApp('en', { drafts: { newLoan: LOAN, existingLoan: undefined } });
    await user.click(screen.getByRole('button', { name: 'Start over' }));

    expect(document.activeElement).toBe(field('Amount'));
    expect(field('Amount').value).toBe('');
  });
});
