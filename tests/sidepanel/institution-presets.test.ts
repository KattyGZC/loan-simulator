import { beforeEach, describe, expect, it } from 'vitest';
import { defaultForm, restoreLoanForm } from '@/entrypoints/sidepanel/form';
import {
  INSTITUTION_PRESETS,
  presetChanges,
  presetName,
  presetNote,
} from '@/entrypoints/sidepanel/institution-presets';
import { createFormat } from '@/i18n/format';
import { useLocale } from '../i18n/fake-i18n';

const TODAY = '2026-11-12';
const english = createFormat('en-US', 'USD');
const spanish = createFormat('es-EC', 'USD');

beforeEach(() => useLocale('en'));

describe('presetChanges', () => {
  it('fills the insurance an institution publishes, written as the locale types it', () => {
    expect(presetChanges('jep', 'es-EC')).toEqual({
      institutionPreset: 'jep',
      insuranceRate: '1,0065',
      insuranceUnit: 'percentPerYear',
      insuranceBase: 'balance',
    });
  });

  it('changes no field the institution does not publish', () => {
    expect(presetChanges('pacifico', 'en-US')).toEqual({
      institutionPreset: 'pacifico',
      insuranceBase: 'balance',
    });
  });

  it('keeps what the user typed in a field the next institution does not publish', () => {
    const typed = { ...defaultForm(TODAY, 'en-US'), insuranceRate: '0.9', otherCharges: '3' };
    const form = { ...typed, ...presetChanges('pacifico', 'en-US') };
    expect(form.insuranceRate).toBe('0.9');
    expect(form.otherCharges).toBe('3');
  });

  it('turns SOLCA on at the rate an institution publishes, even when the user turned it off', () => {
    expect(presetChanges('jardinAzuayo', 'es-EC')).toEqual({
      institutionPreset: 'jardinAzuayo',
      solcaEnabled: true,
      solcaPercent: '0,5',
    });
  });

  it('only clears the choice for none, keeping what the fields hold', () => {
    expect(presetChanges('none', 'en-US')).toEqual({ institutionPreset: 'none' });
  });
});

describe('presetNote', () => {
  it('says what the institution publishes, what it leaves out, and where it says so', () => {
    expect(presetNote('internacional', 'en-US', english)).toEqual({
      published:
        'Banco Internacional publishes: credit life insurance 0.41% per year and insurance on the original amount.',
      unpublished:
        'It does not publish whether insurance is in the payment, other charges, SOLCA, and the day count: those fields keep what they had, so check them.',
      caveat:
        'It publishes 4.1 per mille a year, written here as 0.41% per year, for the borrower alone; with a spouse, 6.5 per mille. Its example, $41 on $10,000 over 12 months, charges it on the original amount.',
      source:
        'Source: its tariff of November 2026, third-party costs, read on 11/12/2026. The values may have changed, and what it charges may differ from what it publishes: check them against the source and your offer.',
      url: 'https://www.bancointernacional.com.ec/wp-content/uploads/2026/11/TarifarioNuevoFormatoPizarraMarcadeAguanov26.pdf',
    });
  });

  it('names a published SOLCA and has no caveat when the source leaves nothing unclear', () => {
    useLocale('es');
    expect(presetNote('jardinAzuayo', 'es-EC', spanish).published).toBe(
      'Cooperativa Jardín Azuayo publica: SOLCA 0,5%.',
    );
    expect(presetNote('jep', 'es-EC', spanish).caveat).toBeNull();
  });

  it('links every institution to an official https document, read on a date it shows', () => {
    for (const preset of INSTITUTION_PRESETS) {
      const note = presetNote(preset, 'en-US', english);
      expect(new URL(note.url).protocol).toBe('https:');
      expect(note.source).toContain('read on 11/12/2026');
    }
  });
});

describe('presetName', () => {
  it('names none and each institution', () => {
    expect(presetName('none')).toBe('No institution');
    expect(presetName('guayaquil')).toBe('Banco Guayaquil');
  });
});

describe('the choice in a saved form', () => {
  it('comes back from a draft, and falls back to none when unknown', () => {
    const defaults = defaultForm(TODAY, 'en-US');
    expect(restoreLoanForm({ institutionPreset: 'jep' }, defaults).institutionPreset).toBe('jep');
    expect(restoreLoanForm({ institutionPreset: 'nope' }, defaults).institutionPreset).toBe('none');
  });
});
