import { buildSchedule, type ScheduleParams } from './amortization';
import { insuranceMonthlyRate } from './insurance';
import { roundMoney } from './money';
import { effectiveToNominal, monthlyRate, nominalToEffective } from './rates';
import { compare, summarize } from './summary';
import type { LoanInput, Schedule, SimulationResult, SimulationWarning } from './types';
import { validate } from './validate';

export function simulate(input: LoanInput): SimulationResult {
  const errors = validate(input);
  if (errors.length > 0) return { ok: false, errors };

  // Keep the rate the user entered exactly as is and derive the other one.
  const nominalRate =
    input.rateType === 'nominal'
      ? input.annualRate
      : effectiveToNominal(input.annualRate / 100) * 100;
  const effectiveRate =
    input.rateType === 'effective'
      ? input.annualRate
      : nominalToEffective(input.annualRate / 100) * 100;

  const params: ScheduleParams = {
    amount: input.amount,
    termMonths: input.termMonths,
    method: input.method,
    monthlyRate: monthlyRate(nominalRate / 100),
    insuranceRate: insuranceMonthlyRate(input.insurance),
    insuranceBase: input.insurance?.base ?? 'balance',
    insuranceOnTop: input.insurance?.onTopOfInstallment ?? false,
    otherCharges: input.otherCharges ?? 0,
    firstPaymentDate: input.firstPaymentDate,
  };
  const loan = {
    amount: input.amount,
    solca: roundMoney((input.amount * (input.solcaPercent ?? 0)) / 100),
    nominalRate,
    effectiveRate,
  };

  const warnings: SimulationWarning[] = [];
  if (input.maxRate !== undefined && effectiveRate > input.maxRate) {
    warnings.push({ code: 'rateAboveMaximum', effectiveRate, maxRate: input.maxRate });
  }

  const baseRows = buildSchedule(params).rows;
  const base: Schedule = { rows: baseRows, summary: summarize(baseRows, loan) };

  const extraPayments = input.extraPayments ?? [];
  if (extraPayments.length === 0) {
    return { ok: true, base, withExtras: null, comparison: null, warnings };
  }

  const extra = buildSchedule(params, extraPayments);
  warnings.push(...extra.warnings);
  const withExtras: Schedule = { rows: extra.rows, summary: summarize(extra.rows, loan) };
  return { ok: true, base, withExtras, comparison: compare(base, withExtras), warnings };
}
