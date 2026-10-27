import type { InsuranceBase, ValidationField } from '@/core';
import { t } from '@/i18n/translate';
import { DayCountField, InsuranceFields, MethodField, RateFields } from './common-fields';
import type { FieldError } from './errors';
import { CheckboxField, DateField, FieldGroup, NumberField, SelectField } from './fields';
import type { LoanForm } from './form';

const INSURANCE_BASES: readonly InsuranceBase[] = ['balance', 'originalAmount'];

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
        <RateFields
          annualRate={form.annualRate}
          rateType={form.rateType}
          onRateInput={(annualRate) => update({ annualRate })}
          onRateTypeChange={(rateType) => update({ rateType })}
          error={errorOf('annualRate')}
          counterpartRate={counterpartRate}
        />
        <MethodField value={form.method} onChange={(method) => update({ method })} />
      </FieldGroup>

      <details class="advanced">
        <summary>{t('section_advanced')}</summary>
        <InsuranceFields form={form} update={update} error={errorOf('insurance.rate')}>
          <SelectField
            label={t('field_insuranceBase')}
            value={form.insuranceBase}
            options={INSURANCE_BASES.map((value) => ({
              value,
              label: t(`insuranceBase_${value}`),
            }))}
            onChange={(insuranceBase) => update({ insuranceBase })}
          />
        </InsuranceFields>

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
        <DayCountField value={form.dayCount} onChange={(dayCount) => update({ dayCount })} />
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
