import { useId, useRef, useState } from 'preact/hooks';
import type { LoanSummary } from '@/core';
import { t, type MessageKey } from '@/i18n/translate';
import { CheckboxField, TextField } from './fields';
import { hasFixedPayment } from './form';
import { format, locale } from './locale';
import { useFocusAfterRender } from './useFocusAfterRender';
import { MAX_COMPARED, scenarioSummary, toggleCompared, type Scenario } from './saved-scenarios';

interface ScenariosProps {
  scenarios: readonly Scenario[];
  onOpen: (scenario: Scenario) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}

/** The saved scenarios, and the two the user checked side by side. */
export function Scenarios({ scenarios, onOpen, onRename, onRemove }: ScenariosProps) {
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const titleId = useId();
  const hintId = useId();
  const deleteId = useId();
  const deleteButtonId = (scenario: Scenario) => `${deleteId}-${scenario.id}`;
  const focusAfterRender = useFocusAfterRender();
  // A deleted scenario drops out of the comparison.
  const compared = comparedIds.flatMap((id) => scenarios.filter((scenario) => scenario.id === id));
  // The focus moves to the Delete button of the scenario that takes the deleted one's place, or
  // of the one before it; to the title of the empty list when none is left.
  const remove = (index: number) => {
    const remaining = scenarios.filter((_, position) => position !== index);
    const next = remaining[Math.min(index, remaining.length - 1)];
    const deleted = scenarios[index];
    if (deleted) onRemove(deleted.id);
    focusAfterRender(() => document.getElementById(next ? deleteButtonId(next) : titleId));
  };

  if (scenarios.length === 0) {
    return (
      <section class="empty-state" aria-labelledby={titleId}>
        <h2 id={titleId} tabIndex={-1}>
          {t('scenarios_emptyTitle')}
        </h2>
        <p>{t('scenarios_emptyBody')}</p>
      </section>
    );
  }
  return (
    <>
      <section aria-labelledby={titleId}>
        <h2 id={titleId}>{t('section_savedScenarios')}</h2>
        <p id={hintId} class="note">
          {t('scenarios_compareHint')}
        </p>
        <ul class="scenario-list">
          {scenarios.map((scenario, index) => {
            const isCompared = compared.includes(scenario);
            return (
              <ScenarioItem
                key={scenario.id}
                scenario={scenario}
                compared={isCompared}
                canCompare={isCompared || compared.length < MAX_COMPARED}
                compareHintId={hintId}
                deleteButtonId={deleteButtonId(scenario)}
                onToggleCompared={() => setComparedIds(toggleCompared(comparedIds, scenario.id))}
                onOpen={() => onOpen(scenario)}
                onRename={(name) => onRename(scenario.id, name)}
                onRemove={() => remove(index)}
              />
            );
          })}
        </ul>
      </section>
      {compared.length === MAX_COMPARED && <ScenarioComparison scenarios={compared} />}
    </>
  );
}

interface ScenarioItemProps {
  scenario: Scenario;
  compared: boolean;
  canCompare: boolean;
  /** The hint that says why a scenario cannot be checked once two are. */
  compareHintId: string;
  deleteButtonId: string;
  onToggleCompared: () => void;
  onOpen: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}

/** One scenario: its checkbox to compare it and its actions, or the field that renames it. */
function ScenarioItem(props: ScenarioItemProps) {
  const { scenario } = props;
  // Null unless the user is renaming the scenario.
  const [newName, setNewName] = useState<string | null>(null);
  const renameButton = useRef<HTMLButtonElement>(null);
  const focusAfterRender = useFocusAfterRender();
  const stopRenaming = () => {
    setNewName(null);
    focusAfterRender(() => renameButton.current);
  };

  if (newName !== null) {
    return (
      <li class="scenario">
        <TextField
          label={t('field_scenarioName')}
          value={newName}
          onInput={setNewName}
          focusOnMount
        />
        <div class="actions">
          <button
            type="button"
            class="button primary"
            disabled={newName.trim() === ''}
            onClick={() => {
              props.onRename(newName);
              stopRenaming();
            }}
          >
            {t('button_saveName')}
          </button>
          <button type="button" class="button" onClick={stopRenaming}>
            {t('button_cancel')}
          </button>
        </div>
      </li>
    );
  }
  return (
    <li class="scenario">
      <CheckboxField
        label={scenario.name}
        checked={props.compared}
        disabled={!props.canCompare}
        describedBy={props.canCompare ? undefined : props.compareHintId}
        onChange={props.onToggleCompared}
      />
      <div class="actions" role="group" aria-label={scenario.name}>
        <button type="button" class="button" onClick={props.onOpen}>
          {t('button_open')}
        </button>
        <button
          ref={renameButton}
          type="button"
          class="button"
          onClick={() => setNewName(scenario.name)}
        >
          {t('button_rename')}
        </button>
        <button id={props.deleteButtonId} type="button" class="button" onClick={props.onRemove}>
          {t('button_delete')}
        </button>
      </div>
    </li>
  );
}

interface ComparisonLine {
  label: MessageKey;
  value: (summary: LoanSummary, scenario: Scenario) => string;
}

/** The one payment of a fixed-payment loan, or its first and last. */
function paymentText(summary: LoanSummary, scenario: Scenario): string {
  if (hasFixedPayment(scenario.form, summary)) return format.money(summary.firstPayment);
  return t('paymentRange', [format.money(summary.firstPayment), format.money(summary.lastPayment)]);
}

const COMPARISON_LINES: readonly ComparisonLine[] = [
  { label: 'summary_payment', value: paymentText },
  { label: 'summary_paymentCount', value: (summary) => format.integer(summary.paymentCount) },
  { label: 'summary_effectiveRate', value: (summary) => format.percent(summary.effectiveRate) },
  { label: 'summary_totalInterest', value: (summary) => format.money(summary.totalInterest) },
  { label: 'summary_totalCost', value: (summary) => format.money(summary.totalCost) },
  { label: 'summary_totalPaid', value: (summary) => format.money(summary.totalPaid) },
];

/** Two scenarios side by side, one column each. */
function ScenarioComparison({ scenarios }: { scenarios: readonly Scenario[] }) {
  const titleId = useId();
  const columns = scenarios.map((scenario) => ({
    scenario,
    summary: scenarioSummary(scenario, locale),
  }));
  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId}>{t('section_scenarioComparison')}</h2>
      <table class="comparison" aria-labelledby={titleId}>
        <thead>
          <tr>
            <td />
            {columns.map(({ scenario }) => (
              <th key={scenario.id} scope="col">
                {scenario.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_LINES.map(({ label, value }) => (
            <tr key={label}>
              <th scope="row">{t(label)}</th>
              {columns.map(({ scenario, summary }) => (
                <td key={scenario.id}>
                  {summary ? value(summary, scenario) : t('scenario_cannotSimulate')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
