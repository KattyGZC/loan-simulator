import { beforeEach, describe, expect, it } from 'vitest';
import { simulate, type LoanInput } from '@/core';
import {
  csvSeparator,
  existingLoanCsv,
  newLoanCsv,
  type CsvSettings,
} from '@/entrypoints/sidepanel/csv';
import {
  defaultExistingLoanForm,
  simulateExistingLoanForm,
} from '@/entrypoints/sidepanel/existing-form';
import { useLocale } from '../i18n/fake-i18n';

const LOAN: LoanInput = {
  amount: 10000,
  termMonths: 12,
  annualRate: 15.6,
  rateType: 'nominal',
  method: 'french',
};

function simulation(input: Partial<LoanInput> = {}) {
  const result = simulate({ ...LOAN, ...input });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
}

/** The Produbanco loan after payment 4, with an extra payment made on 2025-11-24. */
function produbancoExtraPayment(extraPaymentAmount = '2700') {
  const result = simulateExistingLoanForm(
    {
      ...defaultExistingLoanForm('2025-11-24'),
      balance: '5843.78',
      remainingPayments: '32',
      annualRate: '15.6',
      method: 'german',
      nextPaymentDate: '2025-12-17',
      dayCount: 'actual360',
      extraPaymentAmount,
      extraPaymentEffect: 'reducePayment',
    },
    'en-US',
  );
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result;
}

const BYTE_ORDER_MARK = '\uFEFF';
const POINT: CsvSettings = { currency: 'USD', fileDecimalSign: 'point' };
const COMMA: CsvSettings = { currency: 'USD', fileDecimalSign: 'comma' };

/** The file's lines, without the byte order mark and the final line break. */
function lines(csv: string): string[] {
  return csv.slice(BYTE_ORDER_MARK.length).replace(/\r\n$/, '').split('\r\n');
}

beforeEach(() => useLocale('en'));

describe('csvSeparator', () => {
  it('is a semicolon with a decimal comma and a comma with a decimal point', () => {
    expect(csvSeparator('comma')).toBe(';');
    expect(csvSeparator('point')).toBe(',');
  });
});

