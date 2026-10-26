import { isIsoDate } from './dates';
import type { LoanInput, ValidationError } from './types';

export const MAX_TERM_MONTHS = 360;
// Keeps amounts in a range where cents are exact in floating point.
export const MAX_AMOUNT = 1e9;
const MAX_PERCENT = 100;

interface NumberRule {
  /** Zero is not allowed. */
  positive?: boolean;
  integer?: boolean;
  /** Range checked only when `max` is set; `min` defaults to 0. */
  min?: number;
  max?: number;
}

function checkNumber(
  errors: ValidationError[],
  field: string,
  value: number | undefined,
  rule: NumberRule,
): void {
  if (value === undefined) {
    errors.push({ field, code: 'required' });
  } else if (!Number.isFinite(value)) {
    errors.push({ field, code: 'notANumber' });
  } else if (rule.integer && !Number.isInteger(value)) {
    errors.push({ field, code: 'mustBeInteger' });
  } else if (rule.min === undefined && rule.positive && value <= 0) {
    errors.push({ field, code: 'mustBePositive' });
  } else if (rule.min === undefined && value < 0) {
    errors.push({ field, code: 'mustBeNonNegative' });
  } else if (rule.max !== undefined && (value < (rule.min ?? 0) || value > rule.max)) {
    errors.push({ field, code: 'outOfRange', params: { min: rule.min ?? 0, max: rule.max } });
  }
}

/**
 * Checks the input and returns one error per invalid field, in field order. Errors carry a
 * code and parameters, not text, so the UI can show them in the user's language.
 */
export function validate(input: LoanInput): ValidationError[] {
  const errors: ValidationError[] = [];
  checkNumber(errors, 'amount', input.amount, { positive: true, max: MAX_AMOUNT });
  checkNumber(errors, 'termMonths', input.termMonths, {
    integer: true,
    min: 1,
    max: MAX_TERM_MONTHS,
  });
  checkNumber(errors, 'annualRate', input.annualRate, { max: MAX_PERCENT });
  if (input.insurance) {
    checkNumber(errors, 'insurance.rate', input.insurance.rate, { max: MAX_PERCENT });
  }
  if (input.otherCharges !== undefined) {
    checkNumber(errors, 'otherCharges', input.otherCharges, {});
  }
  if (input.solcaPercent !== undefined) {
    checkNumber(errors, 'solcaPercent', input.solcaPercent, { max: MAX_PERCENT });
  }
  if (input.firstPaymentDate !== undefined && !isIsoDate(input.firstPaymentDate)) {
    errors.push({ field: 'firstPaymentDate', code: 'invalidDate' });
  }
  if (input.maxRate !== undefined) {
    checkNumber(errors, 'maxRate', input.maxRate, { positive: true, max: MAX_PERCENT });
  }
  input.extraPayments?.forEach((extra, index) => {
    // An extra payment after the last payment has nothing left to prepay.
    checkNumber(errors, `extraPayments.${index}.afterPayment`, extra.afterPayment, {
      integer: true,
      min: 1,
      max: input.termMonths - 1,
    });
    checkNumber(errors, `extraPayments.${index}.amount`, extra.amount, { positive: true });
  });
  return errors;
}
