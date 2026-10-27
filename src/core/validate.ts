import { isIsoDate } from './dates';
import type { LoanInput, ValidationError, ValidationField } from './types';

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

function afterPaymentError(
  field: ValidationField,
  afterPayment: number,
  lastPrepayablePayment: number,
): ValidationError | undefined {
  if (lastPrepayablePayment < 1) return { field, code: 'noPaymentToPrepay' };
  return numberError(field, afterPayment, {
    kind: 'wholeNumber',
    min: 1,
    max: lastPrepayablePayment,
  });
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

/**
 * Checks the input and returns one error per invalid field, in field order. Errors carry a
 * code and parameters, not text, so the UI can show them in the user's language.
 */
export function validate(input: LoanInput): ValidationError[] {
  const termError = numberError('termMonths', input.termMonths, TERM);
  // An extra payment after the last payment has nothing left to prepay. With an invalid term,
  // check against the longest one so the term error is not repeated on every extra payment.
  const lastPrepayablePayment = (termError ? MAX_TERM_MONTHS : input.termMonths) - 1;

  const errors = [
    numberError('amount', input.amount, { kind: 'positive', max: MAX_AMOUNT }),
    termError,
    numberError('annualRate', input.annualRate, PERCENT),
    input.insurance ? numberError('insurance.rate', input.insurance.rate, PERCENT) : undefined,
    optionalNumberError('otherCharges', input.otherCharges, { kind: 'nonNegative' }),
    optionalNumberError('solcaPercent', input.solcaPercent, PERCENT),
    ...datesErrors(input),
    optionalNumberError('maxRate', input.maxRate, { kind: 'positive', max: MAX_PERCENT }),
    ...(input.extraPayments ?? []).flatMap((extra, index) => [
      afterPaymentError(
        `extraPayments.${index}.afterPayment`,
        extra.afterPayment,
        lastPrepayablePayment,
      ),
      numberError(`extraPayments.${index}.amount`, extra.amount, { kind: 'positive' }),
    ]),
  ] satisfies (ValidationError | undefined)[];
  return errors.filter((error) => error !== undefined);
}
