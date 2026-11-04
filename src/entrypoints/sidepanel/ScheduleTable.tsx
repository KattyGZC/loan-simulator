import { useId } from 'preact/hooks';
import { t, type MessageKey } from '@/i18n/translate';
import { format } from './locale';
import { scheduleColumns, type ResultSchedule } from './results';

interface ScheduleTableProps {
  schedule: ResultSchedule;
  title: MessageKey;
  /** The payment that holds an extra payment, marked in the table. */
  extraPaymentNumber?: number;
}

/** One row per payment. It scrolls inside its own box, with the header and # column fixed. */
export function ScheduleTable({ schedule, title, extraPaymentNumber }: ScheduleTableProps) {
  const columns = scheduleColumns(schedule, format);
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
                  {column.label}
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
