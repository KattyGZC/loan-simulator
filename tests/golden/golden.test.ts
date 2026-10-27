// Reference cases from real Ecuadorian simulators. The accepted difference is ±$0.01 per
// payment, accumulated over the loan for totals.
//
// Banco Guayaquil is not here: its simulator charges interest on actual days / 365, and this
// engine counts 30/360 or actual days / 360.
//
// JEP's insurance constant is not the one it publishes. The online simulator fits
// 0.1258 % per month, and part of its PDF table fits 0.12582 % per month; both are about
// 1.5 × the published 1.0065 % per year. The cases use whichever constant the source fits.

import { describe, expect, it } from 'vitest';
import { simulateExistingLoan } from '@/core/existing-loan';
import { simulate } from '@/core/simulate';
import { jepPublishedCases } from './jep-published';
import { jepSimulatorCases } from './jep-simulator';
import {
  produbancoAfterExtraPayment,
  produbancoExtraPayment,
  produbancoOriginal,
  type ProdubancoRow,
} from './produbanco';

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

    const { rows } = result.schedule;
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

      const { summary } = result.schedule;
      // A cent per payment, accumulated over the loan.
      const totalTolerance = CENT * golden.termMonths;
      expect(Math.abs(summary.firstPayment - expected.payment)).toBeLessThan(CENT);
      expect(Math.abs(summary.totalInterest - expected.interest)).toBeLessThan(totalTolerance);
      expect(Math.abs(summary.totalInsurance - expected.insurance)).toBeLessThan(totalTolerance);
      expect(Math.abs(summary.totalPaid - expected.total)).toBeLessThan(totalTolerance);
    },
  );
});

describe('Produbanco statement (actual days / 360, German)', () => {
  function expectRows(loan: typeof produbancoOriginal, expected: ProdubancoRow[]) {
    const result = simulate({
      amount: loan.amount,
      termMonths: loan.termMonths,
      annualRate: 15.6,
      rateType: 'nominal',
      method: 'german',
      dayCount: 'actual360',
      disbursementDate: loan.disbursementDate,
      firstPaymentDate: loan.firstPaymentDate,
    });
    if (!result.ok) throw new Error('invalid input');
    const { rows } = result.schedule;
    expect(rows).toHaveLength(loan.termMonths);
    for (const [number, date, principal, interest, payment] of expected) {
      expect(rows[number - 1], `row ${number}`).toMatchObject({
        date,
        principal,
        interest,
        payment,
      });
    }
  }

  it('matches payments 1–4 of the original loan to the cent', () => {
    expectRows(produbancoOriginal, produbancoOriginal.rows);
  });

  it('matches every payment after the extra payment but the Carnival ones', () => {
    expectRows(produbancoAfterExtraPayment, produbancoAfterExtraPayment.rows);
  });

  it('matches the extra payment on the loan after payment 4, and every payment after it', () => {
    const golden = produbancoExtraPayment;
    const result = simulateExistingLoan({
      balance: golden.balance,
      remainingPayments: golden.remainingPayments,
      annualRate: 15.6,
      rateType: 'nominal',
      method: 'german',
      nextPaymentDate: golden.nextPaymentDate,
      dayCount: 'actual360',
      extraPayment: { ...golden.extraPayment, effect: 'reducePayment' },
    });
    if (!result.ok) throw new Error('invalid input');
    expect(result.extraPayment).toMatchObject({
      accruedInterest: golden.accruedInterest,
      principal: golden.principal,
    });

    const { rows } = result.withExtraPayment;
    expect(rows).toHaveLength(golden.remainingPayments);
    const [, date, principal, interest, payment] = golden.payment5;
    expect(rows[0]).toMatchObject({ date, principal, interest, payment });
    // Row 1 here is payment 5; produbancoAfterExtraPayment numbers payment 6 as 1.
    for (const [number, date, principal, interest, payment] of produbancoAfterExtraPayment.rows) {
      expect(rows[number], `payment ${number + 5}`).toMatchObject({
        date,
        principal,
        interest,
        payment,
      });
    }
  });
});
