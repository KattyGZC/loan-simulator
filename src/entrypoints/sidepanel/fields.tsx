import type { ComponentChildren } from 'preact';
import { useId, useState } from 'preact/hooks';
import type { FieldError } from './errors';

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
  const [left, setLeft] = useState(false);
  const shownError = error?.required && !left ? undefined : error?.message;
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
        onInput={(event) => onInput(event.currentTarget.value)}
        onBlur={() => setLeft(true)}
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
}

export function DateField({ label, value, onInput, error }: DateFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div class="field">
      <label for={id}>{label}</label>
      <input
        id={id}
        type="date"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onInput={(event) => onInput(event.currentTarget.value)}
      />
      {error && (
        <p id={errorId} class="field-error">
          {error.message}
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
  onChange: (checked: boolean) => void;
}

export function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label class="checkbox">
      <input
        type="checkbox"
        checked={checked}
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
