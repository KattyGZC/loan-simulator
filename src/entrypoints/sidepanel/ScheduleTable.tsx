import { useId } from 'preact/hooks';
import type { PaymentsSummary, ScheduleRow } from '@/core';
import { t, type MessageKey } from '@/i18n/translate';
import { format } from './locale';

interface Column {
  label: MessageKey;
  cell: (row: ScheduleRow) => string;
}

function moneyColumn(label: MessageKey, amount: (row: ScheduleRow) => number): Column {
  return { label, cell: (row) => format.money(amount(row)) };
}

function shownIf(shown: boolean, column: Column): Column[] {
  return shown ? [column] : [];
}

const dateColumn: Column = {
  label: 'column_date',
  cell: (row) => (row.date ? format.date(row.date) : ''),
};

interface TableSchedule {
  rows: readonly ScheduleRow[];
  summary: PaymentsSummary;
}

/** The columns this schedule needs: date, insurance and other charges only if it has them. */
function columnsFor({ rows, summary }: TableSchedule): Column[] {
  return [
    ...shownIf(rows[0]?.date != null, dateColumn),
    moneyColumn('column_payment', (row) => row.payment),
    moneyColumn('column_principal', (row) => row.principal),
    moneyColumn('column_interest', (row) => row.interest),
    ...shownIf(
      summary.totalInsurance > 0,
      moneyColumn('column_insurance', (row) => row.insurance),
    ),
    ...shownIf(
      summary.totalOtherCharges > 0,
      moneyColumn('column_otherCharges', (row) => row.otherCharges),
    ),
    moneyColumn('column_balance', (row) => row.balance),
  ];
}

interface ScheduleTableProps {
  schedule: TableSchedule;
  title: MessageKey;
  /** The payment that holds an extra payment, marked in the table. */
  extraPaymentNumber?: number;
}

/** One row per payment. It scrolls inside its own box, with the header and # column fixed. */
export function ScheduleTable({ schedule, title, extraPaymentNumber }: ScheduleTableProps) {
  const columns = columnsFor(schedule);
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId}>{t(title)}</h2>
      {/* Focusable so keyboard users can scroll the table sideways. */}
      <div class="table-scroll" role="region" tabIndex={0} aria-labelledby={titleId}>
        <table class="schedule">
          <thead>
            <tr>
              <th scope="col">{t('column_number')}</th>
              {columns.map((column) => (
                <th key={column.label} scope="col">
                  {t(column.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.rows.map((row) => (
              <tr
                key={row.number}
                class={row.number === extraPaymentNumber ? 'extra-payment' : undefined}
              >
                <th scope="row">{row.number}</th>
                {columns.map((column) => (
                  <td key={column.label}>{column.cell(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
