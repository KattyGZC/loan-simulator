import { buildSchedule, type ScheduleParams } from './amortization';
import { loanCalendar } from './calendar';
import { insuranceMonthlyRate } from './insurance';
import { roundMoney } from './money';
import { annualRates, percentOf, percentToFraction } from './rates';
import { compare, summarize, type LoanTerms } from './summary';
import type { LoanInput, Schedule, SimulationResult, SimulationWarning } from './types';
import { validate } from './validate';

export function simulate(input: LoanInput): SimulationResult {
  const errors = validate(input);
  if (errors.length > 0) return { ok: false, errors };

  const { nominalRate, effectiveRate } = annualRates(input.annualRate, input.rateType);

  const nominal = percentToFraction(nominalRate);
  const params: ScheduleParams = {
    amount: input.amount,
    termMonths: input.termMonths,
    method: input.method,
    calendar: loanCalendar(input, nominal),
    insurance: {
      monthlyRate: insuranceMonthlyRate(input.insurance),
      base: input.insurance?.base ?? 'balance',
      onTopOfInstallment: input.insurance?.onTopOfInstallment ?? false,
    },
    otherCharges: input.otherCharges ?? 0,
  };
  const loan: LoanTerms = {
    amount: input.amount,
    solca: roundMoney(percentOf(input.amount, input.solcaPercent ?? 0)),
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
    return { ok: true, base, withExtraPayments: null, warnings };
  }

  const extra = buildSchedule(params, extraPayments);
  warnings.push(...extra.warnings);
  const schedule: Schedule = { rows: extra.rows, summary: summarize(extra.rows, loan) };
  const comparison = compare(base, schedule);
  return { ok: true, base, withExtraPayments: { schedule, comparison }, warnings };
}
