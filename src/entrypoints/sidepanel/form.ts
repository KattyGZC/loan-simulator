import {
  annualRates,
  paymentDate,
  simulate,
  type AmortizationMethod,
  type DayCount,
  type InsuranceBase,
  type InsuranceTerms,
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
import { storedFields } from '@/storage/stored-fields';
import { DAY_COUNTS, INSURANCE_BASES, INSURANCE_UNITS, METHODS, RATE_TYPES } from './choices';
import type { FieldError } from './errors';
import { defaultPreferences, type Preferences } from './preferences';

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
  /** Labels only: together they name the scenario when it is saved. */
  institution: string;
  segment: string;
}

/**
 * An empty form with the UI's defaults: SOLCA as the user's `preferences` say (on at 0.5 %
 * unless they changed it), 30/360, the loan paid out `today`
 * (an ISO date) and the first payment one month later, as the README promises.
 */
export function defaultForm(
  today: string,
  locale: FormatLocale,
  preferences: Pick<Preferences, 'solcaEnabled' | 'solcaPercent'> = defaultPreferences(locale),
): LoanForm {
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
    solcaEnabled: preferences.solcaEnabled,
    solcaPercent: preferences.solcaPercent,
    dayCount: 'thirty360',
    firstPaymentDate: paymentDate(today, ONE_MONTH_LATER),
    disbursementDate: today,
    maxRate: '',
    institution: '',
    segment: '',
  };
}

/** The form saved as a draft, with `defaults` for every field it lacks or cannot hold. */
export function restoreLoanForm(stored: unknown, defaults: LoanForm): LoanForm {
  const { text, flag, oneOf } = storedFields(stored);
  return {
    amount: text('amount', defaults.amount),
    termMonths: text('termMonths', defaults.termMonths),
    annualRate: text('annualRate', defaults.annualRate),
    rateType: oneOf('rateType', RATE_TYPES, defaults.rateType),
    method: oneOf('method', METHODS, defaults.method),
    insuranceRate: text('insuranceRate', defaults.insuranceRate),
    insuranceUnit: oneOf('insuranceUnit', INSURANCE_UNITS, defaults.insuranceUnit),
    insuranceBase: oneOf('insuranceBase', INSURANCE_BASES, defaults.insuranceBase),
    onTopOfInstallment: flag('onTopOfInstallment', defaults.onTopOfInstallment),
    otherCharges: text('otherCharges', defaults.otherCharges),
    solcaEnabled: flag('solcaEnabled', defaults.solcaEnabled),
    solcaPercent: text('solcaPercent', defaults.solcaPercent),
    dayCount: oneOf('dayCount', DAY_COUNTS, defaults.dayCount),
    firstPaymentDate: text('firstPaymentDate', defaults.firstPaymentDate),
    disbursementDate: text('disbursementDate', defaults.disbursementDate),
    maxRate: text('maxRate', defaults.maxRate),
    institution: text('institution', defaults.institution),
    segment: text('segment', defaults.segment),
  };
}

export interface FieldReader {
  /** The required fields read so far that were empty. */
  readonly empty: ReadonlySet<ValidationField>;
  /** The number typed in `field`, or NaN when it is empty. */
  required(field: ValidationField, text: string): number;
  optional(text: string): number | undefined;
  /** The ISO date of a date input; empty when the input is. */
  requiredDate(field: ValidationField, isoDate: string): string;
}

/**
 * Reads typed fields into engine input, remembering which required ones were left empty. The
 * engine's inputs have no room for an empty number: NaN, or an empty date, keeps validation
 * checking every other field, and `withEmptyFields()` reports that field as `required` after.
 */
export function fieldReader(locale: FormatLocale): FieldReader {
  const empty = new Set<ValidationField>();
  return {
    empty,
    required(field: ValidationField, text: string): number {
      const value = parseDecimal(text, locale);
      if (value !== undefined) return value;
      empty.add(field);
      return Number.NaN;
    },
    optional: (text: string) => parseDecimal(text, locale),
    requiredDate(field: ValidationField, isoDate: string): string {
      if (isoDate === '') empty.add(field);
      return isoDate;
    },
  };
}

type Failure = { ok: false; errors: ValidationError[] };

/** `result`, with the error of a field left empty reported as `required`. */
export function withEmptyFields<T extends { ok: true }>(
  result: T | Failure,
  empty: ReadonlySet<ValidationField>,
): T | Failure {
  if (result.ok) return result;
  const errors = result.errors.map((error): ValidationError =>
    empty.has(error.field) ? { field: error.field, code: 'required' } : error,
  );
  return { ok: false, errors };
}

/** What the results area shows for a form. */
export type PanelState<T> =
  /** A field the results need is still empty. */
  | { kind: 'loanIncomplete'; errors: ValidationError[] }
  | { kind: 'invalid'; errors: ValidationError[] }
  | { kind: 'simulated'; simulation: T };

/** The panel state of a simulation: incomplete while one of `loanFields` is empty. */
export function resultState<T extends { ok: true }>(
  result: T | Failure,
  loanFields: readonly ValidationField[],
): PanelState<T> {
  if (result.ok) return { kind: 'simulated', simulation: result };
  const { errors } = result;
  const loanIncomplete = errors.some(
    (error) => error.code === 'required' && loanFields.includes(error.field),
  );
  return { kind: loanIncomplete ? 'loanIncomplete' : 'invalid', errors };
}

/** The errors each field shows: none once the form simulates. */
export function errorsOf(state: PanelState<unknown>): readonly ValidationError[] {
  return state.kind === 'simulated' ? [] : state.errors;
}

/**
 * The insurance the form describes, or none while its rate is empty. It goes on top of the
 * payment only under the French method; the German method has no fixed payment to go inside.
 */
export function readInsurance(
  form: Pick<LoanForm, 'insuranceRate' | 'insuranceUnit' | 'onTopOfInstallment' | 'method'>,
  reader: FieldReader,
): InsuranceTerms | undefined {
  const rate = reader.optional(form.insuranceRate);
  if (rate === undefined) return undefined;
  return {
    rate,
    unit: form.insuranceUnit,
    onTopOfInstallment: form.method === 'french' && form.onTopOfInstallment,
  };
}

/** Reads the form into the engine's input, remembering which fields were left empty. */
function readForm(form: LoanForm, locale: FormatLocale) {
  const reader = fieldReader(locale);
  const { empty, required, optional } = reader;
  const insurance = readInsurance(form, reader);

  const input: LoanInput = {
    amount: required('amount', form.amount),
    termMonths: required('termMonths', form.termMonths),
    annualRate: required('annualRate', form.annualRate),
    rateType: form.rateType,
    method: form.method,
    insurance: insurance && { ...insurance, base: form.insuranceBase },
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
  return withEmptyFields(simulate(input), empty);
}

type Simulation = Extract<SimulationResult, { ok: true }>;

/** Simulates the form for the panel. */
export function panelState(form: LoanForm, locale: FormatLocale): PanelState<Simulation> {
  return resultState(simulateForm(form, locale), LOAN_FIELDS);
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
  form: Pick<LoanForm, 'annualRate' | 'rateType'>,
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
