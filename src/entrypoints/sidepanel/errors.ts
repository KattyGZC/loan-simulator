import type { ValidationError, ValidationField } from '@/core';
import { validationMessage } from '@/i18n/validation-message';
import { format } from './locale';

/** The error a field shows, as text in the browser's language. */
export interface FieldError {
  message: string;
  /** The field is only empty: the message waits until the user leaves it. */
  required: boolean;
}

/** Looks up the error of each field in `errors`, or undefined when the field is valid. */
export function fieldErrors(
  errors: readonly ValidationError[],
): (field: ValidationField) => FieldError | undefined {
  return (field) => {
    const error = errors.find((candidate) => candidate.field === field);
    return (
      error && { message: validationMessage(error, format), required: error.code === 'required' }
    );
  };
}
