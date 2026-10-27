import { isIsoDate } from './dates';
import type { ExistingLoanInput, LoanInput, ValidationError, ValidationField } from './types';

export const MAX_TERM_MONTHS = 360;
// Keeps amounts in a range where cents are exact in floating point.
export const MAX_AMOUNT = 1e9;
const MAX_PERCENT = 100;
// A date input passes through years such as 0020 while the user types one, which would show a
// first period centuries long for a moment; far-off years would date it past year 9999.
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

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
  return rule.max !== undefined && value > rule.max
    ? { field, code: 'tooLarge', params: { max: rule.max } }
    : undefined;
}

function optionalNumberError(
  field: ValidationField,
  value: number | undefined,
  rule: NumberRule,
): ValidationError | undefined {
  return value === undefined ? undefined : numberError(field, value, rule);
}

function isLoanDate(value: string): boolean {
  const year = Number(value.slice(0, 4));
  return isIsoDate(value) && year >= MIN_YEAR && year <= MAX_YEAR;
}

function dateError(
  field: ValidationField,
  value: string | undefined,
  required: boolean,
): ValidationError | undefined {
  if (value === undefined) return required ? { field, code: 'required' } : undefined;
  return isLoanDate(value) ? undefined : { field, code: 'invalidDate' };
}

/**
 * Actual days need both dates, and the first payment after the disbursement. Under 30/360 the
 * first payment date only labels the schedule and the disbursement date is not used.
 */
function datesErrors(input: LoanInput): (ValidationError | undefined)[] {
  if (input.dayCount !== 'actual360') {
    return [dateError('firstPaymentDate', input.firstPaymentDate, false)];
  }
  const { firstPaymentDate: firstPayment, disbursementDate: disbursement } = input;
  if (
    firstPayment === undefined ||
    disbursement === undefined ||
    !isLoanDate(firstPayment) ||
    !isLoanDate(disbursement)
  ) {
    return [
      dateError('firstPaymentDate', firstPayment, true),
      dateError('disbursementDate', disbursement, true),
    ];
  }
  // ISO dates sort in calendar order as text.
  return firstPayment > disbursement
    ? []
    : [{ field: 'firstPaymentDate', code: 'notAfterDisbursement' }];
}

const PERCENT: NumberRule = { kind: 'nonNegative', max: MAX_PERCENT };
const TERM: NumberRule = { kind: 'wholeNumber', min: 1, max: MAX_TERM_MONTHS };
const AMOUNT: NumberRule = { kind: 'positive', max: MAX_AMOUNT };

/**
 * Checks the input and returns one error per invalid field, in field order. Errors carry a
 * code and parameters, not text, so the UI can show them in the user's language.
 */
export function validate(input: LoanInput): ValidationError[] {
  const errors = [
    numberError('amount', input.amount, AMOUNT),
    numberError('termMonths', input.termMonths, TERM),
    numberError('annualRate', input.annualRate, PERCENT),
    input.insurance ? numberError('insurance.rate', input.insurance.rate, PERCENT) : undefined,
    optionalNumberError('otherCharges', input.otherCharges, { kind: 'nonNegative' }),
    optionalNumberError('solcaPercent', input.solcaPercent, PERCENT),
    ...datesErrors(input),
    optionalNumberError('maxRate', input.maxRate, { kind: 'positive', max: MAX_PERCENT }),
  ] satisfies (ValidationError | undefined)[];
  return errors.filter((error) => error !== undefined);
}

/**
 * Checks each field of a loan already running on its own, like `validate()`. Whether the
 * current payment repays anything and the extra payment falls inside the loan depend on the
 * schedule, so `simulateExistingLoan()` checks them after this.
 */
export function validateExistingLoan(input: ExistingLoanInput): ValidationError[] {
  const errors = [
    numberError('balance', input.balance, AMOUNT),
    numberError('remainingPayments', input.remainingPayments, TERM),
    numberError('annualRate', input.annualRate, PERCENT),
    input.method === 'french'
      ? numberError('currentPayment', input.currentPayment, AMOUNT)
      : undefined,
    dateError('nextPaymentDate', input.nextPaymentDate, true),
    input.insurance ? numberError('insurance.rate', input.insurance.rate, PERCENT) : undefined,
    optionalNumberError('otherCharges', input.otherCharges, { kind: 'nonNegative' }),
    dateError('extraPayment.date', input.extraPayment.date, true),
    numberError('extraPayment.amount', input.extraPayment.amount, AMOUNT),
  ] satisfies (ValidationError | undefined)[];
  return errors.filter((error) => error !== undefined);
}
