// @vitest-environment happy-dom
import { cleanup, screen, waitFor, within } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { produbancoForm } from '../sidepanel/fixtures';
import { axeViolations } from './axe';
import { renderApp } from './render-app';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const NEW_LOAN = { amount: '10000', termMonths: '12', annualRate: '15.6', solcaEnabled: false };

async function renderNewLoanResults() {
  const user = userEvent.setup();
  await renderApp('en', { drafts: { newLoan: NEW_LOAN, existingLoan: undefined } });
  await screen.findByRole('table', { name: 'Amortization schedule' });
  return user;
}

const menuButton = () => screen.getByRole('button', { name: 'More actions' });
const itemNames = () => screen.getAllByRole('menuitem').map((item) => item.textContent);

describe('results menu', () => {
  it('opens with the focus on its first item and lists what can be done with the results', async () => {
    const user = await renderNewLoanResults();
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');

    await user.click(menuButton());

    expect(menuButton().getAttribute('aria-expanded')).toBe('true');
    expect(itemNames()).toEqual(['Save scenario…', 'Export CSV', 'Print']);
    expect(document.activeElement?.textContent).toBe('Save scenario…');
  });

  it('moves between items with the arrow keys, Home and End, wrapping around', async () => {
    const user = await renderNewLoanResults();
    await user.click(menuButton());

    await user.keyboard('{ArrowUp}');
    expect(document.activeElement?.textContent).toBe('Print');
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement?.textContent).toBe('Save scenario…');
    await user.keyboard('{End}');
    expect(document.activeElement?.textContent).toBe('Print');
    await user.keyboard('{Home}');
    expect(document.activeElement?.textContent).toBe('Save scenario…');
    await user.keyboard('a');
    expect(document.activeElement?.textContent).toBe('Save scenario…');
  });

  it('closes with Escape and gives the focus back to its button', async () => {
    const user = await renderNewLoanResults();
    await user.click(menuButton());

    await user.keyboard('{Escape}');

    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(menuButton());
  });

  it('closes when the focus leaves it with Tab, or on a click outside', async () => {
    const user = await renderNewLoanResults();
    await user.click(menuButton());
    await user.tab();
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');

    await user.click(menuButton());
    await user.click(screen.getByRole('heading', { name: 'Loan Simulator' }));
    expect(menuButton().getAttribute('aria-expanded')).toBe('false');
  });

  it('breaks no axe rule while open', async () => {
    const user = await renderNewLoanResults();
    await user.click(menuButton());
    expect(await axeViolations()).toEqual([]);
  });

  it('downloads the results as a CSV file', async () => {
    const user = await renderNewLoanResults();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:results');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Export CSV' }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    const link = click.mock.contexts[0];
    if (!(link instanceof HTMLAnchorElement)) throw new Error('No link was clicked.');
    expect(link.download).toMatch(/\.csv$/);
    expect(document.activeElement).toBe(menuButton());
  });

  it('opens the print page in a new tab', async () => {
    const user = await renderNewLoanResults();
    const create = vi.spyOn(fakeBrowser.tabs, 'create');

    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Print' }));

    await waitFor(() => expect(create).toHaveBeenCalledOnce());
    expect(create.mock.calls[0]?.[0].url).toMatch(/\/print\.html$/);
  });

  it('logs the error when the print page cannot open', async () => {
    const user = await renderNewLoanResults();
    const failure = new Error('No tab.');
    vi.spyOn(fakeBrowser.tabs, 'create').mockRejectedValue(failure);
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Print' }));

    await waitFor(() => expect(logged).toHaveBeenCalledWith(failure));
  });

  it('offers only exporting and printing for a loan you already have, and does both', async () => {
    const user = userEvent.setup();
    await renderApp('en', { drafts: { newLoan: undefined, existingLoan: produbancoForm() } });
    await user.click(screen.getByRole('tab', { name: 'Loan I already have' }));
    await screen.findByRole('table', { name: 'Schedule with the extra payment' });

    await user.click(menuButton());

    expect(itemNames()).toEqual(['Export CSV', 'Print']);

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:results');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await user.click(screen.getByRole('menuitem', { name: 'Export CSV' }));
    expect(click).toHaveBeenCalledOnce();

    const create = vi.spyOn(fakeBrowser.tabs, 'create');
    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Print' }));
    await waitFor(() => expect(create).toHaveBeenCalledOnce());
  });
});

describe('save scenario dialog', () => {
  it('opens from the menu, saves the scenario and says where to find it', async () => {
    const user = await renderNewLoanResults();
    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Save scenario…' }));

    const dialog = screen.getByRole('dialog', { name: 'Save this scenario' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Institution' }), 'JEP');
    expect(
      within(dialog).getByRole<HTMLInputElement>('textbox', { name: 'Scenario name' }).value,
    ).toBe('JEP');
    await user.click(within(dialog).getByRole('button', { name: 'Save scenario' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Saved. You can find it in the Scenarios tab.')).toBeTruthy();
    await user.click(screen.getByRole('tab', { name: 'Scenarios' }));
    expect(screen.getByRole('checkbox', { name: 'JEP' })).toBeTruthy();
  });

  it('suggests the name from institution and segment until the user types one', async () => {
    const user = await renderNewLoanResults();
    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Save scenario…' }));
    const dialog = screen.getByRole('dialog', { name: 'Save this scenario' });
    const name = within(dialog).getByRole<HTMLInputElement>('textbox', { name: 'Scenario name' });

    await user.type(within(dialog).getByRole('textbox', { name: 'Institution' }), 'JEP');
    await user.type(within(dialog).getByRole('textbox', { name: 'Segment' }), 'Consumer');
    expect(name.value).toBe('JEP – Consumer');

    await user.clear(name);
    await user.type(name, 'My option');
    await user.type(within(dialog).getByRole('textbox', { name: 'Segment' }), ' loan');
    expect(name.value).toBe('My option');

    await user.click(within(dialog).getByRole('button', { name: 'Save scenario' }));
    await user.click(screen.getByRole('tab', { name: 'Scenarios' }));
    expect(screen.getByRole('checkbox', { name: 'My option' })).toBeTruthy();
  });

  it('cannot save without a name, and closes with Cancel without saving', async () => {
    const user = await renderNewLoanResults();
    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Save scenario…' }));
    const dialog = screen.getByRole('dialog', { name: 'Save this scenario' });

    const save = within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Save scenario' });
    expect(save.disabled).toBe(true);
    await user.type(within(dialog).getByRole('textbox', { name: 'Scenario name' }), '{Enter}');
    expect(screen.getByRole('dialog')).toBeTruthy();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Saved. You can find it in the Scenarios tab.')).toBeNull();
  });

  it('breaks no axe rule while open', async () => {
    const user = await renderNewLoanResults();
    await user.click(menuButton());
    await user.click(screen.getByRole('menuitem', { name: 'Save scenario…' }));
    expect(await axeViolations()).toEqual([]);
  });
});
