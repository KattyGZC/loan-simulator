/**
 * Rounds an amount to cents, half away from zero.
 *
 * Works on the decimal representation (10 places) instead of `x * 100`, so values such as
 * 1.005, stored as 1.00499999..., round to 1.01 the way a person (or a bank) expects.
 */
export function roundMoney(value: number): number {
  const [whole = '0', fraction = ''] = Math.abs(value).toFixed(10).split('.');
  const cents = Math.round(Number(`${whole}${fraction.slice(0, 2)}.${fraction.slice(2)}`));
  return (Math.sign(value) * cents) / 100;
}
