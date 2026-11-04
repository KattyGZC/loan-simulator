import type { Format } from '@/i18n/format';
import { t, type MessageKey } from '@/i18n/translate';
import { storedRecord } from '@/storage/stored-fields';
import type { ExistingLoanSimulation } from './existing-form';
import type { Simulation } from './form';
import {
  appliedExtraPaymentLines,
  appliedExtraPaymentNote,
  comparisonLines,
  savingsLines,
  scheduleColumns,
  summaryLines,
  warningTexts,
  type Line,
  type ResultSchedule,
} from './results';

/** A row of a printed table: what heads it (a payment number or a total's name) and its cells. */
export interface PrintRow {
  heading: string;
  cells: string[];
  /** The payment that holds an extra payment, marked on paper. */
  marked: boolean;
}

/** A part of a printed section. */
export type PrintBlock =
  | { kind: 'lines'; lines: Line[] }
  | { kind: 'note'; text: string }
  | {
      kind: 'table';
      /** The header above the rows' headings; null leaves that corner empty. */
      rowHeading: string | null;
      columns: string[];
      rows: PrintRow[];
    };

export interface PrintSection {
  title: string;
  blocks: PrintBlock[];
}

/** What a simulator tab shows, already written out, for the print page to lay out on paper. */
export interface Printout {
  title: string;
  warnings: string[];
  sections: PrintSection[];
  disclaimer: string;
}

function linesSection(title: MessageKey, lines: Line[]): PrintSection {
  return { title: t(title), blocks: [{ kind: 'lines', lines }] };
}

function scheduleSection(
  title: MessageKey,
  schedule: ResultSchedule,
  format: Format,
  extraPaymentNumber?: number,
): PrintSection {
  const columns = scheduleColumns(schedule, format);
  return {
    title: t(title),
    blocks: [
      {
        kind: 'table',
        rowHeading: t('column_number'),
        columns: columns.map((column) => column.label),
        rows: schedule.rows.map((row) => ({
          heading: String(row.number),
          cells: columns.map((column) => column.cell(row)),
          marked: row.number === extraPaymentNumber,
        })),
      },
    ],
  };
}

/** A new loan on paper: its warnings, the summary and the schedule, under today's date. */
export function newLoanPrintout(
  { schedule, warnings }: Simulation,
  fixedPayment: boolean,
  today: string,
  format: Format,
): Printout {
  return {
    title: t('print_newLoanTitle', [format.date(today)]),
    warnings: warningTexts(warnings, format),
    sections: [
      linesSection('section_summary', summaryLines(schedule.summary, fixedPayment, format)),
      scheduleSection('section_schedule', schedule, format),
    ],
    disclaimer: t('disclaimer'),
  };
}

/**
 * An extra payment on paper: its warnings, how it is applied, what it saves and the rest of the
 * loan without and with it, and the schedule with it, under today's date.
 */
export function existingLoanPrintout(
  simulation: ExistingLoanSimulation,
  today: string,
  format: Format,
): Printout {
  const note = appliedExtraPaymentNote(simulation, format);
  const applied: PrintBlock[] = [
    { kind: 'lines', lines: appliedExtraPaymentLines(simulation, format) },
  ];
  return {
    title: t('print_existingLoanTitle', [format.date(today)]),
    warnings: warningTexts(simulation.warnings, format),
    sections: [
      {
        title: t('section_appliedExtraPayment'),
        blocks: note === null ? applied : [...applied, { kind: 'note', text: note }],
      },
      {
        title: t('section_comparison'),
        blocks: [
          { kind: 'lines', lines: savingsLines(simulation, format) },
          {
            kind: 'table',
            rowHeading: null,
            columns: [t('column_without'), t('column_with')],
            rows: comparisonLines(simulation, format).map((line) => ({
              heading: line.label,
              cells: [line.without, line.with],
              marked: false,
            })),
          },
        ],
      },
      scheduleSection(
        'section_scheduleWithExtraPayment',
        simulation.withExtraPayment,
        format,
        simulation.extraPayment.paymentNumber,
      ),
    ],
    disclaimer: t('disclaimer'),
  };
}

function restoreText(stored: unknown): string | null {
  return typeof stored === 'string' ? stored : null;
}

/** Every item of a stored list, or null when it is not a list or any item cannot be restored. */
function restoreList<T>(stored: unknown, restoreItem: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(stored)) return null;
  const items: readonly unknown[] = stored;
  const restored = items.map(restoreItem);
  return restored.every((item): item is T => item !== null) ? restored : null;
}

function restoreLine(stored: unknown): Line | null {
  const fields = storedRecord(stored);
  const label = restoreText(fields.get('label'));
  const value = restoreText(fields.get('value'));
  return label === null || value === null ? null : { label, value };
}

function restoreRow(stored: unknown): PrintRow | null {
  const fields = storedRecord(stored);
  const heading = restoreText(fields.get('heading'));
  const cells = restoreList(fields.get('cells'), restoreText);
  if (heading === null || cells === null) return null;
  return { heading, cells, marked: fields.get('marked') === true };
}

function restoreBlock(stored: unknown): PrintBlock | null {
  const fields = storedRecord(stored);
  switch (fields.get('kind')) {
    case 'lines': {
      const lines = restoreList(fields.get('lines'), restoreLine);
      return lines === null ? null : { kind: 'lines', lines };
    }
    case 'note': {
      const text = restoreText(fields.get('text'));
      return text === null ? null : { kind: 'note', text };
    }
    case 'table': {
      const columns = restoreList(fields.get('columns'), restoreText);
      const rows = restoreList(fields.get('rows'), restoreRow);
      if (columns === null || rows === null) return null;
      return { kind: 'table', rowHeading: restoreText(fields.get('rowHeading')), columns, rows };
    }
    default:
      return null;
  }
}

function restoreSection(stored: unknown): PrintSection | null {
  const fields = storedRecord(stored);
  const title = restoreText(fields.get('title'));
  const blocks = restoreList(fields.get('blocks'), restoreBlock);
  return title === null || blocks === null ? null : { title, blocks };
}

/**
 * The printout the panel stored, or null when there is none or any part of it is not what the
 * panel writes: a printout with a part missing would put on paper less than the panel showed.
 */
export function restorePrintout(stored: unknown): Printout | null {
  const fields = storedRecord(stored);
  const title = restoreText(fields.get('title'));
  const warnings = restoreList(fields.get('warnings'), restoreText);
  const sections = restoreList(fields.get('sections'), restoreSection);
  const disclaimer = restoreText(fields.get('disclaimer'));
  if (title === null || warnings === null || sections === null || disclaimer === null) return null;
  return { title, warnings, sections, disclaimer };
}
