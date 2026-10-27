import { describe, expect, it } from 'vitest';
import { simulate } from '@/core/simulate';
import type { LoanInput } from '@/core/types';
import { validate } from '@/core/validate';

const valid: LoanInput = {
  amount: 10000,
  termMonths: 24,
  annualRate: 15.6,
  rateType: 'nominal',
  method: 'french',
};

describe('validate', () => {
  it('accepts a complete input', () => {
    expect(
      validate({
        ...valid,
        insurance: { rate: 0.884, unit: 'perMillePerMonth', base: 'balance' },
        otherCharges: 1.5,
        solcaPercent: 0.5,
        firstPaymentDate: '2026-11-22',
        maxRate: 17.3,
        extraPayments: [{ afterPayment: 6, amount: 1000, effect: 'reduceTerm' }],
      }),
    ).toEqual([]);
  });

  it.each([
    [{ amount: Number.NaN }, { field: 'amount', code: 'notANumber' }],
    [{ amount: 0 }, { field: 'amount', code: 'mustBePositive' }],
    [{ amount: 2e9 }, { field: 'amount', code: 'tooLarge', params: { max: 1e9 } }],
    [{ termMonths: 12.5 }, { field: 'termMonths', code: 'mustBeInteger' }],
    [{ termMonths: 0 }, { field: 'termMonths', code: 'outOfRange', params: { min: 1, max: 360 } }],
    [
      { termMonths: 361 },
      { field: 'termMonths', code: 'outOfRange', params: { min: 1, max: 360 } },
    ],
    [{ annualRate: -1 }, { field: 'annualRate', code: 'mustBeNonNegative' }],
    [{ annualRate: 101 }, { field: 'annualRate', code: 'tooLarge', params: { max: 100 } }],
    [{ otherCharges: -1 }, { field: 'otherCharges', code: 'mustBeNonNegative' }],
    [{ solcaPercent: -0.5 }, { field: 'solcaPercent', code: 'mustBeNonNegative' }],
    [{ solcaPercent: 150 }, { field: 'solcaPercent', code: 'tooLarge', params: { max: 100 } }],
    [{ maxRate: 0 }, { field: 'maxRate', code: 'mustBePositive' }],
    [{ maxRate: 101 }, { field: 'maxRate', code: 'tooLarge', params: { max: 100 } }],
    [{ firstPaymentDate: '2027-02-30' }, { field: 'firstPaymentDate', code: 'invalidDate' }],
  ] as const)('rejects %o', (change, error) => {
    expect(validate({ ...valid, ...change })).toEqual([error]);
  });

  it('treats a missing amount as required', () => {
    const input = { ...valid, amount: undefined } as unknown as LoanInput;
    expect(validate(input)).toEqual([{ field: 'amount', code: 'required' }]);
  });

  it('checks the insurance rate', () => {
    const insurance = { rate: -1, unit: 'percentPerYear', base: 'balance' } as const;
    expect(validate({ ...valid, insurance })).toEqual([
      { field: 'insurance.rate', code: 'mustBeNonNegative' },
    ]);
  });

  it('checks every extra payment, with its index in the field path', () => {
    const errors = validate({
      ...valid,
      extraPayments: [
        { afterPayment: 3, amount: 500, effect: 'reduceTerm' },
        { afterPayment: 24, amount: 0, effect: 'reducePayment' },
        { afterPayment: 1.5, amount: 100, effect: 'reduceTerm' },
      ],
    });
    expect(errors).toEqual([
      {
        field: 'extraPayments.1.afterPayment',
        code: 'outOfRange',
        params: { min: 1, max: 23 },
      },
      { field: 'extraPayments.1.amount', code: 'mustBePositive' },
      { field: 'extraPayments.2.afterPayment', code: 'mustBeInteger' },
    ]);
  });

  it('allows no extra payments on a single-payment loan', () => {
    const errors = validate({
      ...valid,
      termMonths: 1,
      extraPayments: [
        { afterPayment: 1, amount: 100, effect: 'reduceTerm' },
        { afterPayment: Number.NaN, amount: 100, effect: 'reduceTerm' },
      ],
    });
    expect(errors).toEqual([
      { field: 'extraPayments.0.afterPayment', code: 'noPaymentToPrepay' },
      { field: 'extraPayments.1.afterPayment', code: 'noPaymentToPrepay' },
    ]);
  });

  it('does not repeat an invalid term on every extra payment', () => {
    const errors = validate({
      ...valid,
      termMonths: 0,
      extraPayments: [{ afterPayment: 3, amount: 100, effect: 'reduceTerm' }],
    });
    expect(errors.map((error) => error.field)).toEqual(['termMonths']);
  });

  it('reports every invalid field at once', () => {
    expect(validate({ ...valid, amount: -5, termMonths: 0 }).map((e) => e.field)).toEqual([
      'amount',
      'termMonths',
    ]);
  });

  it('makes simulate return the errors instead of a schedule', () => {
    expect(simulate({ ...valid, amount: 0 })).toEqual({
      ok: false,
      errors: [{ field: 'amount', code: 'mustBePositive' }],
    });
  });
});

describe('segment maximum rate', () => {
  it('warns when the effective rate is above the maximum', () => {
    const result = simulate({ ...valid, annualRate: 16, maxRate: 17 });
    // 16 % nominal is 17.227 % effective.
    expect(result.ok && result.warnings).toEqual([
      { code: 'rateAboveMaximum', effectiveRate: expect.closeTo(17.2271, 4), maxRate: 17 },
    ]);
  });

  it('compares the effective rate, not the nominal one', () => {
    const result = simulate({ ...valid, annualRate: 16, maxRate: 17.3 });
    expect(result.ok && result.warnings).toEqual([]);
  });

  it('does not warn at exactly the maximum', () => {
    const result = simulate({ ...valid, annualRate: 17.3, rateType: 'effective', maxRate: 17.3 });
    expect(result.ok && result.warnings).toEqual([]);
  });
});
