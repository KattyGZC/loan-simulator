import type { ValidationError } from '@/core';
import type { Format } from './format';
import { t, type MessageKey } from './translate';

/** The text to show next to the field `error` belongs to, in the browser's language. */
export function validationMessage(error: ValidationError, format: Format): string {
  const key: MessageKey = `validation_${error.code}`;
  if (error.code !== 'outOfRange') return t(key);
  return t(key, [format.integer(error.params.min), format.integer(error.params.max)]);
}
