import type { ComponentChildren } from 'preact';

/** Line icons drawn in the text's color, beside a button's label; the label names the button. */
function Icon({ children }: { children: ComponentChildren }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentcolor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** An arrow pointing left: back to the tabs. */
export function BackIcon() {
  return (
    <Icon>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Icon>
  );
}

/** An open book: the glossary. */
export function BookIcon() {
  return (
    <Icon>
      <path d="M12 6.5C10.5 5.3 8.3 4.8 4 5v13c4.3-.2 6.5.3 8 1.5 1.5-1.2 3.7-1.7 8-1.5V5c-4.3-.2-6.5.3-8 1.5z" />
      <path d="M12 6.5v13" />
    </Icon>
  );
}

/** Two sliders: the preferences. */
export function SlidersIcon() {
  return (
    <Icon>
      <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
      <circle cx="15" cy="8" r="2" />
      <circle cx="9" cy="16" r="2" />
    </Icon>
  );
}

/** An arrow turning back: start over. */
export function ResetIcon() {
  return (
    <Icon>
      <path d="M5 12a7 7 0 1 0 2.1-5" />
      <path d="M5 4v4h4" />
    </Icon>
  );
}
