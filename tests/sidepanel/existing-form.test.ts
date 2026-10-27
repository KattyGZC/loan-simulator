import { describe, expect, it } from 'vitest';
import type { ExistingLoanResult } from '@/core';
import {
  defaultExistingLoanForm,
  existingLoanState,
  simulateExistingLoanForm,
  type ExistingLoanForm,
} from '@/entrypoints/sidepanel/existing-form';
import { fieldReader, readInsurance } from '@/entrypoints/sidepanel/form';

const TODAY = '2025-11-24';

/** The Produbanco loan after payment 4, with the $2,700 extra payment made today. */
function filledForm(overrides: Partial<ExistingLoanForm> = {}): ExistingLoanForm {
  return {
    ...defaultExistingLoanForm(TODAY),
    balance: '5843.78',
    remainingPayments: '32',
    annualRate: '15.6',
    method: 'german',
    nextPaymentDate: '2025-12-17',
    dayCount: 'actual360',
    extraPaymentAmount: '2700',
    extraPaymentEffect: 'reducePayment',
    ...overrides,
  };
}

function okResult(result: ExistingLoanResult) {
  if (!result.ok) throw new Error(`Expected a result, got ${JSON.stringify(result.errors)}`);
  return result;
}

describe('defaultExistingLoanForm', () => {
  it('starts with a French loan on 30/360 and an extra payment today that shortens it', () => {
    expect(defaultExistingLoanForm(TODAY)).toMatchObject({
      method: 'french',
      rateType: 'nominal',
      dayCount: 'thirty360',
      nextPaymentDate: '',
      extraPaymentDate: TODAY,
      extraPaymentEffect: 'reduceTerm',
    });
  });
});

describe('simulateExistingLoanForm', () => {
  it('applies the extra payment the way the lender did', () => {
    const { extraPayment } = okResult(simulateExistingLoanForm(filledForm(), 'en-US'));
    expect(extraPayment).toMatchObject({ accruedInterest: 17.71, principal: 2682.29 });
  });

  it('reads numbers with the locale separators', () => {
    const form = filledForm({
      balance: '5.843,78',
      annualRate: '15,6',
      extraPaymentAmount: '2.700',
    });
    const { extraPayment } = okResult(simulateExistingLoanForm(form, 'es-EC'));
    expect(extraPayment.principal).toBe(2682.29);
  });

  it('asks for the current payment under the French method only', () => {
    const french = simulateExistingLoanForm(filledForm({ method: 'french' }), 'en-US');
    expect(french).toEqual({
      ok: false,
      errors: [{ field: 'currentPayment', code: 'required' }],
    });
    const german = filledForm({ currentPayment: 'not read' });
    expect(simulateExistingLoanForm(german, 'en-US').ok).toBe(true);
  });

  it('reports an empty date as required, not invalid', () => {
    const result = simulateExistingLoanForm(filledForm({ nextPaymentDate: '' }), 'en-US');
    expect(result).toEqual({ ok: false, errors: [{ field: 'nextPaymentDate', code: 'required' }] });
  });

  it('adds the insurance only with a rate, and on top of the payment only under French', () => {
    const noInsurance = okResult(simulateExistingLoanForm(filledForm(), 'en-US'));
    expect(noInsurance.withExtraPayment.summary.totalInsurance).toBe(0);

    const form = filledForm({ insuranceRate: '1.2', onTopOfInstallment: true });
    const insured = okResult(simulateExistingLoanForm(form, 'en-US'));
    expect(insured.withExtraPayment.rows[0]?.insurance).toBe(5.84);
    const german = { ...form, method: 'german' } as const;
    expect(readInsurance(german, fieldReader('en-US'))).toEqual({
      rate: 1.2,
      unit: 'percentPerYear',
      onTopOfInstallment: false,
    });
  });
});

describe('existingLoanState', () => {
  it('is incomplete while a field the results need is empty', () => {
    const state = existingLoanState(defaultExistingLoanForm(TODAY), 'en-US');
    expect(state.kind).toBe('loanIncomplete');
  });

  it('is invalid when every field has a value but one is wrong', () => {
    const state = existingLoanState(filledForm({ extraPaymentAmount: '10' }), 'en-US');
    expect(state).toEqual({
      kind: 'invalid',
      errors: [{ field: 'extraPayment.amount', code: 'tooSmall', params: { min: 17.71 } }],
    });
  });

  it('simulates a complete form', () => {
    expect(existingLoanState(filledForm(), 'en-US').kind).toBe('simulated');
  });
});
