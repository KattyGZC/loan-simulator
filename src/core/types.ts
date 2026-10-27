// Rates and percentages are entered as published: 15.6 means 15.6 %, and a per-mille
// insurance rate of 0.884 means 0.884 ‰. Amounts are in the loan currency.

export type AmortizationMethod = 'french' | 'german';
export type RateType = 'nominal' | 'effective';
export type InsuranceUnit = 'percentPerYear' | 'percentPerMonth' | 'perMillePerMonth';
export type InsuranceBase = 'balance' | 'originalAmount';
export type ExtraPaymentEffect = 'reducePayment' | 'reduceTerm';
/**
 * How interest counts time. `thirty360`: every month is 30 days of a 360-day year, so each
 * payment charges the monthly rate. `actual360`: each payment charges the days since the
 * previous due date (or the disbursement) over a 360-day year.
 */
export type DayCount = 'thirty360' | 'actual360';

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
  /** Defaults to `thirty360`. */
  dayCount?: DayCount;
  /** ISO date (YYYY-MM-DD). Required with `actual360`; without it the schedule has no dates. */
  firstPaymentDate?: string;
  /**
   * ISO date the loan was paid out, which starts the first interest period. Required with
   * `actual360` and ignored with `thirty360`.
   */
  disbursementDate?: string;
  /** Maximum effective annual rate for the segment, in percent. */
  maxRate?: number;
}

/** Credit life insurance without its base. */
export type InsuranceTerms = Omit<InsuranceInput, 'base'>;

/** An extra principal payment on a loan already running. */
export interface ExtraPayment {
  /** ISO date it is paid, from the previous due date up to the day before the last payment. */
  date: string;
  /** What the borrower pays: the interest accrued up to `date` first, the rest to principal. */
  amount: number;
  effect: ExtraPaymentEffect;
}

/**
 * The method of a loan already running. Under the French method the lender's fixed payment is
 * part of the loan: with the insurance when it is inside the payment, without other charges. It
 * sets every payment but the last; the remaining payments only check it. The German fixed
 * principal is the balance over the remaining payments.
 */
export type ExistingLoanMethod =
  { method: 'french'; currentPayment: number } | { method: 'german' };

/**
 * A loan already running, as its latest statement shows it, and one extra payment on it.
 * Payments are numbered from the next one.
 */
export type ExistingLoanInput = ExistingLoanMethod & ExistingLoanTerms;

export interface ExistingLoanTerms {
  /** Principal still owed after the last payment made. */
  balance: number;
  /** Payments left, the next one included. */
  remainingPayments: number;
  /** Annual rate in percent; `rateType` says whether it is nominal or effective. */
  annualRate: number;
  rateType: RateType;
  /** ISO date the next payment is due. Every later due date falls on its day of the month. */
  nextPaymentDate: string;
  /** Defaults to `thirty360`. */
  dayCount?: DayCount;
  /** Always on the balance. */
  insurance?: InsuranceTerms;
  /** Fixed amount added to every payment. */
  otherCharges?: number;
  extraPayment: ExtraPayment;
}

/**
 * One payment. The payment whose period holds an extra payment includes it, as a lender's
 * statement does: its principal and interest are what the extra payment paid plus what is paid
 * on the due date.
 */
export interface ScheduleRow {
  number: number;
  /**
   * Due date. With `actual360`, one that falls on a Saturday or Sunday moves to Monday. When an
   * extra payment pays the loan off, the date of that extra payment.
   */
  date: string | null;
  /** principal + interest + insurance + otherCharges. */
  payment: number;
  principal: number;
  interest: number;
  insurance: number;
  otherCharges: number;
  /** Balance after this payment. */
  balance: number;
}

/** Totals of a schedule. */
export interface PaymentsSummary {
  paymentCount: number;
  firstPayment: number;
  lastPayment: number;
  totalInterest: number;
  totalInsurance: number;
  totalOtherCharges: number;
  /** Every payment, extra payments included. */
  totalPaid: number;
}

export interface LoanSummary extends PaymentsSummary {
  /** Nominal annual rate, in percent. */
  nominalRate: number;
  /** Effective annual rate, in percent. */
  effectiveRate: number;
  solca: number;
  /** amount − SOLCA. */
  amountReceived: number;
  /** interest + insurance + other charges + SOLCA. */
  totalCost: number;
}

