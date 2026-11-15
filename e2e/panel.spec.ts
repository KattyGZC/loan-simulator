import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const BYTE_ORDER_MARK = '\uFEFF';

/** 10,000 over 12 months at 15.6 % nominal, French: the annuity at 1.3 % a month is $905.42. */
async function simulateNewLoan(panel: Page) {
  const form = panel.getByRole('tabpanel', { name: 'New loan' });
  await form.getByRole('textbox', { name: 'Amount' }).fill('10000');
  await form.getByRole('textbox', { name: 'Term (months)' }).fill('12');
  await form.getByRole('textbox', { name: 'Annual interest rate (%)' }).fill('15.6');
  await expect(panel.getByRole('status').filter({ hasText: /^Monthly payment:/ })).toHaveText(
    'Monthly payment: $905.42',
  );
}

async function chooseFromResultsMenu(panel: Page, item: string) {
  await panel.getByRole('button', { name: 'More actions' }).click();
  await panel.getByRole('menuitem', { name: item }).click();
}

test('sets the toolbar icon to open the side panel', async ({ serviceWorker }) => {
  await expect
    .poll(() => serviceWorker.evaluate('chrome.sidePanel.getPanelBehavior()'))
    .toEqual({ openPanelOnActionClick: true });
});

test('simulates a new loan and keeps its draft after the panel reopens', async ({ panel }) => {
  await simulateNewLoan(panel);
  await expect(
    panel.getByRole('table', { name: 'Amortization schedule' }).getByRole('row'),
  ).toHaveCount(13);

  await panel.reload();

  await expect(panel.getByRole('textbox', { name: 'Amount' })).toHaveValue('10000');
  await expect(panel.getByRole('status').filter({ hasText: /^Monthly payment:/ })).toHaveText(
    'Monthly payment: $905.42',
  );
});

test('applies an extra payment to a loan already running, as the Produbanco statement does', async ({
  panel,
}) => {
  await panel.getByRole('tab', { name: 'My loan' }).click();
  const form = panel.getByRole('tabpanel', { name: 'My loan' });
  await form.getByRole('textbox', { name: 'Balance owed' }).fill('5843.78');
  await form.getByRole('textbox', { name: 'Payments left' }).fill('32');
  await form.getByRole('textbox', { name: 'Annual interest rate (%)' }).fill('15.6');
  await form
    .getByRole('combobox', { name: 'Amortization method' })
    .selectOption({ label: 'German (fixed principal)' });
  await form.getByLabel('Next payment date').fill('2025-12-17');
  const extraPayment = form.getByRole('group', { name: 'Extra payment' });
  await extraPayment.getByLabel('Date').fill('2025-11-24');
  await extraPayment.getByRole('textbox', { name: 'Amount' }).fill('2700');
  await extraPayment
    .getByRole('combobox', { name: 'Effect' })
    .selectOption({ label: 'Reduce payment (same term)' });
  await form.getByText('Advanced options').click();
  await form
    .getByRole('combobox', { name: 'Day count' })
    .selectOption({ label: 'Actual days/360' });

  // Payment 5 of the statement and the balance it leaves (`tests/golden/produbanco.ts`).
  const schedule = panel.getByRole('table', { name: 'Schedule with the extra payment' });
  const extraPaymentRow = schedule.getByRole('row', { name: /extra payment/ });
  await expect(extraPaymentRow.getByRole('cell')).toHaveText([
    '12/17/2025',
    '$2,731.51',
    '$2,682.29',
    '$49.22',
    '$3,161.49',
  ]);
  await expect(panel.getByRole('status').filter({ hasText: /^You save:/ })).toBeVisible();
});

test('saves a scenario that stays after the panel reopens', async ({ panel }) => {
  await simulateNewLoan(panel);
  await chooseFromResultsMenu(panel, 'Save scenario…');
  const dialog = panel.getByRole('dialog', { name: 'Save this scenario' });
  await dialog.getByRole('textbox', { name: 'Scenario name' }).fill('Credit union, 12 months');
  await dialog.getByRole('button', { name: 'Save scenario' }).click();
  await expect(panel.getByText('Saved. You can find it in the Scenarios tab.')).toBeVisible();

  await panel.reload();
  await panel.getByRole('tab', { name: 'Scenarios' }).click();

  await expect(panel.getByRole('group', { name: 'Credit union, 12 months' })).toBeVisible();
});

test('exports the results to a CSV file a spreadsheet can read', async ({ panel }) => {
  await simulateNewLoan(panel);
  const download = panel.waitForEvent('download');
  await chooseFromResultsMenu(panel, 'Export CSV');

  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.csv$/);
  const csv = await readFile(await file.path(), 'utf8');
  expect(csv.startsWith(BYTE_ORDER_MARK)).toBe(true);
  // Amounts without a currency sign or thousands separators, so they read as numbers.
  expect(csv.split('\r\n')).toEqual(
    expect.arrayContaining(['Monthly payment,905.42', 'Total paid,10865.00']),
  );
});

test('prints the results from a page of their own', async ({ context, panel }) => {
  await simulateNewLoan(panel);
  const printPage = context.waitForEvent('page');
  await chooseFromResultsMenu(panel, 'Print');

  const page = await printPage;
  await expect(page).toHaveURL(/\/print\.html$/);
  await expect(page.getByRole('table')).not.toHaveCount(0);
  await expect(page.getByText('$905.42').first()).toBeVisible();
});
