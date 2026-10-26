import { isIsoDate } from './dates';
import type { LoanInput, ValidationError, ValidationField } from './types';

export const MAX_TERM_MONTHS = 360;
// Keeps amounts in a range where cents are exact in floating point.
export const MAX_AMOUNT = 1e9;
const MAX_PERCENT = 100;

type NumberRule =
  | { kind: 'nonNegative'; max?: number }
  | { kind: 'positive'; max?: number }
  | { kind: 'wholeNumber'; min: number; max: number };

function outOfRange(field: ValidationField, min: number, max: number): ValidationError {
  return { field, code: 'outOfRange', params: { min, max } };
}

function numberError(
  field: ValidationField,
  value: number | undefined,
  rule: NumberRule,
): ValidationError | undefined {
  if (value === undefined) return { field, code: 'required' };
  if (!Number.isFinite(value)) return { field, code: 'notANumber' };
  if (rule.kind === 'wholeNumber') {
    if (!Number.isInteger(value)) return { field, code: 'mustBeInteger' };
    return value < rule.min || value > rule.max ? outOfRange(field, rule.min, rule.max) : undefined;
  }
  if (rule.kind === 'positive' && value <= 0) return { field, code: 'mustBePositive' };
  if (value < 0) return { field, code: 'mustBeNonNegative' };
  return rule.max !== undefined && value > rule.max ? outOfRange(field, 0, rule.max) : undefined;
}

function optionalNumberError(
  field: ValidationField,
  value: number | undefined,
  rule: NumberRule,
): ValidationError | undefined {
  return value === undefined ? undefined : numberError(field, value, rule);
}

const PERCENT: NumberRule = { kind: 'nonNegative', max: MAX_PERCENT };
const TERM: NumberRule = { kind: 'wholeNumber', min: 1, max: MAX_TERM_MONTHS };

/**
 * Checks the input and returns one error per invalid field, in field order. Errors carry a
 * code and parameters, not text, so the UI can show them in the user's language.
 */
export function validate(input: LoanInput): ValidationError[] {
  const termError = numberError('termMonths', input.termMonths, TERM);
  // An extra payment after the last payment has nothing left to prepay.
  const lastPrepayablePayment = input.termMonths - 1;
  const afterPayment: NumberRule = { kind: 'wholeNumber', min: 1, max: lastPrepayablePayment };

  const errors = [
    numberError('amount', input.amount, { kind: 'positive', max: MAX_AMOUNT }),
    termError,
    numberError('annualRate', input.annualRate, PERCENT),
    input.insurance ? numberError('insurance.rate', input.insurance.rate, PERCENT) : undefined,
    optionalNumberError('otherCharges', input.otherCharges, { kind: 'nonNegative' }),
    optionalNumberError('solcaPercent', input.solcaPercent, PERCENT),
    input.firstPaymentDate !== undefined && !isIsoDate(input.firstPaymentDate)
      ? { field: 'firstPaymentDate', code: 'invalidDate' }
      : undefined,
    optionalNumberError('maxRate', input.maxRate, { kind: 'positive', max: MAX_PERCENT }),
    ...(input.extraPayments ?? []).flatMap((extra, index) => [
      numberError(`extraPayments.${index}.afterPayment`, extra.afterPayment, afterPayment),
      numberError(`extraPayments.${index}.amount`, extra.amount, { kind: 'positive' }),
    ]),
  ] satisfies (ValidationError | undefined)[];
  return errors.filter((error) => error !== undefined);
}
