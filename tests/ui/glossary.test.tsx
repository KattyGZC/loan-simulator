// @vitest-environment happy-dom
import { cleanup, screen, within } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { axeViolations } from './axe';
import { renderApp } from './render-app';

afterEach(cleanup);

const GROUPS = {
  'The basics': [
    'Principal (amount)',
    'Interest',
    'Term',
    'Payment (installment)',
    'Balance',
    'Amortization schedule',
    'Amortization method',
  ],
  'The rate': ['Nominal rate', 'Effective rate', 'Segment maximum rate', 'Day count'],
  'Insurance and charges': [
    'Credit life insurance',
    'SOLCA contribution',
    'Other charges',
    'Total cost',
  ],
  'Dates and extra payments': ['Disbursement', 'Due date', 'Extra payment'],
};

async function openGlossary() {
  const user = userEvent.setup();
  await renderApp();
  await user.click(screen.getByRole('button', { name: 'Glossary' }));
  return user;
}

describe('glossary', () => {
  it('lists every term under its group, with a definition and an example', async () => {
    await openGlossary();
    const glossary = within(screen.getByRole('region', { name: 'Glossary' }));
    for (const [group, terms] of Object.entries(GROUPS)) {
      const section = within(glossary.getByRole('region', { name: group }));
      expect(section.getAllByRole('term').map((term) => term.textContent)).toEqual(terms);
      expect(section.getAllByRole('definition')).toHaveLength(terms.length * 2);
    }
    expect(glossary.getByText(/^Example: \$10,000 over 12 months at 15\.6% nominal/)).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('takes the focus when it opens', async () => {
    await openGlossary();
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Glossary' }));
  });

  it('closes with Escape and gives the focus back to its button', async () => {
    const user = await openGlossary();
    await user.keyboard('{Escape}');

    const button = screen.getByRole('button', { name: 'Glossary' });
    expect(document.activeElement).toBe(button);
    expect(screen.queryByRole('region', { name: 'Glossary' })).toBeNull();
    expect(screen.getByRole('tablist')).toBeTruthy();
  });

  it('closes with Escape while the focus is on Back', async () => {
    const user = await openGlossary();
    screen.getByRole('button', { name: 'Back' }).focus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Glossary' })).toBeNull();
  });

  it('stays open on other keys', async () => {
    const user = await openGlossary();
    await user.keyboard('{Enter}a');
    expect(screen.getByRole('region', { name: 'Glossary' })).toBeTruthy();
  });

  it('hides the preferences button, so only Back leads out', async () => {
    const user = await openGlossary();
    expect(screen.queryByRole('button', { name: 'Preferences' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('button', { name: 'Preferences' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Glossary' }));
  });

  it('breaks no axe rule while open', async () => {
    await openGlossary();
    expect(await axeViolations()).toEqual([]);
  });
});

describe('the "?" of a field', () => {
  const panel = () => within(screen.getByRole('tabpanel'));
  const help = () => panel().getByRole('button', { name: 'What is Other charges?' });
  /** The definition the button shows and hides. */
  const definition = () => document.getElementById(help().getAttribute('aria-controls') ?? '');

  async function openAdvanced() {
    const user = userEvent.setup();
    await renderApp();
    await user.click(panel().getByText('Advanced options'));
    return user;
  }

  it('names the term it explains and starts collapsed', async () => {
    await openAdvanced();
    expect(help().getAttribute('aria-expanded')).toBe('false');
    expect(definition()?.hidden).toBe(true);
  });

  it('shows the definition below the label, and hides it on a second press', async () => {
    const user = await openAdvanced();

    await user.click(help());
    expect(help().getAttribute('aria-expanded')).toBe('true');
    expect(definition()?.hidden).toBe(false);
    expect(definition()?.textContent).toMatch(/^Fixed amounts some lenders add to every payment/);

    await user.click(help());
    expect(help().getAttribute('aria-expanded')).toBe('false');
    expect(definition()?.hidden).toBe(true);
  });

  it('hides the definition with Escape', async () => {
    const user = await openAdvanced();
    await user.click(help());

    await user.keyboard('{Escape}');
    expect(definition()?.hidden).toBe(true);
  });

  it('opens the glossary at its term, and gives the focus back when it closes', async () => {
    const user = await openAdvanced();
    await user.click(help());
    const link = panel().getByRole('button', { name: 'Example in the glossary' });
    await user.click(link);

    const term = screen.getByText('Other charges', { selector: 'dt' });
    expect(document.activeElement).toBe(term);
    expect(term.parentElement?.classList.contains('target')).toBe(true);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Glossary' })).toBeNull();
    expect(document.activeElement).toBe(link);
  });

  it('hides only the definition with Escape, not the preferences around it', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: 'Preferences' }));
    const preferences = within(screen.getByRole('region', { name: 'Preferences' }));
    const solcaHelp = preferences.getByRole('button', { name: 'What is SOLCA contribution?' });
    await user.click(solcaHelp);

    await user.keyboard('{Escape}');
    expect(solcaHelp.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('region', { name: 'Preferences' })).toBeTruthy();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Preferences' })).toBeNull();
  });

  it('leaves Escape to the preferences while its definition is hidden', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: 'Preferences' }));
    screen.getByRole('button', { name: 'What is SOLCA contribution?' }).focus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Preferences' })).toBeNull();
  });

  it('offers no way to the glossary from the preferences, which the glossary replaces', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: 'Preferences' }));
    await user.click(screen.getByRole('button', { name: 'What is SOLCA contribution?' }));
    expect(screen.queryByRole('button', { name: 'Example in the glossary' })).toBeNull();
  });

  it('sits next to a checkbox without becoming part of its name', async () => {
    const user = await openAdvanced();

    expect(panel().getByRole('checkbox', { name: 'SOLCA contribution' })).toBeTruthy();
    await user.click(panel().getByRole('button', { name: 'What is SOLCA contribution?' }));
    expect(panel().getByText(/^A 0\.5% contribution on loans in Ecuador/)).toBeTruthy();
  });

  it('breaks no axe rule while a definition shows', async () => {
    const user = await openAdvanced();
    await user.click(help());
    expect(await axeViolations()).toEqual([]);
  });
});

describe('the hint of a choice', () => {
  const panel = () => within(screen.getByRole('tabpanel'));

  it('says what the chosen option means, and follows the choice', async () => {
    const user = userEvent.setup();
    await renderApp();
    const method = panel().getByRole('combobox', { name: 'Amortization method' });
    const hint = () => document.getElementById(method.getAttribute('aria-describedby') ?? '');
    expect(hint()?.textContent).toBe('The same payment every month.');

    await user.selectOptions(method, 'german');
    expect(hint()?.textContent).toBe('A higher first payment that falls every month.');
  });

  it('tells where to find the rate until it is typed, then the rate of the other type', async () => {
    const user = userEvent.setup();
    await renderApp();
    const rate = panel().getByRole('textbox', { name: 'Annual interest rate (%)' });
    const hint = () => document.getElementById(rate.getAttribute('aria-describedby') ?? '');
    expect(hint()?.textContent).toMatch(/^It's in the Transparency section/);

    await user.type(rate, '15.6');
    expect(await screen.findByText('Effective rate: 16.77%')).toBe(hint());
  });
});
