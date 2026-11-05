// @vitest-environment happy-dom
import { cleanup, screen, within } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { axeViolations } from './axe';
import { renderApp } from './render-app';

afterEach(cleanup);

const loan = (annualRate: string) => ({ amount: '10000', termMonths: '12', annualRate });
const SCENARIOS = [
  { id: 'jep', name: 'JEP', form: loan('15.6') },
  { id: 'bank', name: 'Bank', form: loan('16') },
  { id: 'coop', name: 'Coop', form: loan('17') },
];

async function openScenarios(scenarios: unknown = SCENARIOS) {
  const user = userEvent.setup();
  await renderApp('en', { scenarios });
  await user.click(screen.getByRole('tab', { name: 'Scenarios' }));
  return user;
}

const actionsOf = (name: string) => within(screen.getByRole('group', { name }));

describe('scenario actions', () => {
  it('opens a scenario in the new-loan tab with the focus on its first field', async () => {
    const user = await openScenarios();
    await user.click(actionsOf('Bank').getByRole('button', { name: 'Open' }));

    expect(screen.getByRole('tab', { selected: true }).textContent).toBe('New loan');
    const amount = screen.getByRole<HTMLInputElement>('textbox', { name: 'Amount' });
    expect(document.activeElement).toBe(amount);
    expect(amount.value).toBe('10000');
  });

  it('puts the focus in the name field while renaming, and back on Rename after', async () => {
    const user = await openScenarios();
    await user.click(actionsOf('Bank').getByRole('button', { name: 'Rename' }));
    const nameField = screen.getByRole<HTMLInputElement>('textbox', { name: 'Scenario name' });
    expect(document.activeElement).toBe(nameField);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(document.activeElement).toBe(actionsOf('Bank').getByRole('button', { name: 'Rename' }));

    await user.click(actionsOf('Bank').getByRole('button', { name: 'Rename' }));
    await user.clear(screen.getByRole('textbox', { name: 'Scenario name' }));
    await user.type(screen.getByRole('textbox', { name: 'Scenario name' }), 'Bank 2');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(document.activeElement).toBe(
      actionsOf('Bank 2').getByRole('button', { name: 'Rename' }),
    );
  });

  it('moves the focus to the next scenario after a delete, or the one before the last', async () => {
    const user = await openScenarios();
    await user.click(actionsOf('Bank').getByRole('button', { name: 'Delete' }));
    expect(document.activeElement).toBe(actionsOf('Coop').getByRole('button', { name: 'Delete' }));

    await user.click(actionsOf('Coop').getByRole('button', { name: 'Delete' }));
    expect(document.activeElement).toBe(actionsOf('JEP').getByRole('button', { name: 'Delete' }));
  });

  it('moves the focus to the empty list title after deleting the last scenario', async () => {
    const user = await openScenarios([SCENARIOS[0]]);
    await user.click(actionsOf('JEP').getByRole('button', { name: 'Delete' }));
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'No saved scenarios yet' }),
    );
  });
});

describe('comparison', () => {
  it('says why a third scenario cannot be checked', async () => {
    const user = await openScenarios();
    await user.click(screen.getByRole('checkbox', { name: 'JEP' }));
    await user.click(screen.getByRole('checkbox', { name: 'Bank' }));

    const third = screen.getByRole('checkbox', { name: 'Coop' });
    expect(third).toHaveProperty('disabled', true);
    const hint = document.getElementById(third.getAttribute('aria-describedby') ?? '');
    expect(hint?.textContent).toBe('Check two to compare them side by side.');
    expect(screen.getByRole('checkbox', { name: 'JEP' }).getAttribute('aria-describedby')).toBe(
      null,
    );
  });

  it('names the comparison table and breaks no axe rule', async () => {
    const user = await openScenarios();
    await user.click(screen.getByRole('checkbox', { name: 'JEP' }));
    await user.click(screen.getByRole('checkbox', { name: 'Bank' }));

    expect(screen.getByRole('table', { name: 'Side by side' })).toBeTruthy();
    expect(await axeViolations()).toEqual([]);
  });
});
