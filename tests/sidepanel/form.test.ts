import { describe, expect, it } from 'vitest';
import { roundMoney, type SimulationResult } from '@/core';
import {
  counterpartRate,
  defaultForm,
  errorsOf,
  hasFixedPayment,
  panelState,
  simulateForm,
  visibleError,
  type LoanForm,
} from '@/entrypoints/sidepanel/form';

const TODAY = '2026-10-27';

function filledForm(overrides: Partial<LoanForm> = {}): LoanForm {
  return {
    ...defaultForm(TODAY, 'en-US'),
    amount: '10000',
    termMonths: '12',
    annualRate: '15.6',
    ...overrides,
  };
}

function okResult(result: SimulationResult) {
  if (!result.ok) throw new Error(`Expected a schedule, got ${JSON.stringify(result.errors)}`);
  return result;
}

function validationErrors(result: SimulationResult) {
  if (result.ok) throw new Error('Expected validation errors');
  return result.errors;
}

describe('defaultForm', () => {
  it('starts at 30/360, paid out today', () => {
    expect(defaultForm(TODAY, 'en-US')).toMatchObject({
      dayCount: 'thirty360',
      disbursementDate: TODAY,
    });
  });

  it('turns SOLCA on at 0.5 % written with the locale decimal separator', () => {
    expect(defaultForm(TODAY, 'en-US')).toMatchObject({ solcaEnabled: true, solcaPercent: '0.5' });
    expect(defaultForm(TODAY, 'es-EC').solcaPercent).toBe('0,5');
  });

  it('sets the first payment one month after today', () => {
    expect(defaultForm(TODAY, 'en-US').firstPaymentDate).toBe('2026-11-27');
  });

  it('falls on the last day of a shorter month', () => {
    expect(defaultForm('2027-01-31', 'en-US').firstPaymentDate).toBe('2027-02-28');
  });

  it('starts with the French method at a nominal rate', () => {
    expect(defaultForm(TODAY, 'en-US')).toMatchObject({
      method: 'french',
      rateType: 'nominal',
    });
  });
});

describe('simulateForm', () => {
  it('reports every empty required field as required', () => {
    expect(validationErrors(simulateForm(defaultForm(TODAY, 'en-US'), 'en-US'))).toEqual([
      { field: 'amount', code: 'required' },
      { field: 'termMonths', code: 'required' },
      { field: 'annualRate', code: 'required' },
    ]);
  });

  it('keeps checking the other fields while one is empty', () => {
    expect(
      validationErrors(simulateForm(filledForm({ amount: '', termMonths: 'abc' }), 'en-US')),
    ).toEqual([
      { field: 'amount', code: 'required' },
      { field: 'termMonths', code: 'notANumber' },
    ]);
  });

  it('reads numbers with the locale separators', () => {
    const form = filledForm({ amount: '10.000', annualRate: '15,6' });
    const { base } = okResult(simulateForm(form, 'es-EC'));
    expect(base.summary).toMatchObject({ paymentCount: 12, nominalRate: 15.6, solca: 50 });
  });

  it('deducts SOLCA only while it is on', () => {
    const off = okResult(simulateForm(filledForm({ solcaEnabled: false }), 'en-US'));
    expect(off.base.summary).toMatchObject({ solca: 0, amountReceived: 10000 });
  });

  it('has no insurance while its rate is empty, whatever its unit and base', () => {
    const form = filledForm({ insuranceUnit: 'perMillePerMonth', insuranceBase: 'originalAmount' });
    expect(okResult(simulateForm(form, 'en-US')).base.summary.totalInsurance).toBe(0);
  });

  it('adds insurance once its rate is entered', () => {
    const form = filledForm({ insuranceRate: '1' });
    expect(okResult(simulateForm(form, 'en-US')).base.summary.totalInsurance).toBeGreaterThan(0);
  });

  it('ignores "insurance on top" under the German method', () => {
    const german = filledForm({ method: 'german', insuranceRate: '1' });
    const onTop = simulateForm({ ...german, onTopOfInstallment: true }, 'en-US');
    expect(onTop).toEqual(simulateForm(german, 'en-US'));
  });

  it('dates the schedule from the first payment date, and leaves it undated when empty', () => {
    const dated = okResult(simulateForm(filledForm(), 'en-US'));
    expect(dated.base.rows[0]!.date).toBe('2026-11-27');
    const undated = okResult(simulateForm(filledForm({ firstPaymentDate: '' }), 'en-US'));
    expect(undated.base.rows[0]!.date).toBeNull();
  });

  it('uses the disbursement date only with actual days', () => {
    const thirty = filledForm({ disbursementDate: 'not a date' });
    expect(simulateForm(thirty, 'en-US').ok).toBe(true);
    const actual = filledForm({ dayCount: 'actual360', disbursementDate: '2026-11-27' });
    expect(validationErrors(simulateForm(actual, 'en-US'))).toEqual([
      { field: 'firstPaymentDate', code: 'notAfterDisbursement' },
    ]);
    const empty = filledForm({ dayCount: 'actual360', disbursementDate: '' });
    expect(validationErrors(simulateForm(empty, 'en-US'))).toEqual([
      { field: 'disbursementDate', code: 'required' },
    ]);
  });

  it('counts actual days from the default disbursement, today', () => {
    const { base } = okResult(simulateForm(filledForm({ dayCount: 'actual360' }), 'en-US'));
    // 2026-10-27 → 2026-11-27 is 31 days.
    expect(base.rows[0]!.interest).toBe(roundMoney((10000 * 0.156 * 31) / 360));
  });

  it('passes the maximum rate on', () => {
    const result = okResult(simulateForm(filledForm({ maxRate: '15' }), 'en-US'));
    expect(result.warnings.map((warning) => warning.code)).toEqual(['rateAboveMaximum']);
  });
});

