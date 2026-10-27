import type {
  AmortizationMethod,
  DayCount,
  InsuranceBase,
  InsuranceUnit,
  RateType,
  ValidationField,
} from '@/core';
import { t } from '@/i18n/translate';
import type { FieldError } from './errors';
import { CheckboxField, DateField, FieldGroup, NumberField, SelectField } from './fields';
import type { LoanForm } from './form';
import { format } from './locale';

const RATE_TYPES: readonly RateType[] = ['nominal', 'effective'];
const METHODS: readonly AmortizationMethod[] = ['french', 'german'];
const INSURANCE_UNITS: readonly InsuranceUnit[] = [
  'percentPerYear',
  'percentPerMonth',
  'perMillePerMonth',
];
const INSURANCE_BASES: readonly InsuranceBase[] = ['balance', 'originalAmount'];
const DAY_COUNTS: readonly DayCount[] = ['thirty360', 'actual360'];

interface LoanFieldsProps {
  form: LoanForm;
  update: (changes: Partial<LoanForm>) => void;
  errorOf: (field: ValidationField) => FieldError | undefined;
  /** The annual rate of the type not chosen, in percent, or null when it cannot be derived. */
  counterpartRate: number | null;
}

/** The required fields, then the advanced options folded away. */
export function LoanFields({ form, update, errorOf, counterpartRate }: LoanFieldsProps) {
  const actualDays = form.dayCount === 'actual360';
  const rateHint =
    counterpartRate === null
      ? null
      : t(form.rateType === 'nominal' ? 'rateHint_effective' : 'rateHint_nominal', [
          format.percent(counterpartRate),
        ]);
  return (
    <>
      <FieldGroup legend={t('section_loan')}>
        <NumberField
          label={t('field_amount')}
          inputMode="decimal"
          value={form.amount}
          onInput={(amount) => update({ amount })}
          error={errorOf('amount')}
        />
        <NumberField
          label={t('field_termMonths')}
          inputMode="numeric"
          value={form.termMonths}
          onInput={(termMonths) => update({ termMonths })}
          error={errorOf('termMonths')}
        />
        <div class="row">
          <NumberField
            label={t('field_annualRate')}
            inputMode="decimal"
            value={form.annualRate}
            onInput={(annualRate) => update({ annualRate })}
            hint={rateHint}
            error={errorOf('annualRate')}
          />
          <SelectField
            label={t('field_rateType')}
            value={form.rateType}
            options={RATE_TYPES.map((value) => ({ value, label: t(`rateType_${value}`) }))}
            onChange={(rateType) => update({ rateType })}
          />
        </div>
        <SelectField
          label={t('field_method')}
          value={form.method}
          options={METHODS.map((value) => ({ value, label: t(`method_${value}`) }))}
          onChange={(method) => update({ method })}
        />
      </FieldGroup>

      <details class="advanced">
        <summary>{t('section_advanced')}</summary>
        <FieldGroup legend={t('group_insurance')}>
          <NumberField
            label={t('field_insuranceRate')}
            inputMode="decimal"
            value={form.insuranceRate}
            onInput={(insuranceRate) => update({ insuranceRate })}
            error={errorOf('insurance.rate')}
          />
          <div class="row">
            <SelectField
              label={t('field_insuranceUnit')}
              value={form.insuranceUnit}
              options={INSURANCE_UNITS.map((value) => ({
                value,
                label: t(`insuranceUnit_${value}`),
              }))}
              onChange={(insuranceUnit) => update({ insuranceUnit })}
            />
            <SelectField
              label={t('field_insuranceBase')}
              value={form.insuranceBase}
              options={INSURANCE_BASES.map((value) => ({
                value,
                label: t(`insuranceBase_${value}`),
              }))}
              onChange={(insuranceBase) => update({ insuranceBase })}
            />
          </div>
          {form.method === 'french' && (
            <CheckboxField
              label={t('field_insuranceInPayment')}
              checked={!form.onTopOfInstallment}
              onChange={(included) => update({ onTopOfInstallment: !included })}
            />
          )}
        </FieldGroup>

        <NumberField
          label={t('field_otherCharges')}
          inputMode="decimal"
          value={form.otherCharges}
          onInput={(otherCharges) => update({ otherCharges })}
          error={errorOf('otherCharges')}
        />
        <CheckboxField
          label={t('field_solcaEnabled')}
          checked={form.solcaEnabled}
          onChange={(solcaEnabled) => update({ solcaEnabled })}
        />
        {form.solcaEnabled && (
          <NumberField
            label={t('field_solcaPercent')}
            inputMode="decimal"
            value={form.solcaPercent}
            onInput={(solcaPercent) => update({ solcaPercent })}
            error={errorOf('solcaPercent')}
          />
        )}
        <SelectField
          label={t('field_dayCount')}
          value={form.dayCount}
          options={DAY_COUNTS.map((value) => ({ value, label: t(`dayCount_${value}`) }))}
          onChange={(dayCount) => update({ dayCount })}
        />
        {actualDays && (
          <DateField
            label={t('field_disbursementDate')}
            value={form.disbursementDate}
            onInput={(disbursementDate) => update({ disbursementDate })}
            error={errorOf('disbursementDate')}
          />
        )}
        <DateField
          label={t('field_firstPaymentDate')}
          value={form.firstPaymentDate}
          onInput={(firstPaymentDate) => update({ firstPaymentDate })}
          error={errorOf('firstPaymentDate')}
          hint={actualDays ? t('hint_weekendDueDates') : undefined}
        />
        <NumberField
          label={t('field_maxRate')}
          inputMode="decimal"
          value={form.maxRate}
          onInput={(maxRate) => update({ maxRate })}
          error={errorOf('maxRate')}
        />
      </details>
    </>
  );
}
