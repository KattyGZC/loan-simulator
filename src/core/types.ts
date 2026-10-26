// Rates and percentages are entered as published: 15.6 means 15.6 %, and a per-mille
// insurance rate of 0.884 means 0.884 ‰. Amounts are in the loan currency.

export type AmortizationMethod = 'french' | 'german';
export type RateType = 'nominal' | 'effective';
export type InsuranceUnit = 'percentPerYear' | 'percentPerMonth' | 'perMillePerMonth';
export type InsuranceBase = 'balance' | 'originalAmount';
export type ExtraPaymentEffect = 'reducePayment' | 'reduceTerm';

export interface InsuranceInput {
  rate: number;
  unit: InsuranceUnit;
  base: InsuranceBase;
  /**
   * French method only. By default the insurance is part of the fixed payment, so the total
   * payment stays the same every month. Set to true to add it on top of the fixed principal
   * + interest payment instead, so the total payment changes with the insurance.
   */
  onTopOfInstallment?: boolean;
}

export interface ExtraPayment {
  /** The extra payment is made right after this payment number. */
  afterPayment: number;
  amount: number;
  effect: ExtraPaymentEffect;
}

export interface LoanInput {
  amount: number;
  termMonths: number;
  /** Annual rate in percent; `rateType` says whether it is nominal or effective. */
  annualRate: number;
  rateType: RateType;
  method: AmortizationMethod;
  insurance?: InsuranceInput;
  /** Fixed amount added to every payment. */
  otherCharges?: number;
  /** SOLCA contribution in percent of the amount, deducted at disbursement. Omit or 0 to skip. */
  solcaPercent?: number;
  /** ISO date (YYYY-MM-DD). Without it the schedule has no dates. */
  firstPaymentDate?: string;
  /** Maximum effective annual rate for the segment, in percent. */
  maxRate?: number;
  extraPayments?: ExtraPayment[];
}

export interface ScheduleRow {
  number: number;
  date: string | null;
  /** principal + interest + insurance + otherCharges. Extra payments are not included. */
  payment: number;
  principal: number;
  interest: number;
  insurance: number;
  otherCharges: number;
  /** Extra principal paid right after this payment. */
  extraPayment: number;
  /** Balance after this payment and its extra payment. */
  balance: number;
}

export interface LoanSummary {
  /** Nominal annual rate, in percent. */
  nominalRate: number;
  /** Effective annual rate, in percent. */
  effectiveRate: number;
  paymentCount: number;
  firstPayment: number;
  lastPayment: number;
  totalInterest: number;
  totalInsurance: number;
  totalOtherCharges: number;
  totalExtraPayments: number;
  solca: number;
  /** amount − SOLCA. */
  amountReceived: number;
  /** Every payment plus every extra payment. */
  totalPaid: number;
  /** interest + insurance + other charges + SOLCA. */
  totalCost: number;
}

export interface Schedule {
  rows: ScheduleRow[];
  summary: LoanSummary;
}

export interface Comparison {
  interestSaved: number;
  insuranceSaved: number;
  otherChargesSaved: number;
  totalCostSaved: number;
  paymentsSaved: number;
  /** First payment after the last extra payment, or null if the loan ended with it. */
  newPayment: number | null;
}

export type ValidationCode =
  | 'required'
  | 'notANumber'
  | 'mustBeInteger'
  | 'mustBePositive'
  | 'mustBeNonNegative'
  | 'outOfRange'
  | 'invalidDate';

/** Path of an input field, e.g. `amount` or `extraPayments.1.afterPayment`. */
export type ValidationField =
  | 'amount'
  | 'termMonths'
  | 'annualRate'
  | 'insurance.rate'
  | 'otherCharges'
  | 'solcaPercent'
  | 'firstPaymentDate'
  | 'maxRate'
  | `extraPayments.${number}.afterPayment`
  | `extraPayments.${number}.amount`;

export interface ValidationError {
  field: ValidationField;
  code: ValidationCode;
  /** Values for the message, e.g. `{ min: 1, max: 360 }` for `outOfRange`. */
  params?: Record<string, number>;
}

export type SimulationWarning =
  | { code: 'rateAboveMaximum'; effectiveRate: number; maxRate: number }
  /** The extra payment was larger than the balance; only the balance was applied. */
  | { code: 'extraPaymentClipped'; index: number; appliedAmount: number }
  /** The loan was already paid off when this extra payment was due. */
  | { code: 'extraPaymentIgnored'; index: number };

/** The schedule with the extra payments applied, compared with the base schedule. */
export interface WithExtraPayments {
  schedule: Schedule;
  comparison: Comparison;
}

export type SimulationResult =
  | {
      ok: true;
      base: Schedule;
      /** Null when there are no extra payments. */
      withExtraPayments: WithExtraPayments | null;
      warnings: SimulationWarning[];
    }
  | { ok: false; errors: ValidationError[] };