describe('newLoanCsv', () => {
  it('starts with a byte order mark and ends every line with CRLF', () => {
    const csv = newLoanCsv(simulation(), true, POINT);
    expect(csv.startsWith(BYTE_ORDER_MARK)).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.replaceAll('\r\n', '')).not.toMatch(/[\r\n]/);
  });

  it('names the currency, then the summary, the schedule and the disclaimer', () => {
    const rows = lines(newLoanCsv(simulation(), true, POINT));
    expect(rows.slice(0, 4)).toEqual(['Currency,USD', '', 'Summary', 'Monthly payment,905.42']);
    const scheduleTitle = rows.indexOf('Amortization schedule');
    expect(rows[scheduleTitle - 1]).toBe('');
    expect(rows[scheduleTitle + 1]).toBe('#,Payment,Principal,Interest,Balance');
    expect(rows[scheduleTitle + 2]).toBe('1,905.42,775.42,130.00,9224.58');
    expect(rows[scheduleTitle + 13]).toBe('12,905.38,893.76,11.62,0.00');
    expect(rows.slice(-2)).toEqual([
      '',
      'Estimates only. The institution sets the actual payment when it approves the loan.',
    ]);
  });

  it('writes amounts without thousands separators, so a spreadsheet reads them as numbers', () => {
    const rows = lines(newLoanCsv(simulation(), true, POINT));
    expect(rows).toContain('Total paid,10865.00');
    expect(rows).toContain('Nominal rate,15.6%');
  });

  it('follows the decimal sign, not the language: Spanish labels with a decimal point', () => {
    useLocale('es');
    const rows = lines(newLoanCsv(simulation(), true, POINT));
    expect(rows[0]).toBe('Moneda,USD');
    expect(rows).toContain('1,905.42,775.42,130.00,9224.58');
    expect(rows).toContain('Tasa nominal,15.6%');
  });

  it('writes Spanish files with a semicolon, a decimal comma and Spanish labels', () => {
    useLocale('es');
    const rows = lines(newLoanCsv(simulation(), true, COMMA));
    expect(rows[0]).toBe('Moneda;USD');
    expect(rows).toContain('N.º;Cuota;Capital;Interés;Saldo');
    expect(rows).toContain('1;905,42;775,42;130,00;9224,58');
    expect(rows).toContain('Total pagado;10865,00');
    expect(rows).toContain('Tasa nominal;15,6%');
  });

  it('has the columns the table shows: dates, insurance and other charges when the loan has them', () => {
    const csv = newLoanCsv(
      simulation({
        firstPaymentDate: '2027-01-31',
        insurance: { rate: 0.5, unit: 'percentPerYear', base: 'balance' },
        otherCharges: 2,
      }),
      true,
      { currency: 'EUR', fileDecimalSign: 'point' },
    );
    const rows = lines(csv);
    expect(rows[0]).toBe('Currency,EUR');
    expect(rows).toContain('#,Date,Payment,Principal,Interest,Insurance,Other,Balance');
    expect(rows.find((row) => row.startsWith('1,'))).toMatch(/^1,2027-01-31,/);
  });

  it('writes each warning on its own row after the currency', () => {
    const rows = lines(newLoanCsv(simulation({ maxRate: 15.5 }), true, POINT));
    expect(rows.slice(0, 3)).toEqual([
      'Currency,USD',
      'The effective rate (16.77%) is above the segment maximum (15.5%).',
      '',
    ]);
  });

  it('shows the first and last payment when they differ', () => {
    const rows = lines(newLoanCsv(simulation({ method: 'german' }), false, POINT));
    expect(rows.some((row) => row.startsWith('First payment,'))).toBe(true);
    expect(rows.some((row) => row.startsWith('Last payment,'))).toBe(true);
    expect(rows.some((row) => row.startsWith('Monthly payment,'))).toBe(false);
  });
});

describe('existingLoanCsv', () => {
  it('has how the extra payment is applied, what it saves, the comparison and the schedule', () => {
    const rows = lines(existingLoanCsv(produbancoExtraPayment(), POINT));
    expect(rows.slice(0, 6)).toEqual([
      'Currency,USD',
      '',
      'How the extra payment is applied',
      'Interest accrued to 2025-11-24,17.71',
      'To principal,2682.29',
      'New balance,3161.49',
    ]);
    expect(rows[7]).toBe('');
    expect(rows[8]).toBe('Without vs. with the extra payment');
    expect(rows).toContain(',Without,With');
    expect(rows.some((row) => row.startsWith('Total interest,'))).toBe(true);
    const scheduleTitle = rows.indexOf('Schedule with the extra payment');
    expect(rows[scheduleTitle + 1]).toBe('#,Date,Payment,Principal,Interest,Balance');
    expect(rows.at(-1)).toMatch(/^Estimates only\./);
  });

  it('adds the note when the extra payment covers the principal of its payment', () => {
    const rows = lines(existingLoanCsv(produbancoExtraPayment(), POINT));
    expect(rows[6]).toBe(
      '"It also covers the principal of payment 1 (2025-12-17), which then charges only interest."',
    );
  });

  it('leaves the note out when the extra payment does not cover that principal', () => {
    const rows = lines(existingLoanCsv(produbancoExtraPayment('100'), POINT));
    expect(rows[6]).toBe('');
    expect(rows.some((row) => row.includes('It also covers'))).toBe(false);
  });

  it('writes the clipped extra payment warning, in Spanish with semicolons', () => {
    useLocale('es');
    const rows = lines(existingLoanCsv(produbancoExtraPayment('10000'), COMMA));
    expect(rows[0]).toBe('Moneda;USD');
    expect(rows[1]).toMatch(/^El abono es mayor que lo que debes: solo se aplican 5\d{3},\d{2},/);
    expect(rows).toContain(';Sin abono;Con abono');
  });
});
