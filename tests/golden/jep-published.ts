// JEP "Costos del crédito" table, March 2026 (summary only: no full schedules).
// https://www.jep.coop/documents/20182/0/CostosfinancierosMarzo2026.pdf/
// `payment` is the first payment, insurance included. The PDF publishes desgravamen at
// 1.0065 % per year on the balance; the consumer and microcredit rows match that rate, while
// the productive rows only match 0.12582 % per month (see the note in golden.test.ts).

import type { InsuranceInput } from '@/core/types';

const published: InsuranceInput = { rate: 1.0065, unit: 'percentPerYear', base: 'balance' };
const observed: InsuranceInput = { rate: 0.12582, unit: 'percentPerMonth', base: 'balance' };

export const jepPublishedCases = [
  // prettier-ignore
  ...([
    ['Consumo',         12,  1000, 'french', 15.6,  published, 86.63,   5.6,    91.02,  1092.23],
    ['Consumo',         12,  1000, 'german', 15.6,  published, 84.5,    5.46,   97.17,  1089.96],
    ['Microcrédito',    12,  1000, 'french', 20,    published, 111.78,  5.64,   93.12,  1117.42],
    ['Microcrédito',    12,  1000, 'german', 20,    published, 108.34,  5.46,   100.84, 1113.8],
    ['Corporativo',     36, 20000, 'french', 8.31,  observed,  2683.91, 487.62, 643.65, 23171.53],
    ['Corporativo',     36, 20000, 'german', 8.31,  observed,  2562.23, 465.52, 719.22, 23027.75],
    ['Empresarial',     36, 10000, 'french', 10.63, observed,  1734.8,  246.4,  332.81, 11981.2],
    ['Empresarial',     36, 10000, 'german', 10.63, observed,  1638.77, 232.76, 378.94, 11871.53],
    ['PYMES',           36, 10000, 'french', 10.18, observed,  1657.93, 245.91, 330.67, 11903.84],
    ['PYMES',           36, 10000, 'german', 10.18, observed,  1569.4,  232.76, 375.19, 11802.16],
  ] as const).map(
    ([segment, termMonths, amount, method, annualRate, insurance, interest, insuranceTotal, payment, total]) => ({
      segment,
      termMonths,
      amount,
      method,
      annualRate,
      insurance,
      expected: { interest, insurance: insuranceTotal, payment, total },
    }),
  ),
];
