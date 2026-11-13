import type { InsuranceBase, InsuranceUnit } from '@/core';
import type { Format, FormatLocale } from '@/i18n/format';
import { t, type MessageKey } from '@/i18n/translate';
import type { LoanForm } from './form';

/** The institutions whose published values can fill the advanced options, in the order listed. */
export const INSTITUTION_PRESETS = [
  'pichincha',
  'guayaquil',
  'pacifico',
  'bolivariano',
  'internacional',
  'jep',
  'jardinAzuayo',
] as const;
export type InstitutionPreset = (typeof INSTITUTION_PRESETS)[number];
/** The form's choice: an institution, or none. */
export type PresetChoice = InstitutionPreset | 'none';
export const PRESET_CHOICES: readonly PresetChoice[] = ['none', ...INSTITUTION_PRESETS];

/**
 * What an institution publishes for a consumer loan, in its official documents only: not what its
 * simulator charges, not what can be inferred. A value it does not publish is absent.
 */
interface PublishedValues {
  insurance?: { rate: number; unit: InsuranceUnit };
  insuranceBase?: InsuranceBase;
  solcaPercent?: number;
}

interface PresetSource {
  name: MessageKey;
  values: PublishedValues;
  /** The document the values come from. */
  url: string;
  /** What the note calls that document. */
  document: MessageKey;
  /** ISO date the document was last read. */
  checkedOn: string;
  /** What the document leaves unclear or contradicts, when it does. */
  caveat?: MessageKey;
}

const CHECKED_ON = '2026-11-12';
// More decimals than any document publishes (JEP's 1.0065), so none is cut.
const PUBLISHED_DECIMALS = 10;

const PRESETS: Record<InstitutionPreset, PresetSource> = {
  pichincha: {
    name: 'preset_pichincha',
    values: { insurance: { rate: 1.69, unit: 'perMillePerMonth' } },
    url: 'https://www.pichincha.com/sites/default/files/documents/2026-10/tarifario-web-noviembre-2026.pdf',
    document: 'presetDocument_pichincha',
    checkedOn: CHECKED_ON,
    caveat: 'presetCaveat_pichincha',
  },
  guayaquil: {
    name: 'preset_guayaquil',
    values: { insurance: { rate: 1.8, unit: 'percentPerYear' } },
    url: 'https://assets.ctfassets.net/jhuukrkt1w7q/6ZE5gSTute00w7lxCPOilb/bb243ec833d8c434653b0023a35923a3/TARIFARIO_JUNIO_2026.pdf',
    document: 'presetDocument_guayaquil',
    checkedOn: CHECKED_ON,
    caveat: 'presetCaveat_guayaquil',
  },
  pacifico: {
    name: 'preset_pacifico',
    values: { insuranceBase: 'balance' },
    url: 'https://www.bancodelpacifico.com/BancoPacifico/media/pdf/TranspInformacion/2026/Operaciones_Credito.pdf',
    document: 'presetDocument_pacifico',
    checkedOn: CHECKED_ON,
    caveat: 'presetCaveat_pacifico',
  },
  bolivariano: {
    name: 'preset_bolivariano',
    values: { insurance: { rate: 0.7, unit: 'perMillePerMonth' } },
    url: 'https://portalbb-multimedia.bolivariano.com/docs/default-source/general-pdf/gobierno-corporativo/transparencia-de-la-informaci%C3%B3n/estado-financiero-tarifario-iv-trimestre.pdf',
    document: 'presetDocument_bolivariano',
    checkedOn: CHECKED_ON,
    caveat: 'presetCaveat_bolivariano',
  },
  internacional: {
    name: 'preset_internacional',
    // Published as 4.1 per mille a year; the panel has no per-mille-a-year unit.
    values: {
      insurance: { rate: 0.41, unit: 'percentPerYear' },
      insuranceBase: 'originalAmount',
    },
    url: 'https://www.bancointernacional.com.ec/wp-content/uploads/2026/11/TarifarioNuevoFormatoPizarraMarcadeAguanov26.pdf',
    document: 'presetDocument_internacional',
    checkedOn: CHECKED_ON,
    caveat: 'presetCaveat_internacional',
  },
  jep: {
    name: 'preset_jep',
    values: { insurance: { rate: 1.0065, unit: 'percentPerYear' }, insuranceBase: 'balance' },
    url: 'https://www.jep.coop/documents/20182/0/CostosFinancierosNoviembre2026.pdf/',
    document: 'presetDocument_jep',
    checkedOn: CHECKED_ON,
  },
  jardinAzuayo: {
    name: 'preset_jardinAzuayo',
    values: { solcaPercent: 0.5 },
    url: 'https://www.jardinazuayo.fin.ec/wp-content/uploads/2026/11/Pizarra-Informativa-6-noviembre-2026.pdf',
    document: 'presetDocument_jardinAzuayo',
    checkedOn: CHECKED_ON,
    caveat: 'presetCaveat_jardinAzuayo',
  },
};

