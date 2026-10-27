// Produbanco consumer loan, from the borrower's amortization table issued 2026-09-23. Numbers
// only; no personal data. 6,574.26 over 36 months at 15.60 % nominal, German method, no
// insurance or other charges, disbursed 2025-07-09, due on the 17th. Interest counts actual
// days / 360, and a due date on a weekend moves to Monday.
//
// The borrower paid $2,700.00 on 2025-11-24, between payments 4 and 5, to reduce the payment.
// The published table holds it three ways for this engine: the original loan up to payment 4,
// that extra payment on the loan as it stood after payment 4, and from payment 6 on a new
// German loan of the balance left (3,161.49 over 31 payments, counted from 2025-12-17).

/** [number, due date, principal, interest, payment] */
export type ProdubancoRow = [number, string, number, number, number];

export const produbancoOriginal = {
  amount: 6574.26,
  termMonths: 36,
  disbursementDate: '2025-07-09',
  firstPaymentDate: '2025-08-17',
  rows: [
    [1, '2025-08-18', 182.62, 113.95, 296.57],
    [2, '2025-09-17', 182.62, 83.09, 265.71],
    [3, '2025-10-17', 182.62, 80.72, 263.34],
    [4, '2025-11-17', 182.62, 80.95, 263.57],
  ] satisfies ProdubancoRow[],
};

/**
 * The loan after payment 4, with the extra payment. Payment 5 holds it: of the $2,700, 17.71
 * paid 7 days of interest (a day's interest, 2.53, times 7) and 2,682.29 went to principal.
 * On 2025-12-17 payment 5 then charged 31.51 of interest for the 23 days since.
 */
export const produbancoExtraPayment = {
  balance: 5843.78,
  remainingPayments: 32,
  nextPaymentDate: '2025-12-17',
  extraPayment: { date: '2025-11-24', amount: 2700 },
  accruedInterest: 17.71,
  principal: 2682.29,
  payment5: [5, '2025-12-17', 2682.29, 49.22, 2731.51] satisfies ProdubancoRow,
};

/**
 * Payments 6–36 after the extra payment, renumbered from 1. Payment 7 (row 2 here) fell on
 * 2026-02-17, a Carnival holiday, and moved to the 18th: this engine only moves weekends, so
 * rows 2 and 3 differ by a day of interest and are left out.
 */
export const produbancoAfterExtraPayment = {
  amount: 3161.49,
  termMonths: 31,
  disbursementDate: '2025-12-17',
  firstPaymentDate: '2026-01-17',
  rows: [
    [1, '2026-01-19', 101.98, 45.21, 147.19],
    [4, '2026-04-17', 101.98, 38.36, 140.34],
    [5, '2026-05-18', 101.98, 36.99, 138.97],
    [6, '2026-06-17', 101.98, 34.47, 136.45],
    [7, '2026-07-17', 101.98, 33.14, 135.12],
    [8, '2026-08-17', 101.98, 32.88, 134.86],
    [9, '2026-09-17', 101.98, 31.51, 133.49],
    [10, '2026-10-19', 101.98, 31.11, 133.09],
    [11, '2026-11-17', 101.98, 26.91, 128.89],
    [12, '2026-12-17', 101.98, 26.52, 128.5],
    [13, '2027-01-18', 101.98, 26.87, 128.85],
    [14, '2027-02-17', 101.98, 23.86, 125.84],
    [15, '2027-03-17', 101.98, 21.04, 123.02],
    [16, '2027-04-19', 101.98, 23.33, 125.31],
    [17, '2027-05-17', 101.98, 18.56, 120.54],
    [18, '2027-06-17', 101.98, 19.18, 121.16],
    [19, '2027-07-19', 101.98, 18.39, 120.37],
    [20, '2027-08-17', 101.98, 15.38, 117.36],
    [21, '2027-09-17', 101.98, 15.07, 117.05],
    [22, '2027-10-18', 101.98, 13.7, 115.68],
    [23, '2027-11-17', 101.98, 11.93, 113.91],
    [24, '2027-12-17', 101.98, 10.61, 112.59],
    [25, '2028-01-17', 101.98, 9.59, 111.57],
    [26, '2028-02-17', 101.98, 8.22, 110.2],
    [27, '2028-03-17', 101.98, 6.41, 108.39],
    [28, '2028-04-17', 101.98, 5.48, 107.46],
    [29, '2028-05-17', 101.98, 3.98, 105.96],
    [30, '2028-06-19', 101.98, 2.92, 104.9],
    [31, '2028-07-17', 102.09, 1.24, 103.33],
  ] satisfies ProdubancoRow[],
};
