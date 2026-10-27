import { perMilleToFraction, percentToFraction } from './rates';
import type { InsuranceInput } from './types';

/** Monthly insurance rate as a fraction (0.001 = 0.1 % per month); 0 without insurance. */
export function insuranceMonthlyRate(
  insurance: Pick<InsuranceInput, 'rate' | 'unit'> | undefined,
): number {
  if (!insurance) return 0;
  switch (insurance.unit) {
    case 'percentPerYear':
      return percentToFraction(insurance.rate / 12);
    case 'percentPerMonth':
      return percentToFraction(insurance.rate);
    case 'perMillePerMonth':
      return perMilleToFraction(insurance.rate);
  }
}
