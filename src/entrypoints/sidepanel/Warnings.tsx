import { format } from './locale';
import { warningTexts, type Warning } from './results';

/**
 * Notices about the results: a rate above the maximum, an extra payment cut, a payment off. The
 * status region stays in the page without notices, so a screen reader announces the first one.
 */
export function Warnings({ warnings }: { warnings: readonly Warning[] }) {
  return (
    <div role="status">
      {warnings.length > 0 && (
        <ul class="warnings">
          {warningTexts(warnings, format).map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
