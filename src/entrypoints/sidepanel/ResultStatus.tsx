/**
 * What a screen reader announces when the results change. Hidden, since the same text is on
 * screen, and always in the page, so the first result is announced too.
 */
export function ResultStatus({ text }: { text: string }) {
  return (
    <p class="visually-hidden" role="status">
      {text}
    </p>
  );
}
