/** Downloads `csv` through a link to a blob, which needs no `downloads` permission. */
export function downloadCsv(fileName: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Revoked after the click is handled: revoking at once can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url));
}
