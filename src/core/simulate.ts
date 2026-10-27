import { buildSchedule, type ScheduleParams } from './amortization';
import { loanCalendar } from './calendar';
import { insuranceMonthlyRate } from './insurance';
import { roundMoney } from './money';
import { annualRates, percentOf, percentToFraction } from './rates';
import { summarize, type LoanTerms } from './summary';
import type { LoanInput, SimulationResult, SimulationWarning } from './types';
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

  const rows = buildSchedule(params);
  return { ok: true, schedule: { rows, summary: summarize(rows, loan) }, warnings };
}
