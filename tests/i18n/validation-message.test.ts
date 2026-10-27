import { describe, expect, it } from 'vitest';
import { simulate, type ValidationCode, type ValidationError } from '@/core';
import { createFormat } from '@/i18n/format';
import { validationMessage } from '@/i18n/validation-message';
import { useLocale } from './fake-i18n';

const errorsOf = (input: Parameters<typeof simulate>[0]): ValidationError[] => {
  const result = simulate(input);
  if (result.ok) throw new Error('Expected validation errors');
  return result.errors;
};

describe('validationMessage', () => {
  it('fills the maximum of tooLarge with grouped numbers', () => {
    useLocale('es');
    const [error] = errorsOf({
      amount: 2e9,
      termMonths: 12,
      annualRate: 12,
      rateType: 'nominal',
      method: 'french',
    });
    expect(validationMessage(error!, createFormat('es-EC'))).toBe(
      'Ingresa como máximo 1.000.000.000.',
    );
  });

  it('has a message for every validation code', () => {
    useLocale('en');
    const format = createFormat('en-US');
    const oneErrorPerCode = {
      required: { field: 'amount', code: 'required' },
      notANumber: { field: 'amount', code: 'notANumber' },
      mustBeInteger: { field: 'termMonths', code: 'mustBeInteger' },
      mustBePositive: { field: 'amount', code: 'mustBePositive' },
      mustBeNonNegative: { field: 'otherCharges', code: 'mustBeNonNegative' },
      outOfRange: { field: 'termMonths', code: 'outOfRange', params: { min: 1, max: 360 } },
      tooLarge: { field: 'amount', code: 'tooLarge', params: { max: 1e9 } },
      noPaymentToPrepay: { field: 'extraPayments.0.afterPayment', code: 'noPaymentToPrepay' },
      invalidDate: { field: 'firstPaymentDate', code: 'invalidDate' },
    } satisfies Record<ValidationCode, ValidationError>;
    const errors = Object.values(oneErrorPerCode);
    expect(errors.map((error) => validationMessage(error, format))).toEqual([
      'Enter a value.',
      'Enter a number.',
      'Enter a whole number.',
      'Enter a value greater than 0.',
      'Enter 0 or more.',
      'Enter a value from 1 to 360.',
      'Enter at most 1,000,000,000.',
      'A loan with a single payment has no payment to prepay.',
      'Enter a valid date.',
    ]);
  });
});
