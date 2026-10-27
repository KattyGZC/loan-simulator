import type { ComponentChildren } from 'preact';
import type { AmortizationMethod, DayCount, InsuranceUnit, RateType } from '@/core';
import { t } from '@/i18n/translate';
import type { FieldError } from './errors';
import { CheckboxField, FieldGroup, NumberField, SelectField } from './fields';
import type { LoanForm } from './form';
import { format } from './locale';

const RATE_TYPES: readonly RateType[] = ['nominal', 'effective'];
const METHODS: readonly AmortizationMethod[] = ['french', 'german'];
const DAY_COUNTS: readonly DayCount[] = ['thirty360', 'actual360'];
const INSURANCE_UNITS: readonly InsuranceUnit[] = [
  'percentPerYear',
  'percentPerMonth',
  'perMillePerMonth',
];

interface RateFieldsProps {
  annualRate: string;
  rateType: RateType;
  onRateInput: (annualRate: string) => void;
  onRateTypeChange: (rateType: RateType) => void;
  error: FieldError | undefined;
  /** The annual rate of the type not chosen, in percent, or null when it cannot be derived. */
  counterpartRate: number | null;
}

/** The annual rate and its type, with the rate of the other type below it. */
export function RateFields(props: RateFieldsProps) {
  const hint =
    props.counterpartRate === null
      ? null
      : t(props.rateType === 'nominal' ? 'rateHint_effective' : 'rateHint_nominal', [
          format.percent(props.counterpartRate),
        ]);
  return (
    <div class="row">
      <NumberField
        label={t('field_annualRate')}
        inputMode="decimal"
        value={props.annualRate}
        onInput={props.onRateInput}
        hint={hint}
        error={props.error}
      />
      <SelectField
        label={t('field_rateType')}
        value={props.rateType}
        options={RATE_TYPES.map((value) => ({ value, label: t(`rateType_${value}`) }))}
        onChange={props.onRateTypeChange}
      />
    </div>
  );
}

export function MethodField(props: {
  value: AmortizationMethod;
  onChange: (method: AmortizationMethod) => void;
}) {
  return (
    <SelectField
      label={t('field_method')}
      value={props.value}
      options={METHODS.map((value) => ({ value, label: t(`method_${value}`) }))}
      onChange={props.onChange}
    />
  );
}

export function DayCountField(props: { value: DayCount; onChange: (dayCount: DayCount) => void }) {
  return (
    <SelectField
      label={t('field_dayCount')}
      value={props.value}
      options={DAY_COUNTS.map((value) => ({ value, label: t(`dayCount_${value}`) }))}
      onChange={props.onChange}
    />
  );
}

type InsuranceForm = Pick<
  LoanForm,
  'insuranceRate' | 'insuranceUnit' | 'onTopOfInstallment' | 'method'
>;

interface InsuranceFieldsProps {
  form: InsuranceForm;
  update: (changes: Partial<InsuranceForm>) => void;
  error: FieldError | undefined;
  rateHint?: string;
  /** Fields shown next to the unit, such as the insurance base. */
  children?: ComponentChildren;
}

/** Credit life insurance: rate, unit and, under the French method, whether it is in the payment. */
export function InsuranceFields({ form, update, error, rateHint, children }: InsuranceFieldsProps) {
  return (
    <FieldGroup legend={t('group_insurance')}>
      <NumberField
        label={t('field_insuranceRate')}
        inputMode="decimal"
        value={form.insuranceRate}
        onInput={(insuranceRate) => update({ insuranceRate })}
        hint={rateHint}
        error={error}
      />
      <div class="row">
        <SelectField
          label={t('field_insuranceUnit')}
          value={form.insuranceUnit}
          options={INSURANCE_UNITS.map((value) => ({ value, label: t(`insuranceUnit_${value}`) }))}
          onChange={(insuranceUnit) => update({ insuranceUnit })}
        />
        {children}
      </div>
      {form.method === 'french' && (
        <CheckboxField
          label={t('field_insuranceInPayment')}
          checked={!form.onTopOfInstallment}
          onChange={(included) => update({ onTopOfInstallment: !included })}
        />
      )}
    </FieldGroup>
  );
}
