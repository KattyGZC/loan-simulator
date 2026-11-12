/**
 * A term the glossary defines; its name, definition and example are the messages
 * `glossaryTerm_*`, `glossaryDefinition_*` and `glossaryExample_*`.
 */
export type GlossaryTerm =
  | 'principal'
  | 'interest'
  | 'term'
  | 'installment'
  | 'balance'
  | 'schedule'
  | 'amortization'
  | 'nominalRate'
  | 'effectiveRate'
  | 'maxRate'
  | 'dayCount'
  | 'creditLifeInsurance'
  | 'solca'
  | 'otherCharges'
  | 'totalCost'
  | 'disbursement'
  | 'dueDate'
  | 'extraPayment';

/** A heading of the glossary; its text is the message `glossaryGroup_*`. */
export type GlossaryGroup = 'basics' | 'rate' | 'charges' | 'dates';

/** Every term, under its heading, in the order a loan raises them: basics first. */
export const GLOSSARY: readonly { group: GlossaryGroup; terms: readonly GlossaryTerm[] }[] = [
  {
    group: 'basics',
    terms: ['principal', 'interest', 'term', 'installment', 'balance', 'schedule', 'amortization'],
  },
  { group: 'rate', terms: ['nominalRate', 'effectiveRate', 'maxRate', 'dayCount'] },
  { group: 'charges', terms: ['creditLifeInsurance', 'solca', 'otherCharges', 'totalCost'] },
  { group: 'dates', terms: ['disbursement', 'dueDate', 'extraPayment'] },
];
