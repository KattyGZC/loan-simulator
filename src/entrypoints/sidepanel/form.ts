import {
  annualRates,
  paymentDate,
  simulate,
  type AmortizationMethod,
  type DayCount,
  type InsuranceBase,
  type InsuranceInput,
  type InsuranceUnit,
  type LoanInput,
  type LoanSummary,
  type RateType,
  type SimulationResult,
  type ValidationError,
  type ValidationField,
} from '@/core';
import type { FormatLocale } from '@/i18n/format';
import { parseDecimal } from '@/i18n/parse-number';
import type { FieldError } from './errors';

const DEFAULT_SOLCA_PERCENT = 0.5;
const LOAN_FIELDS: readonly ValidationField[] = ['amount', 'termMonths', 'annualRate'];
// paymentDate() counts payments from 1, so payment 2 falls one month after the date given.
const ONE_MONTH_LATER = 2;

/** The side panel form: numbers as the user typed them, choices as the engine names them. */
export interface LoanForm {
  amount: string;
  termMonths: string;
  annualRate: string;
  rateType: RateType;
  method: AmortizationMethod;
  insuranceRate: string;
  insuranceUnit: InsuranceUnit;
  insuranceBase: InsuranceBase;
  onTopOfInstallment: boolean;
  otherCharges: string;
  solcaEnabled: boolean;
  solcaPercent: string;
  dayCount: DayCount;
  /** ISO date (YYYY-MM-DD) from the date input, or empty. */
  firstPaymentDate: string;
  /** ISO date, or empty. The engine only uses it with actual days. */
  disbursementDate: string;
  maxRate: string;
}

/**
 * An empty form with the UI's defaults: SOLCA on at 0.5 %, 30/360, the loan paid out `today`
 * (an ISO date) and the first payment one month later, as the README promises.
 */
export function defaultForm(today: string, locale: FormatLocale): LoanForm {
  return {
    amount: '',
    termMonths: '',
    annualRate: '',
    rateType: 'nominal',
    method: 'french',
    insuranceRate: '',
    insuranceUnit: 'percentPerYear',
    insuranceBase: 'balance',
    onTopOfInstallment: false,
    otherCharges: '',
    solcaEnabled: true,
    solcaPercent: new Intl.NumberFormat(locale).format(DEFAULT_SOLCA_PERCENT),
    dayCount: 'thirty360',
    firstPaymentDate: paymentDate(today, ONE_MONTH_LATER),
    disbursementDate: today,
    maxRate: '',
  };
}

/** Reads the form into the engine's input, remembering which fields were left empty. */
function readForm(form: LoanForm, locale: FormatLocale) {
  const empty = new Set<ValidationField>();
  // LoanInput has no room for an empty number. NaN keeps validate() checking every other
  // field, and the error on an empty field is reported as `required` afterwards.
  const required = (field: ValidationField, text: string): number => {
    const value = parseDecimal(text, locale);
    if (value !== undefined) return value;
    empty.add(field);
    return Number.NaN;
  };
  const optional = (text: string) => parseDecimal(text, locale);

  const insuranceRate = optional(form.insuranceRate);
  const insurance: InsuranceInput | undefined =
    insuranceRate === undefined
      ? undefined
      : {
          rate: insuranceRate,
          unit: form.insuranceUnit,
          base: form.insuranceBase,
          onTopOfInstallment: form.method === 'french' && form.onTopOfInstallment,
        };

  const input: LoanInput = {
    amount: required('amount', form.amount),
    termMonths: required('termMonths', form.termMonths),
    annualRate: required('annualRate', form.annualRate),
    rateType: form.rateType,
    method: form.method,
    insurance,
    otherCharges: optional(form.otherCharges),
    solcaPercent: form.solcaEnabled ? optional(form.solcaPercent) : undefined,
    dayCount: form.dayCount,
    firstPaymentDate: form.firstPaymentDate || undefined,
    disbursementDate: form.disbursementDate || undefined,
    maxRate: optional(form.maxRate),
  };
  return { input, empty };
}

/** Simulates the loan the form describes. Fields left empty fail as `required`. */
export function simulateForm(form: LoanForm, locale: FormatLocale): SimulationResult {
  const { input, empty } = readForm(form, locale);
  const result = simulate(input);
  if (result.ok) return result;
  const errors = result.errors.map((error): ValidationError =>
    empty.has(error.field) ? { field: error.field, code: 'required' } : error,
  );
  return { ok: false, errors };
}

type Simulation = Extract<SimulationResult, { ok: true }>;

/** What the results area shows for the form. */
export type PanelState =
  /** Amount, term or rate is still empty. */
  | { kind: 'loanIncomplete'; errors: ValidationError[] }
  | { kind: 'invalid'; errors: ValidationError[] }
  | { kind: 'simulated'; simulation: Simulation };

/** Simulates the form for the panel. */
export function panelState(form: LoanForm, locale: FormatLocale): PanelState {
  const result = simulateForm(form, locale);
  if (result.ok) return { kind: 'simulated', simulation: result };
  const { errors } = result;
  const loanIncomplete = errors.some(
    (error) => error.code === 'required' && LOAN_FIELDS.includes(error.field),
  );
  return { kind: loanIncomplete ? 'loanIncomplete' : 'invalid', errors };
}

/** The errors each field shows: none once the form simulates. */
export function errorsOf(state: PanelState): readonly ValidationError[] {
  return state.kind === 'simulated' ? [] : state.errors;
}

/**
 * Whether every payment is the same but the last, so the summary shows one payment instead of
 * the first and the last. Only French payments are fixed, and insurance on the balance added
 * on top of them makes them change every month.
 */
export function hasFixedPayment(form: LoanForm, summary: LoanSummary): boolean {
  const insuranceVaries =
    form.onTopOfInstallment && form.insuranceBase === 'balance' && summary.totalInsurance > 0;
  return form.method === 'french' && !insuranceVaries;
}

/**
 * The annual rate of the other type, in percent: the effective rate when the form has the
 * nominal one, and the other way around. Null while the rate is empty or invalid.
 */
export function counterpartRate(
  form: LoanForm,
  errors: readonly ValidationError[],
  locale: FormatLocale,
): number | null {
  const rate = parseDecimal(form.annualRate, locale);
  const rateIsInvalid = errors.some((error) => error.field === 'annualRate');
  if (rate === undefined || rateIsInvalid) return null;
  const { nominalRate, effectiveRate } = annualRates(rate, form.rateType);
  return form.rateType === 'nominal' ? effectiveRate : nominalRate;
}

/**
 * The message `error` shows now. "Enter a value" shows only on an empty field the user has
 * typed in and left at least once: an untouched field is covered by the empty state, and the
 * message on a field that has text again is stale (results lag the keystrokes). Showing it
 * earlier also moved the page under a click that had just left the field, so the click missed.
 */
export function visibleError(
  error: FieldError | undefined,
  value: string,
  emptiedByUser: boolean,
): string | undefined {
  if (!error?.required) return error?.message;
  return emptiedByUser && value.trim() === '' ? error.message : undefined;
}
