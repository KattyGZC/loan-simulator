import { createFileFormat, type CurrencyCode, type DecimalSign, type Format } from '@/i18n/format';
import { t, type MessageKey } from '@/i18n/translate';
import type { ExistingLoanSimulation } from './existing-form';
import type { Simulation } from './form';
import type { Preferences } from './preferences';
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
  type Warning,
} from './results';

/** What separates the fields of a CSV line: `;` where `,` is the decimal sign. */
export type CsvSeparator = ',' | ';';

/** What a file takes from the preferences: the currency, and the spreadsheet's decimal sign. */
export type CsvSettings = Pick<Preferences, 'currency' | 'fileDecimalSign'>;

type CsvTable = readonly (readonly string[])[];

// Excel opens a UTF-8 file without it as the system code page, which breaks accents.
const BYTE_ORDER_MARK = '\uFEFF';
const LINE_BREAK = '\r\n';

/** The field separator a spreadsheet expects with `decimalSign`: `;` with a comma, else `,`. */
export function csvSeparator(decimalSign: DecimalSign): CsvSeparator {
  return decimalSign === 'comma' ? ';' : ',';
}

/**
 * A field as RFC 4180 writes it: in double quotes, doubled inside, when it holds the separator,
 * a quote or a line break.
 */
function csvField(text: string, separator: CsvSeparator): string {
  const needsQuotes = text.includes(separator) || /["\r\n]/.test(text);
  return needsQuotes ? `"${text.replaceAll('"', '""')}"` : text;
}

/** The file's text: a byte order mark, then one line per row. */
function csvText(table: CsvTable, separator: CsvSeparator): string {
  const lines = table.map((row) => row.map((field) => csvField(field, separator)).join(separator));
  return BYTE_ORDER_MARK + lines.join(LINE_BREAK) + LINE_BREAK;
}

/** The currency, then the warnings the panel shows, one per row, and a blank row. */
function heading(currency: CurrencyCode, warnings: readonly Warning[], format: Format): string[][] {
  const warningRows = warningTexts(warnings, format).map((text) => [text]);
  return [[t('field_currency'), currency], ...warningRows, []];
}

function section(title: MessageKey, lines: readonly Line[]): string[][] {
  return [[t(title)], ...lines.map(({ label, value }) => [label, value])];
}

function scheduleSection(title: MessageKey, schedule: ResultSchedule, format: Format): string[][] {
  const columns = scheduleColumns(schedule, format);
  return [
    [t(title)],
    [t('column_number'), ...columns.map((column) => column.label)],
    ...schedule.rows.map((row) => [
      String(row.number),
      ...columns.map((column) => column.cell(row)),
    ]),
  ];
}

/**
 * A new loan as a CSV file: its currency and warnings, the summary the panel shows, the
 * schedule and the disclaimer, each part after a blank line.
 */
export function newLoanCsv(
  { schedule, warnings }: Simulation,
  fixedPayment: boolean,
  { currency, fileDecimalSign }: CsvSettings,
): string {
  const format = createFileFormat(fileDecimalSign);
  const summary = summaryLines(schedule.summary, fixedPayment, format);
  return csvText(
    [
      ...heading(currency, warnings, format),
      ...section('section_summary', summary),
      [],
      ...scheduleSection('section_schedule', schedule, format),
      [],
      [t('disclaimer')],
    ],
    csvSeparator(fileDecimalSign),
  );
}

/**
 * An extra payment on a loan already running as a CSV file: its currency and warnings, how the
 * extra payment is applied, what it saves and the rest of the loan without and with it, the
 * schedule with it and the disclaimer, each part after a blank line.
 */
export function existingLoanCsv(
  simulation: ExistingLoanSimulation,
  { currency, fileDecimalSign }: CsvSettings,
): string {
  const format = createFileFormat(fileDecimalSign);
  const note = appliedExtraPaymentNote(simulation, format);
  const comparison = comparisonLines(simulation, format).map((line) => [
    line.label,
    line.without,
    line.with,
  ]);
  return csvText(
    [
      ...heading(currency, simulation.warnings, format),
      ...section('section_appliedExtraPayment', appliedExtraPaymentLines(simulation, format)),
      ...(note === null ? [] : [[note]]),
      [],
      ...section('section_comparison', savingsLines(simulation, format)),
      ['', t('column_without'), t('column_with')],
      ...comparison,
      [],
      ...scheduleSection('section_scheduleWithExtraPayment', simulation.withExtraPayment, format),
      [],
      [t('disclaimer')],
    ],
    csvSeparator(fileDecimalSign),
  );
}
