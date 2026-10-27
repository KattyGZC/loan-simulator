import type { ComponentChildren } from 'preact';
import { useId, useState } from 'preact/hooks';
import type { FieldError } from './errors';
import { visibleError } from './form';

/**
 * The error a field shows now, and the handlers that tell it the user typed in the field and
 * left it: "enter a value" waits for both (`visibleError`).
 */
function useVisibleError(error: FieldError | undefined, value: string) {
  const [edited, setEdited] = useState(false);
  const [left, setLeft] = useState(false);
  return {
    shownError: visibleError(error, value, edited && left),
    markEdited: () => setEdited(true),
    markLeft: () => setLeft(true),
  };
}

interface NumberFieldProps {
  label: string;
  value: string;
  onInput: (value: string) => void;
  inputMode: 'decimal' | 'numeric';
  error: FieldError | undefined;
  hint?: string | null;
}

/** A labelled text input for a number, with its error or hint below it. */
export function NumberField({ label, value, onInput, inputMode, error, hint }: NumberFieldProps) {
  const id = useId();
  const { shownError, markEdited, markLeft } = useVisibleError(error, value);
  const noteId = `${id}-note`;
  const note = shownError ?? hint;
  return (
    <div class="field">
      <label for={id}>{label}</label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        value={value}
        aria-invalid={shownError ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        onInput={(event) => {
          markEdited();
          onInput(event.currentTarget.value);
        }}
        onBlur={markLeft}
      />
      {note && (
        <p id={noteId} class={shownError ? 'field-error' : 'field-hint'}>
          {note}
        </p>
      )}
    </div>
  );
}

interface DateFieldProps {
  label: string;
  value: string;
  onInput: (value: string) => void;
  error: FieldError | undefined;
  hint?: string;
}

/** A labelled date input, with its error or hint below it. */
export function DateField({ label, value, onInput, error, hint }: DateFieldProps) {
  const id = useId();
  const { shownError, markEdited, markLeft } = useVisibleError(error, value);
  const noteId = `${id}-note`;
  const note = shownError ?? hint;
  return (
    <div class="field">
      <label for={id}>{label}</label>
      <input
        id={id}
        type="date"
        value={value}
        aria-invalid={shownError ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        onInput={(event) => {
          markEdited();
          onInput(event.currentTarget.value);
        }}
        onBlur={markLeft}
      />
      {note && (
        <p id={noteId} class={shownError ? 'field-error' : 'field-hint'}>
          {note}
        </p>
      )}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onInput: (value: string) => void;
  hint?: string;
}

/** A labelled text input for free text, with an optional hint below it. */
export function TextField({ label, value, onInput, hint }: TextFieldProps) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div class="field">
      <label for={id}>{label}</label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        value={value}
        aria-describedby={hint ? noteId : undefined}
        onInput={(event) => onInput(event.currentTarget.value)}
      />
      {hint && (
        <p id={noteId} class="field-hint">
          {hint}
        </p>
      )}
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  const id = useId();
  return (
    <div class="field">
      <label for={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const chosen = options.find((option) => option.value === event.currentTarget.value);
          if (chosen) onChange(chosen.value);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export function CheckboxField({ label, checked, disabled, onChange }: CheckboxFieldProps) {
  return (
    <label class="checkbox">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      {label}
    </label>
  );
}

export function FieldGroup({ legend, children }: { legend: string; children: ComponentChildren }) {
  return (
    <fieldset class="group">
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
}