export interface Schedule {
  rows: ScheduleRow[];
  summary: LoanSummary;
}

/** The rest of a loan already running, from its next payment. */
export interface RemainingSchedule {
  rows: ScheduleRow[];
  summary: PaymentsSummary;
}

/** How an extra payment was applied. */
export interface AppliedExtraPayment {
  date: string;
  /** The payment whose period it falls in; its row includes it. */
  paymentNumber: number;
  /** accruedInterest + principal: the amount entered, or less if it was more than the loan. */
  amount: number;
  /** Interest from the previous due date up to `date`. */
  accruedInterest: number;
  principal: number;
  /** Balance right after it. */
  balance: number;
  /**
   * Principal its payment still repays on the due date: 0 when the extra payment covered all
   * of that payment's principal, which then charges only interest.
   */
  duePrincipal: number;
}

/** What an extra payment saves, against the same loan without it. */
export interface Comparison {
  interestSaved: number;
  insuranceSaved: number;
  otherChargesSaved: number;
  /** interestSaved + insuranceSaved + otherChargesSaved. */
  totalCostSaved: number;
  paymentsSaved: number;
  /**
   * First payment after the one that holds the extra payment, or null when the loan ended with
   * it or the extra payment was too small to reschedule the payments after it.
   */
  newPayment: number | null;
}

export type ValidationCode =
  | 'required'
  | 'notANumber'
  | 'mustBeInteger'
  | 'mustBePositive'
  | 'mustBeNonNegative'
  | 'outOfRange'
  | 'tooLarge'
  | 'tooSmall'
  | 'invalidDate'
  | 'dateOutOfRange'
  | 'notAfterDisbursement';

/** Path of an input field, e.g. `amount` or `extraPayment.date`. */
export type ValidationField =
  | 'amount'
  | 'termMonths'
  | 'annualRate'
  | 'insurance.rate'
  | 'otherCharges'
  | 'solcaPercent'
  | 'firstPaymentDate'
  | 'disbursementDate'
  | 'maxRate'
  | 'balance'
  | 'remainingPayments'
  | 'currentPayment'
  | 'nextPaymentDate'
  | 'extraPayment.date'
  | 'extraPayment.amount';

/**
 * `outOfRange` bounds a whole number on both sides; `tooLarge` caps an amount or a percentage
 * that already has its lower bound. `tooSmall` asks for an amount above `min`, what it must
 * cover before it repays any principal. `dateOutOfRange` bounds a date, both ISO dates included.
 */
export type ValidationError =
  | { field: ValidationField; code: 'outOfRange'; params: { min: number; max: number } }
  | { field: ValidationField; code: 'tooLarge'; params: { max: number } }
  | { field: ValidationField; code: 'tooSmall'; params: { min: number } }
  | { field: ValidationField; code: 'dateOutOfRange'; params: { min: string; max: string } }
  | {
      field: ValidationField;
      code: Exclude<ValidationCode, 'outOfRange' | 'tooLarge' | 'tooSmall' | 'dateOutOfRange'>;
    };

export type SimulationWarning = {
  code: 'rateAboveMaximum';
  effectiveRate: number;
  maxRate: number;
};

export type SimulationResult =
  | { ok: true; schedule: Schedule; warnings: SimulationWarning[] }
  | { ok: false; errors: ValidationError[] };

export type ExistingLoanWarning =
  /** The extra payment was more than the loan owed; only `appliedAmount` was applied. */
  | { code: 'extraPaymentClipped'; appliedAmount: number }
  /**
   * French method: the current payment does not repay the balance in the remaining payments.
   * Without the extra payment the loan ends with payment `paymentCount`, of `lastPayment`.
   */
  | { code: 'paymentDoesNotFitTerm'; paymentCount: number; lastPayment: number };

export type ExistingLoanResult =
  | {
      ok: true;
      withoutExtraPayment: RemainingSchedule;
      withExtraPayment: RemainingSchedule;
      extraPayment: AppliedExtraPayment;
      comparison: Comparison;
      warnings: ExistingLoanWarning[];
    }
  | { ok: false; errors: ValidationError[] };
