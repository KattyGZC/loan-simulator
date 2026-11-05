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
      {/* Focusable so keyboard users can scroll the table sideways; a group, since the section is already the landmark. */}
      <div class="table-scroll" role="group" tabIndex={0} aria-labelledby={titleId}>
        <table class="schedule" aria-labelledby={titleId}>
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
            {schedule.rows.map((row) => {
              const holdsExtraPayment = row.number === extraPaymentNumber;
              return (
                <tr key={row.number} class={holdsExtraPayment ? 'extra-payment' : undefined}>
                  <th scope="row">
                    {row.number}
                    {holdsExtraPayment && (
                      <span class="visually-hidden"> {t('row_extraPaymentMarker')}</span>
                    )}
                  </th>
                  {columns.map((column) => (
                    <td key={column.label}>{column.cell(row)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
