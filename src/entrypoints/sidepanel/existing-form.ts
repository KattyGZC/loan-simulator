import {
  simulateExistingLoan,
  type AmortizationMethod,
  type DayCount,
  type ExistingLoanInput,
  type ExistingLoanTerms,
  type ExistingLoanResult,
  type ExtraPaymentEffect,
  type InsuranceUnit,
  type RateType,
  type ValidationField,
} from '@/core';
import type { FormatLocale } from '@/i18n/format';
import { storedFields } from '@/storage/stored-fields';
import { DAY_COUNTS, EFFECTS, INSURANCE_UNITS, METHODS, RATE_TYPES } from './choices';
import { fieldReader, readInsurance, resultState, withEmptyFields, type PanelState } from './form';

/** The "loan I already have" form: numbers as typed, choices as the engine names them. */
export interface ExistingLoanForm {
  balance: string;
  remainingPayments: string;
  annualRate: string;
  rateType: RateType;
  method: AmortizationMethod;
  /** French method only. */
  currentPayment: string;
  /** ISO date from the date input, or empty. */
  nextPaymentDate: string;
  dayCount: DayCount;
  insuranceRate: string;
  insuranceUnit: InsuranceUnit;
  onTopOfInstallment: boolean;
  otherCharges: string;
  /** ISO date from the date input, or empty. */
  extraPaymentDate: string;
  extraPaymentAmount: string;
  extraPaymentEffect: ExtraPaymentEffect;
}

/** An empty form, with the extra payment made `today` (an ISO date) to shorten the loan. */
export function defaultExistingLoanForm(today: string): ExistingLoanForm {
  return {
    balance: '',
    remainingPayments: '',
    annualRate: '',
    rateType: 'nominal',
    method: 'french',
    currentPayment: '',
    nextPaymentDate: '',
    dayCount: 'thirty360',
    insuranceRate: '',
    insuranceUnit: 'percentPerYear',
    onTopOfInstallment: false,
    otherCharges: '',
    extraPaymentDate: today,
    extraPaymentAmount: '',
    extraPaymentEffect: 'reduceTerm',
  };
}

/** The form saved as a draft, with `defaults` for every field it lacks or cannot hold. */
export function restoreExistingLoanForm(
  stored: unknown,
  defaults: ExistingLoanForm,
): ExistingLoanForm {
  const { text, flag, oneOf } = storedFields(stored);
  return {
    balance: text('balance', defaults.balance),
    remainingPayments: text('remainingPayments', defaults.remainingPayments),
    annualRate: text('annualRate', defaults.annualRate),
    rateType: oneOf('rateType', RATE_TYPES, defaults.rateType),
    method: oneOf('method', METHODS, defaults.method),
    currentPayment: text('currentPayment', defaults.currentPayment),
    nextPaymentDate: text('nextPaymentDate', defaults.nextPaymentDate),
    dayCount: oneOf('dayCount', DAY_COUNTS, defaults.dayCount),
    insuranceRate: text('insuranceRate', defaults.insuranceRate),
    insuranceUnit: oneOf('insuranceUnit', INSURANCE_UNITS, defaults.insuranceUnit),
    onTopOfInstallment: flag('onTopOfInstallment', defaults.onTopOfInstallment),
    otherCharges: text('otherCharges', defaults.otherCharges),
    extraPaymentDate: text('extraPaymentDate', defaults.extraPaymentDate),
    extraPaymentAmount: text('extraPaymentAmount', defaults.extraPaymentAmount),
    extraPaymentEffect: oneOf('extraPaymentEffect', EFFECTS, defaults.extraPaymentEffect),
  };
}

/** Every field the results need; the insurance and other charges are optional. */
function requiredFields(form: ExistingLoanForm): ValidationField[] {
  return [
    'balance',
    'remainingPayments',
    'annualRate',
    ...(form.method === 'french' ? ['currentPayment' as const] : []),
    'nextPaymentDate',
    'extraPayment.date',
    'extraPayment.amount',
  ];
}

/** Simulates the loan and extra payment the form describes. Empty fields fail as `required`. */
export function simulateExistingLoanForm(
  form: ExistingLoanForm,
  locale: FormatLocale,
): ExistingLoanResult {
  const reader = fieldReader(locale);
  const { empty, required, optional, requiredDate } = reader;
  const terms: ExistingLoanTerms = {
    balance: required('balance', form.balance),
    remainingPayments: required('remainingPayments', form.remainingPayments),
    annualRate: required('annualRate', form.annualRate),
    rateType: form.rateType,
    nextPaymentDate: requiredDate('nextPaymentDate', form.nextPaymentDate),
    dayCount: form.dayCount,
    insurance: readInsurance(form, reader),
    otherCharges: optional(form.otherCharges),
    extraPayment: {
      date: requiredDate('extraPayment.date', form.extraPaymentDate),
      amount: required('extraPayment.amount', form.extraPaymentAmount),
      effect: form.extraPaymentEffect,
    },
  };
  const input: ExistingLoanInput =
    form.method === 'french'
      ? {
          ...terms,
          method: 'french',
          currentPayment: required('currentPayment', form.currentPayment),
        }
      : { ...terms, method: 'german' };
  return withEmptyFields(simulateExistingLoan(input), empty);
}

export type ExistingLoanSimulation = Extract<ExistingLoanResult, { ok: true }>;

/** Simulates the form for the panel: incomplete until every required field has a value. */
export function existingLoanState(
  form: ExistingLoanForm,
  locale: FormatLocale,
): PanelState<ExistingLoanSimulation> {
  return resultState(simulateExistingLoanForm(form, locale), requiredFields(form));
}
