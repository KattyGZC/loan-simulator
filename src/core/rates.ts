import type { RateType } from './types';

export function percentToFraction(percent: number): number {
  return percent / 100;
}

export function fractionToPercent(fraction: number): number {
  return fraction * 100;
}

export function perMilleToFraction(perMille: number): number {
  return perMille / 1000;
}

/** `percent` % of `amount`, not rounded. */
export function percentOf(amount: number, percent: number): number {
  return (amount * percent) / 100;
}

/** Effective annual rate of a nominal annual rate compounded monthly, both as fractions. */
export function nominalToEffective(nominal: number): number {
  return (1 + nominal / 12) ** 12 - 1;
}

/** Nominal annual rate, compounded monthly, of an effective annual rate, both as fractions. */
export function effectiveToNominal(effective: number): number {
  return 12 * ((1 + effective) ** (1 / 12) - 1);
}

const DAYS_PER_YEAR = 360;

/** Interest of one day at a nominal annual rate, over a 360-day year, as fractions. */
export function dailyRate(nominal: number): number {
  return nominal / DAYS_PER_YEAR;
}

/** Interest rate for `days` actual days at a nominal annual rate (actual/360), as fractions. */
export function actualDaysRate(nominal: number, days: number): number {
  return (nominal * days) / DAYS_PER_YEAR;
}

/** Monthly rate used for payments: the nominal annual rate over 12 (30/360 basis), as fractions. */
export function monthlyRate(nominal: number): number {
  return nominal / 12;
}

/** Both annual rates in percent: the one entered, unchanged, and the other derived from it. */
export function annualRates(
  annualRatePercent: number,
  rateType: RateType,
): { nominalRate: number; effectiveRate: number } {
  const rate = percentToFraction(annualRatePercent);
  return rateType === 'nominal'
    ? { nominalRate: annualRatePercent, effectiveRate: fractionToPercent(nominalToEffective(rate)) }
    : {
        nominalRate: fractionToPercent(effectiveToNominal(rate)),
        effectiveRate: annualRatePercent,
      };
}
