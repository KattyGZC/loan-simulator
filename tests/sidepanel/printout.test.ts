import { beforeEach, describe, expect, it } from 'vitest';
import {
  existingLoanPrintout,
  newLoanPrintout,
  restorePrintout,
  type PrintBlock,
  type Printout,
} from '@/entrypoints/sidepanel/printout';
import { createFormat } from '@/i18n/format';
import { useLocale } from '../i18n/fake-i18n';
import { produbancoExtraPayment, simulation } from './fixtures';

const TODAY = '2026-11-04';
const usd = () => createFormat('en-US', 'USD');

function tableOf(printout: Printout, sectionTitle: string) {
  const block = printout.sections
    .find((section) => section.title === sectionTitle)
    ?.blocks.find((candidate) => candidate.kind === 'table');
  if (block?.kind !== 'table') throw new Error(`No table under "${sectionTitle}"`);
  return block;
}

beforeEach(() => useLocale('en'));

describe('newLoanPrintout', () => {
  it('has a dated title, the summary, the schedule and the disclaimer', () => {
    const printout = newLoanPrintout(simulation(), true, TODAY, usd());
    expect(printout.title).toBe('Loan simulation, 11/04/2026');
    expect(printout.warnings).toEqual([]);
    expect(printout.sections.map((section) => section.title)).toEqual([
      'Summary',
      'Amortization schedule',
    ]);
    expect(printout.sections[0]!.blocks[0]).toMatchObject({
      kind: 'lines',
      lines: expect.arrayContaining([{ label: 'Monthly payment', value: '$905.42' }]),
    });
    expect(printout.disclaimer).toMatch(/^Estimates only\./);
  });

  it('writes the schedule as the panel shows it, with nothing marked', () => {
    const schedule = tableOf(
      newLoanPrintout(simulation(), true, TODAY, usd()),
      'Amortization schedule',
    );
    expect(schedule.rowHeading).toBe('#');
    expect(schedule.columns).toEqual(['Payment', 'Principal', 'Interest', 'Balance']);
    expect(schedule.rows).toHaveLength(12);
    expect(schedule.rows[0]).toEqual({
      heading: '1',
      cells: ['$905.42', '$775.42', '$130.00', '$9,224.58'],
      marked: false,
    });
    expect(schedule.rows[11]).toEqual({
      heading: '12',
      cells: ['$905.38', '$893.76', '$11.62', '$0.00'],
      marked: false,
    });
  });

  it('writes the warnings and the payments as the panel does', () => {
    const printout = newLoanPrintout(
      simulation({ method: 'german', maxRate: 15.5 }),
      false,
      TODAY,
      usd(),
    );
    expect(printout.warnings).toEqual([
      'The effective rate (16.77%) is above the segment maximum (15.5%).',
    ]);
    const summary = printout.sections[0]!.blocks[0];
    expect(summary?.kind === 'lines' && summary.lines.map((line) => line.label)).toEqual(
      expect.arrayContaining(['First payment', 'Last payment']),
    );
  });

  it('follows the language and the currency of the format it is given', () => {
    useLocale('es');
    const printout = newLoanPrintout(simulation(), true, TODAY, createFormat('es-EC', 'EUR'));
    expect(printout.title).toBe('Simulación de crédito, 04/11/2026');
    expect(tableOf(printout, 'Tabla de amortización').rows[0]!.cells[0]).toMatch(/^€\s?905,42$/);
  });
});

