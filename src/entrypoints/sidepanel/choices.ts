import type {
  AmortizationMethod,
  DayCount,
  ExtraPaymentEffect,
  InsuranceBase,
  InsuranceUnit,
  RateType,
} from '@/core';

/** The options of each select, in the order the panel lists them. */
export const RATE_TYPES: readonly RateType[] = ['nominal', 'effective'];
export const METHODS: readonly AmortizationMethod[] = ['french', 'german'];
export const DAY_COUNTS: readonly DayCount[] = ['thirty360', 'actual360'];
export const INSURANCE_UNITS: readonly InsuranceUnit[] = [
  'percentPerYear',
  'percentPerMonth',
  'perMillePerMonth',
];
export const INSURANCE_BASES: readonly InsuranceBase[] = ['balance', 'originalAmount'];
export const EFFECTS: readonly ExtraPaymentEffect[] = ['reduceTerm', 'reducePayment'];