describe('counterpartRate', () => {
  it('gives the effective rate of a nominal one, and the other way around', () => {
    const nominal = filledForm();
    const { summary } = okResult(simulateForm(nominal, 'en-US')).base;
    expect(counterpartRate(nominal, errorsOf(panelState(nominal, 'en-US')), 'en-US')).toBe(
      summary.effectiveRate,
    );

    const effective = filledForm({
      rateType: 'effective',
      annualRate: String(summary.effectiveRate),
    });
    const nominalRate = counterpartRate(
      effective,
      errorsOf(panelState(effective, 'en-US')),
      'en-US',
    );
    expect(nominalRate).toBeCloseTo(15.6, 10);
  });

  it('works while other fields are still empty', () => {
    const form = filledForm({ amount: '' });
    expect(counterpartRate(form, errorsOf(panelState(form, 'en-US')), 'en-US')).toBeCloseTo(
      16.77,
      2,
    );
  });

  it('is null while the rate is empty or invalid', () => {
    const empty = filledForm({ annualRate: '' });
    expect(counterpartRate(empty, errorsOf(panelState(empty, 'en-US')), 'en-US')).toBeNull();
    const tooHigh = filledForm({ annualRate: '150' });
    expect(counterpartRate(tooHigh, errorsOf(panelState(tooHigh, 'en-US')), 'en-US')).toBeNull();
  });
});

describe('hasFixedPayment', () => {
  const summaryOf = (form: LoanForm) => okResult(simulateForm(form, 'en-US')).base.summary;

  it('is fixed under the French method, with insurance inside the payment', () => {
    const form = filledForm({ insuranceRate: '1' });
    expect(hasFixedPayment(form, summaryOf(form))).toBe(true);
  });

  it('changes under the German method', () => {
    const form = filledForm({ method: 'german' });
    expect(hasFixedPayment(form, summaryOf(form))).toBe(false);
  });

  it('changes when insurance on the balance is added on top', () => {
    const form = filledForm({ insuranceRate: '1', onTopOfInstallment: true });
    expect(hasFixedPayment(form, summaryOf(form))).toBe(false);
  });

  it('stays fixed on top when the insurance is on the original amount, or there is none', () => {
    const original = filledForm({
      insuranceRate: '1',
      insuranceBase: 'originalAmount',
      onTopOfInstallment: true,
    });
    expect(hasFixedPayment(original, summaryOf(original))).toBe(true);
    const none = filledForm({ onTopOfInstallment: true });
    expect(hasFixedPayment(none, summaryOf(none))).toBe(true);
  });
});

describe('panelState', () => {
  it('waits for amount, term and rate before simulating', () => {
    const state = panelState(defaultForm(TODAY, 'en-US'), 'en-US');
    expect(state.kind).toBe('loanIncomplete');
    expect(errorsOf(state)).toHaveLength(3);
  });

  it('is invalid, not incomplete, when a required date is empty', () => {
    const state = panelState(filledForm({ dayCount: 'actual360', firstPaymentDate: '' }), 'en-US');
    expect(state).toEqual({
      kind: 'invalid',
      errors: [{ field: 'firstPaymentDate', code: 'required' }],
    });
  });

  it('is invalid when a field has a wrong value', () => {
    expect(panelState(filledForm({ termMonths: 'abc' }), 'en-US')).toEqual({
      kind: 'invalid',
      errors: [{ field: 'termMonths', code: 'notANumber' }],
    });
  });

  it('simulates a complete form, whose fields show no errors', () => {
    const state = panelState(filledForm(), 'en-US');
    expect(state).toEqual({ kind: 'simulated', simulation: simulateForm(filledForm(), 'en-US') });
    expect(errorsOf(state)).toEqual([]);
  });
});

describe('visibleError', () => {
  const required = { message: 'Enter a value.', required: true };
  const notANumber = { message: 'Enter a number.', required: false };

  it('shows any other error at once', () => {
    expect(visibleError(notANumber, 'abc', false)).toBe('Enter a number.');
  });

  it('shows "enter a value" once the user emptied the field', () => {
    expect(visibleError(required, ' ', true)).toBe('Enter a value.');
  });

  it('waits on a field the user has not emptied', () => {
    expect(visibleError(required, '', false)).toBeUndefined();
  });

  it('hides a stale "enter a value" on a field that has text again', () => {
    expect(visibleError(required, '1000', true)).toBeUndefined();
  });

  it('shows nothing without an error', () => {
    expect(visibleError(undefined, '', true)).toBeUndefined();
  });
});