describe('existingLoanPrintout', () => {
  it('has how the extra payment is applied, its note, the comparison and the schedule', () => {
    const printout = existingLoanPrintout(produbancoExtraPayment(), TODAY, usd());
    expect(printout.title).toBe('Extra payment, 11/04/2026');
    const [applied, comparison, schedule] = printout.sections;
    expect(applied!.title).toBe('How the extra payment is applied');
    expect(applied!.blocks.map((block) => block.kind)).toEqual(['lines', 'note']);
    expect(comparison!.title).toBe('Without vs. with the extra payment');
    expect(comparison!.blocks.map((block) => block.kind)).toEqual(['lines', 'table']);
    expect(schedule!.title).toBe('Schedule with the extra payment');
  });

  it('writes the comparison with an empty corner and a heading per total', () => {
    const comparison = tableOf(
      existingLoanPrintout(produbancoExtraPayment(), TODAY, usd()),
      'Without vs. with the extra payment',
    );
    expect(comparison.rowHeading).toBeNull();
    expect(comparison.columns).toEqual(['Without', 'With']);
    expect(comparison.rows[0]).toEqual({ heading: 'Payments', cells: ['32', '32'], marked: false });
  });

  it('marks only the row of the payment that holds the extra payment', () => {
    const schedule = tableOf(
      existingLoanPrintout(produbancoExtraPayment(), TODAY, usd()),
      'Schedule with the extra payment',
    );
    expect(schedule.rows.filter((row) => row.marked).map((row) => row.heading)).toEqual(['1']);
  });

  it('leaves the note out when the extra payment does not cover the principal of its payment', () => {
    const [applied] = existingLoanPrintout(produbancoExtraPayment('100'), TODAY, usd()).sections;
    expect(applied!.blocks.map((block) => block.kind)).toEqual(['lines']);
  });
});

describe('restorePrintout', () => {
  const printout = () => newLoanPrintout(simulation({ maxRate: 15.5 }), true, TODAY, usd());
  const withBlock = (block: unknown) => ({
    ...printout(),
    sections: [{ title: 'Summary', blocks: [block] }],
  });
  const table = (rows: unknown, rowHeading: unknown = '#') => ({
    kind: 'table',
    rowHeading,
    columns: ['Payment'],
    rows,
  });

  it('gives back a printout as the panel wrote it', () => {
    const existing = existingLoanPrintout(produbancoExtraPayment(), TODAY, usd());
    expect(restorePrintout(structuredClone(printout()))).toEqual(printout());
    expect(restorePrintout(structuredClone(existing))).toEqual(existing);
  });

  it('is null when nothing was stored or it is not a printout', () => {
    expect(restorePrintout(undefined)).toBeNull();
    expect(restorePrintout('printout')).toBeNull();
    expect(restorePrintout({})).toBeNull();
  });

  it('is null when any part is missing or of another kind, rather than print less', () => {
    expect(restorePrintout({ ...printout(), disclaimer: 7 })).toBeNull();
    expect(restorePrintout({ ...printout(), warnings: ['ok', 3] })).toBeNull();
    expect(restorePrintout({ ...printout(), sections: [{ blocks: [] }] })).toBeNull();
    expect(restorePrintout(withBlock({ kind: 'chart' }))).toBeNull();
    expect(restorePrintout(withBlock({ kind: 'note' }))).toBeNull();
    expect(restorePrintout(withBlock({ kind: 'lines', lines: [{ label: 'Payment' }] }))).toBeNull();
    expect(restorePrintout(withBlock(table([{ heading: '1', cells: [905.42] }])))).toBeNull();
    expect(restorePrintout(withBlock(table([{ cells: ['$905.42'] }])))).toBeNull();
  });

  it('marks a row only when it was stored marked, and leaves a corner without text empty', () => {
    const restored = (block: unknown): PrintBlock | undefined =>
      restorePrintout(withBlock(block))?.sections[0]?.blocks[0];
    const rows = [
      { heading: '1', cells: ['$905.42'], marked: true },
      { heading: '2', cells: ['$905.42'], marked: 'yes' },
      { heading: '3', cells: ['$905.42'] },
    ];
    expect(restored(table(rows, 7))).toEqual({
      kind: 'table',
      rowHeading: null,
      columns: ['Payment'],
      rows: [
        { heading: '1', cells: ['$905.42'], marked: true },
        { heading: '2', cells: ['$905.42'], marked: false },
        { heading: '3', cells: ['$905.42'], marked: false },
      ],
    });
  });
});
