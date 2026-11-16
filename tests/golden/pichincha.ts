// Banco Pichincha online simulator, credit PRECISO (consumer), read 2026-11-15.
// https://www.pichincha.com/detalle-producto/simulador-de-credito
// 10,000 over 12 months at 15.60 % nominal, French. Interest is 30/360 (each payment charges
// the balance × 1.3 %). The simulator charges desgravamen at 0.1408 % a month on the balance,
// inside the fixed payment: 1.69 % a year, where its tariff publishes 1.69 per mille. SOLCA
// is 0.5 %, taken from the amount paid out.
//
// The simulator carries unrounded values from row to row; this engine rounds every row and
// the last payment takes what is left. Payment 12 is 913.42 there and 913.46 here.

/** [principal, interest, insurance, payment] */
type PichinchaRow = [number, number, number, number];

export const pichinchaPreciso = {
  amount: 10000,
  termMonths: 12,
  annualRate: 15.6,
  insuranceRatePercentPerMonth: 0.1408,
  solcaPercent: 0.5,
  rows: [
    [769.34, 130.0, 14.08, 913.42],
    [780.43, 120.0, 13.0, 913.42],
    [791.67, 109.85, 11.9, 913.42],
    [803.08, 99.56, 10.79, 913.42],
    [814.65, 89.12, 9.65, 913.42],
    [826.39, 78.53, 8.51, 913.42],
    [838.29, 67.79, 7.34, 913.42],
    [850.37, 56.89, 6.16, 913.42],
    [862.62, 45.84, 4.97, 913.42],
    [875.05, 34.62, 3.75, 913.42],
    [887.66, 23.25, 2.52, 913.42],
    [900.45, 11.71, 1.27, 913.42],
  ] satisfies PichinchaRow[],
  summary: {
    amountReceived: 9950,
    totalInterest: 867.15,
    totalInsurance: 93.94,
    totalPaid: 10961.09,
  },
};
