import type { InsuranceInput } from './types';

/** Monthly insurance rate as a fraction (0.001 = 0.1 % per month). */
export function insuranceMonthlyRate(insurance: InsuranceInput | undefined): number {
  if (!insurance) return 0;
  switch (insurance.unit) {
    case 'percentPerYear':
      return insurance.rate / 12 / 100;
    case 'percentPerMonth':
      return insurance.rate / 100;
    case 'perMillePerMonth':
      return insurance.rate / 1000;
  }
}