/** The advanced options a preset can fill, as the note names those it leaves untouched. */
const PRESET_FIELDS = [
  'insurance',
  'insuranceBase',
  'insuranceInPayment',
  'otherCharges',
  'solca',
  'dayCount',
] as const;
type PresetField = (typeof PRESET_FIELDS)[number];

function publishedFields(values: PublishedValues): ReadonlySet<PresetField> {
  const fields = new Set<PresetField>();
  if (values.insurance) fields.add('insurance');
  if (values.insuranceBase) fields.add('insuranceBase');
  if (values.solcaPercent !== undefined) fields.add('solca');
  return fields;
}

/** A published number as the user would type it: every decimal kept, no grouping. */
function typed(value: number, locale: FormatLocale): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: PUBLISHED_DECIMALS,
    useGrouping: false,
  }).format(value);
}

/** The display name of a choice: "None", or the institution's name. */
export function presetName(choice: PresetChoice): string {
  return t(choice === 'none' ? 'preset_none' : PRESETS[choice].name);
}

/**
 * The form changes that choosing `choice` makes: the advanced options the institution publishes a
 * value for, and nothing else, so what the user typed in the others stays. "None" only clears the
 * choice.
 */
export function presetChanges(choice: PresetChoice, locale: FormatLocale): Partial<LoanForm> {
  const changes: Partial<LoanForm> = { institutionPreset: choice };
  if (choice === 'none') return changes;
  const { insurance, insuranceBase, solcaPercent } = PRESETS[choice].values;
  if (insurance) {
    changes.insuranceRate = typed(insurance.rate, locale);
    changes.insuranceUnit = insurance.unit;
  }
  if (insuranceBase) changes.insuranceBase = insuranceBase;
  if (solcaPercent !== undefined) {
    changes.solcaEnabled = true;
    changes.solcaPercent = typed(solcaPercent, locale);
  }
  return changes;
}

/** What the note under the choice says about an institution's values, and where to check them. */
export interface PresetNote {
  /** "Banco Pichincha publishes: credit life insurance 1.69 ‰ per month." */
  published: string;
  /** The fields it does not publish, left as the user had them. */
  unpublished: string;
  caveat: string | null;
  /** The document, and when it was read. */
  source: string;
  url: string;
}

export function presetNote(
  preset: InstitutionPreset,
  locale: FormatLocale,
  format: Format,
): PresetNote {
  const { name, values, url, document, checkedOn, caveat } = PRESETS[preset];
  const list = (items: string[]) =>
    new Intl.ListFormat(locale, { type: 'conjunction' }).format(items);
  const published: string[] = [];
  if (values.insurance) {
    const { rate, unit } = values.insurance;
    published.push(
      t('presetValue_insurance', [`${typed(rate, locale)} ${t(`insuranceUnit_${unit}`)}`]),
    );
  }
  if (values.insuranceBase) published.push(t(`presetValue_insuranceBase_${values.insuranceBase}`));
  if (values.solcaPercent !== undefined) {
    published.push(t('presetValue_solca', [format.percent(values.solcaPercent)]));
  }
  const filled = publishedFields(values);
  const unpublished = PRESET_FIELDS.filter((field) => !filled.has(field)).map((field) =>
    t(`presetField_${field}`),
  );
  return {
    published: t('presetNote_published', [t(name), list(published)]),
    unpublished: t('presetNote_unpublished', [list(unpublished)]),
    caveat: caveat ? t(caveat) : null,
    source: t('presetNote_source', [t(document), format.date(checkedOn)]),
    url,
  };
}
