// Annual rates are fractions (0.156 = 15.6%), compounded monthly.

export function nominalToEffective(nominal: number): number {
  return (1 + nominal / 12) ** 12 - 1;
}

export function effectiveToNominal(effective: number): number {
  return 12 * ((1 + effective) ** (1 / 12) - 1);
}

/** Monthly rate used for payments: the nominal annual rate over 12 (30/360 basis). */
export function monthlyRate(nominal: number): number {
  return nominal / 12;
}
