import { t } from '@/i18n/translate';

interface ExportCsvProps {
  fileName: string;
  /** The file's text, built only when the user asks for it. */
  csv: () => string;
}

/** Downloads `csv` through a link to a blob, which needs no `downloads` permission. */
function download(fileName: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoked after the click is handled: revoking at once can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url));
}

/** The button that saves the results on screen as a CSV file. */
export function ExportCsv({ fileName, csv }: ExportCsvProps) {
  return (
    <div class="actions">
      <button type="button" class="button" onClick={() => download(fileName, csv())}>
        {t('button_exportCsv')}
      </button>
    </div>
  );
}
