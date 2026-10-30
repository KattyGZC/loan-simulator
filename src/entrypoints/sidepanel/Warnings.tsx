import { format } from './locale';
import { warningTexts, type Warning } from './results';

/** Notices about the results: a rate above the maximum, an extra payment cut, a payment off. */
export function Warnings({ warnings }: { warnings: readonly Warning[] }) {
  if (warnings.length === 0) return null;
  return (
    <div role="status">
      <ul class="warnings">
        {warningTexts(warnings, format).map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </div>
  );
}
