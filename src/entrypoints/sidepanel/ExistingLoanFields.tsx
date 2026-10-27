import type { ExtraPaymentEffect, ValidationField } from '@/core';
import { t } from '@/i18n/translate';
import { DayCountField, InsuranceFields, MethodField, RateFields } from './common-fields';
import type { FieldError } from './errors';
import type { ExistingLoanForm } from './existing-form';
import { DateField, FieldGroup, NumberField, SelectField } from './fields';

const EFFECTS: readonly ExtraPaymentEffect[] = ['reduceTerm', 'reducePayment'];

interface ExistingLoanFieldsProps {
  form: ExistingLoanForm;
  update: (changes: Partial<ExistingLoanForm>) => void;
  errorOf: (field: ValidationField) => FieldError | undefined;
  /** The annual rate of the type not chosen, in percent, or null when it cannot be derived. */
  counterpartRate: number | null;
}

/** The loan as its statement shows it, the extra payment, then the advanced options. */
export function ExistingLoanFields({
  form,
  update,
  errorOf,
  counterpartRate,
}: ExistingLoanFieldsProps) {
  const french = form.method === 'french';
  return (
    <>
      <FieldGroup legend={t('section_existingLoan')}>
        <NumberField
          label={t('field_balance')}
          inputMode="decimal"
          value={form.balance}
          onInput={(balance) => update({ balance })}
          hint={t('hint_balance')}
          error={errorOf('balance')}
        />
        <NumberField
          label={t('field_remainingPayments')}
          inputMode="numeric"
          value={form.remainingPayments}
          onInput={(remainingPayments) => update({ remainingPayments })}
          hint={t('hint_remainingPayments')}
          error={errorOf('remainingPayments')}
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
        {french && (
          <NumberField
            label={t('field_currentPayment')}
            inputMode="decimal"
            value={form.currentPayment}
            onInput={(currentPayment) => update({ currentPayment })}
            hint={t('hint_currentPayment')}
            error={errorOf('currentPayment')}
          />
        )}
        <DateField
          label={t('field_nextPaymentDate')}
          value={form.nextPaymentDate}
          onInput={(nextPaymentDate) => update({ nextPaymentDate })}
          error={errorOf('nextPaymentDate')}
          hint={form.dayCount === 'actual360' ? t('hint_weekendDueDates') : undefined}
        />
      </FieldGroup>

      <FieldGroup legend={t('section_extraPayment')}>
        <div class="row">
          <DateField
            label={t('field_extraPaymentDate')}
            value={form.extraPaymentDate}
            onInput={(extraPaymentDate) => update({ extraPaymentDate })}
            error={errorOf('extraPayment.date')}
          />
          <NumberField
            label={t('field_extraPaymentAmount')}
            inputMode="decimal"
            value={form.extraPaymentAmount}
            onInput={(extraPaymentAmount) => update({ extraPaymentAmount })}
            error={errorOf('extraPayment.amount')}
          />
        </div>
        <SelectField
          label={t('field_extraPaymentEffect')}
          value={form.extraPaymentEffect}
          options={EFFECTS.map((value) => ({ value, label: t(`effect_${value}`) }))}
          onChange={(extraPaymentEffect) => update({ extraPaymentEffect })}
        />
      </FieldGroup>

      <details class="advanced">
        <summary>{t('section_advanced')}</summary>
        <InsuranceFields
          form={form}
          update={update}
          error={errorOf('insurance.rate')}
          rateHint={t('hint_existingInsurance')}
        />
        <NumberField
          label={t('field_otherCharges')}
          inputMode="decimal"
          value={form.otherCharges}
          onInput={(otherCharges) => update({ otherCharges })}
          error={errorOf('otherCharges')}
        />
        <DayCountField value={form.dayCount} onChange={(dayCount) => update({ dayCount })} />
      </details>
    </>
  );
}
