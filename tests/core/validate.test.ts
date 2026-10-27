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
  it('needs no dates under 30/360, and ignores the disbursement date there', () => {
    expect(validate({ ...valid, dayCount: 'thirty360', disbursementDate: 'not a date' })).toEqual(
      [],
    );
  });

  it('reports both missing dates under actual days', () => {
    expect(validate({ ...valid, dayCount: 'actual360' })).toEqual([
      { field: 'firstPaymentDate', code: 'required' },
      { field: 'disbursementDate', code: 'required' },
    ]);
  });

  it('accepts a complete input', () => {
    expect(
      validate({
        ...valid,
        insurance: { rate: 0.884, unit: 'perMillePerMonth', base: 'balance' },
        otherCharges: 1.5,
        solcaPercent: 0.5,
        firstPaymentDate: '2026-11-22',
        maxRate: 17.3,
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
    [{ firstPaymentDate: '0020-01-04' }, { field: 'firstPaymentDate', code: 'invalidDate' }],
    [{ firstPaymentDate: '2101-01-01' }, { field: 'firstPaymentDate', code: 'invalidDate' }],
    [
      { dayCount: 'actual360', firstPaymentDate: '2026-11-27', disbursementDate: '0202-10-27' },
      { field: 'disbursementDate', code: 'invalidDate' },
    ],
    [
      { dayCount: 'actual360', disbursementDate: '2026-10-27' },
      { field: 'firstPaymentDate', code: 'required' },
    ],
    [
      { dayCount: 'actual360', firstPaymentDate: '2026-11-27' },
      { field: 'disbursementDate', code: 'required' },
    ],
    [
      { dayCount: 'actual360', firstPaymentDate: '2026-11-27', disbursementDate: '2026-13-01' },
      { field: 'disbursementDate', code: 'invalidDate' },
    ],
    [
      { dayCount: 'actual360', firstPaymentDate: '2026-10-27', disbursementDate: '2026-10-27' },
      { field: 'firstPaymentDate', code: 'notAfterDisbursement' },
    ],
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
