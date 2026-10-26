// Reference cases from real Ecuadorian simulators. The accepted difference is ±$0.01 per
// payment, accumulated over the loan for totals.
//
// Banco Guayaquil is not here: its simulator charges interest on actual days / 365, while
// this engine uses 30/360. Actual-day bases are planned for after v1.
//
// JEP's insurance constant is not the one it publishes. The online simulator fits
// 0.1258 % per month, and part of its PDF table fits 0.12582 % per month; both are about
// 1.5 × the published 1.0065 % per year. The cases use whichever constant the source fits.

import { describe, expect, it } from 'vitest';
import { simulate } from '@/core/simulate';
import { jepPublishedCases } from './jep-published';
import { jepSimulatorCases } from './jep-simulator';

const CENT = 0.01 + 1e-9;

describe('JEP online simulator (full schedules)', () => {
  it.each(jepSimulatorCases)('$id: $amount over $termMonths months, $method', (golden) => {
    const result = simulate({
      amount: golden.amount,
      termMonths: golden.termMonths,
      annualRate: 15.6,
      rateType: 'nominal',
      method: golden.method,
      insurance: { rate: 0.1258, unit: 'percentPerMonth', base: 'balance' },
    });
    if (!result.ok) throw new Error('invalid input');

    const { rows } = result.base;
    expect(rows).toHaveLength(golden.rows.length);
    golden.rows.forEach(([principal, interest, insurance, payment], index) => {
      const row = rows[index]!;
      const label = `row ${row.number}`;
      expect(Math.abs(row.principal - principal), `${label} principal`).toBeLessThan(CENT);
      expect(Math.abs(row.interest - interest), `${label} interest`).toBeLessThan(CENT);
      expect(Math.abs(row.insurance - insurance), `${label} insurance`).toBeLessThan(CENT);
      expect(Math.abs(row.payment - payment), `${label} payment`).toBeLessThan(CENT);
    });
  });
});

describe('JEP published cost table (summaries)', () => {
  it.each(jepPublishedCases)(
    '$segment: $amount over $termMonths months, $method',
    ({ expected, ...golden }) => {
      const result = simulate({ ...golden, rateType: 'nominal' });
      if (!result.ok) throw new Error('invalid input');

      const { summary } = result.base;
      // A cent per payment, accumulated over the loan.
      const totalTolerance = CENT * golden.termMonths;
      expect(Math.abs(summary.firstPayment - expected.payment)).toBeLessThan(CENT);
      expect(Math.abs(summary.totalInterest - expected.interest)).toBeLessThan(totalTolerance);
      expect(Math.abs(summary.totalInsurance - expected.insurance)).toBeLessThan(totalTolerance);
      expect(Math.abs(summary.totalPaid - expected.total)).toBeLessThan(totalTolerance);
    },
  );
});
