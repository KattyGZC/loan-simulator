import { describe, expect, it } from 'vitest';
import { defaultForm, type LoanForm } from '@/entrypoints/sidepanel/form';
import {
  defaultScenarioName,
  MAX_COMPARED,
  removeScenario,
  renameScenario,
  restoreScenarios,
  scenarioSummary,
  toggleCompared,
  type Scenario,
} from '@/entrypoints/sidepanel/saved-scenarios';

const TODAY = '2026-10-27';
const defaults = defaultForm(TODAY, 'en-US');

function loanForm(overrides: Partial<LoanForm> = {}): LoanForm {
  return { ...defaults, amount: '10000', termMonths: '12', annualRate: '15.6', ...overrides };
}

const jep: Scenario = { id: 'jep', name: 'JEP – Consumo', form: loanForm({ institution: 'JEP' }) };
const bank: Scenario = {
  id: 'bank',
  name: 'Bank – Consumer',
  form: loanForm({ annualRate: '16' }),
};

describe('defaultScenarioName', () => {
  it('joins institution and segment', () => {
    expect(defaultScenarioName({ institution: 'JEP', segment: 'Consumo' })).toBe('JEP – Consumo');
  });

  it('uses either alone when the other is empty', () => {
    expect(defaultScenarioName({ institution: ' JEP ', segment: '' })).toBe('JEP');
    expect(defaultScenarioName({ institution: '', segment: 'Consumo' })).toBe('Consumo');
  });

  it('is empty when both are', () => {
    expect(defaultScenarioName({ institution: ' ', segment: '' })).toBe('');
  });
});

describe('restoreScenarios', () => {
  it('restores the scenarios it saved', () => {
    expect(restoreScenarios(JSON.parse(JSON.stringify([jep, bank])), defaults)).toEqual([
      jep,
      bank,
    ]);
  });

  it('has none when nothing was stored or it is not a list', () => {
    expect(restoreScenarios(undefined, defaults)).toEqual([]);
    expect(restoreScenarios({ id: 'jep' }, defaults)).toEqual([]);
  });

  it('drops a scenario without an id or a name', () => {
    const stored = [{ name: 'No id', form: {} }, { id: 'x', name: '  ', form: {} }, 'jep', jep];
    expect(restoreScenarios(stored, defaults)).toEqual([jep]);
  });

  it('fills a form field the scenario lacks with its default', () => {
    const [restored] = restoreScenarios(
      [{ id: 'a', name: 'A', form: { amount: '5000' } }],
      defaults,
    );
    expect(restored!.form).toEqual({ ...defaults, amount: '5000' });
  });
});

describe('renameScenario', () => {
  it('renames only the scenario with that id, trimmed', () => {
    expect(renameScenario([jep, bank], 'bank', '  Pichincha ')).toEqual([
      jep,
      { ...bank, name: 'Pichincha' },
    ]);
  });

  it('keeps the name it had when the new one is blank', () => {
    expect(renameScenario([jep], 'jep', '   ')).toEqual([jep]);
  });
});

describe('removeScenario', () => {
  it('removes only the scenario with that id', () => {
    expect(removeScenario([jep, bank], 'jep')).toEqual([bank]);
  });

  it('changes nothing for an unknown id', () => {
    expect(removeScenario([jep], 'other')).toEqual([jep]);
  });
});

describe('toggleCompared', () => {
  it('checks and unchecks a scenario', () => {
    expect(toggleCompared([], 'jep')).toEqual(['jep']);
    expect(toggleCompared(['jep', 'bank'], 'jep')).toEqual(['bank']);
  });

  it(`compares at most ${MAX_COMPARED}`, () => {
    expect(toggleCompared(['jep', 'bank'], 'third')).toEqual(['jep', 'bank']);
  });
});

describe('scenarioSummary', () => {
  it('simulates the scenario', () => {
    expect(scenarioSummary(jep, 'en-US')).toMatchObject({ paymentCount: 12 });
  });

  it('is null when the form no longer simulates', () => {
    expect(scenarioSummary({ ...jep, form: loanForm({ amount: '' }) }, 'en-US')).toBeNull();
  });
});
