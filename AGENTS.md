# Coding standard: Loan Simulator

Read this before the first edit. It binds every author and every model (Claude, Cursor, Copilot or another). `README.md` is the product contract: inputs, outputs and formulas. If code, a test or an idea contradicts it, stop and say so. Do not change how a payment is computed to make a test pass.

## Where things are

| Path | What it holds |
|---|---|
| `src/core/` | The calculation engine. Pure TypeScript, no browser APIs. Public API in `src/core/index.ts` |
| `src/core/types.ts` | Every input, output, warning and error code of the engine |
| `src/i18n/` | UI text (`t()` over `chrome.i18n`), `Intl` formatting, and reading typed numbers |
| `public/_locales/{en,es}/messages.json` | Every UI string, in English and Spanish. English is the fallback. `MessageKey` (`src/i18n/translate.ts`) is the key list of the English file |
| `src/entrypoints/background.ts` | Opens the side panel when the toolbar icon is clicked |
| `src/entrypoints/sidepanel/` | The UI (Preact), two tabs: a new loan (`NewLoan.tsx`) and an extra payment on a loan you already have (`ExistingLoan.tsx`). `form.ts` and `existing-form.ts` hold the panel logic, unit-tested: typed form to engine input, and what the results area shows (`panelState`, `existingLoanState`). The components lay out and format; which error a field shows now is `visibleError()`, in `form.ts` |
| `src/storage/` | What the panel keeps in `browser.storage.local`, each as `{ schemaVersion, data }` (`versioned.ts`): each tab's draft (`drafts.ts`), the saved scenarios (`scenarios.ts`) and the preferences (`preferences.ts`). `storedFields()` reads stored data back without trusting it; each form's `restore…Form()` (`form.ts`, `existing-form.ts`), `restoreScenarios()` (`saved-scenarios.ts`) and `restorePreferences()` (`sidepanel/preferences.ts`) fall back to the default for a field that is missing or invalid. The option lists of each select are in `sidepanel/choices.ts` |
| `tests/core/` | Unit tests of the engine, through `simulate()` or the module's export |
| `tests/i18n/` | Tests of `src/i18n/`. `fake-i18n.ts` stands in for `chrome.i18n` over the real `messages.json` |
| `tests/storage/` | Tests of `src/storage/`, over WXT's fake browser |
| `tests/sidepanel/` | Tests of the side panel forms (`form.ts`, `existing-form.ts`) |
| `tests/golden/` | Reference schedules copied from real simulators, with their source |
| `wxt.config.ts` | Manifest: name, permissions (`storage`, `sidePanel`), side panel |

## Status

Done: project setup (phase 0), the calculation engine (phase 1), tested against Cooperativa JEP, languages and formatting (phase 2), the side panel UI (phase 3), the day-count basis (30/360 or actual days/360), and an extra payment on a loan you already have (`simulateExistingLoan()`, second tab), both tested against a Produbanco statement. Each tab keeps its form as a draft when the panel closes. New-loan scenarios are saved, opened, renamed, deleted and compared two at a time in a third tab (`Scenarios.tsx`, logic in `saved-scenarios.ts`). Preferences (currency, and how SOLCA starts on a new loan) open from a header button (phase 4 done).

Next, in order:

1. **CSV export and print view.**
2. **Accessibility, dark theme, final icons.**
3. **QA:** Playwright e2e and a manual check against 3 institutions.
4. **Chrome Web Store** listing, privacy page and release workflow.

After v1, not planned: total effective cost (IRR), non-monthly payments, grace periods, Firefox.

## Decisions the code relies on

Do not reverse one of these in passing. If a change needs to, say so first.

- **Generic engine.** The user enters every value. No rates, maximum rates or institutions are hardcoded: they change too often.
- **Inputs as published.** `15.6` means 15.6 %, and the per-mille insurance unit means ‰. The engine converts to fractions; the UI passes what the user typed.
- **Day count.** `thirty360` by default: every payment charges the monthly rate (nominal / 12). `actual360` charges `nominal × days / 360` from the previous due date, or from `disbursementDate` for the first payment, and needs both dates. Only there does a weekend due date move to Monday (`weekdayOnOrAfter`); holidays are not known. The German principal is always balance / payments. The French payment uses the closed annuity under 30/360 (`calendar.fixedRate`) and, with actual days, the annuity over each period's rate, also when an extra payment reschedules; a payment from nominal / 12 there left a last payment ~9× the others on 20 years. Dates must fall in 1900–2100. Banco Guayaquil uses actual days / 365, so it is not a golden reference.
- **Rounding.** Every row value is rounded to cents, half away from zero, with `roundMoney`. The rounded balance carries over, and the last payment takes what is left so the balance ends at exactly 0.
- **Insurance inside the French payment by default.** The annuity uses interest rate + insurance rate, as most credit unions do. `onTopOfInstallment` adds it on top instead.
- **Extra payments only on a loan already running.** `simulate()` has none; `simulateExistingLoan()` takes one, on a date from the last due date paid up to the day before the last payment. It pays the interest accrued since that due date first (a day's interest rounded to cents, times the days, as Produbanco does), then the principal the payment it falls before was going to repay, then part of the balance. That payment repays on its due date only the principal the extra payment left and charges the interest for the days left; only an extra payment beyond its principal reschedules the payments after it, so an extra payment never costs more than none. Under 30/360 every period counts 30 days and a month's last day is the 30th (`days360Between`, `splitPeriod`). Its row holds the extra payment, as a statement does. Under French the current payment the user enters sets every payment but the last; the remaining payments only check it (`paymentDoesNotFitTerm`). Insurance on a running loan is on the balance. An extra payment above what the loan owes is clipped and pays it off on its date, with a warning.
- **No hidden defaults in the engine.** No SOLCA, no dates and 30/360 unless the input says otherwise. "SOLCA on, 0.5 %" (the user's preference, `defaultPreferences()`), "paid out today" and "first payment one month from today" belong to the UI. The engine never reads the clock.
- **Errors are codes.** `validate()` and `validateExistingLoan()` return `{ field, code }`, plus `params: { min, max }` for `outOfRange`, `params: { max }` for `tooLarge`, `params: { min }` for `tooSmall` (a current payment or extra payment that would repay no principal) and ISO-date `params: { min, max }` for `dateOutOfRange` (an extra payment outside the loan). `simulateExistingLoan()` checks those last two after the field checks, because they depend on the schedule. With actual days, a first payment on or before the disbursement is `notAfterDisbursement`. The UI turns them into text with `validationMessage()`.
- **Empty fields.** `LoanInput` has no empty number. The form (`form.ts`) passes `NaN` for an empty field so `validate()` still checks the others, then reports that field as `required`. A `required` error shows only on an empty field the user has typed in and left at least once (`visibleError`): showing it on the first blur moved the page under the click that left the field; the results show the empty state while amount, term or rate is missing.
- **Two languages.** English and Spanish via `chrome.i18n`, following the browser language, English as the fallback. Every string the user sees comes from `messages.json` through `t()`.
- **Format locale.** Spanish formats as `es-EC` (`$1.234,56`, `31/01/2027`) and anything else as `en-US`. Region-less `es` and `es-419` would print `1234,56 US$` and `USD 1,234.56`. Currency is the user's preference, USD by default, from `CURRENCIES` (`src/i18n/format.ts`): only currencies with cents, always shown with 2 decimals, because the engine rounds to cents. It changes how amounts are written, never their value. The panel's `format` (`sidepanel/locale.ts`) follows it through `showAmountsIn()`, which `App` calls as it renders.
- **Typed numbers.** `parseDecimal()` accepts `,` or `.` as the decimal separator. The only ambiguous case, one separator after 1–3 digits not starting with 0 (maybe space-grouped) and before exactly three (`10.000`, `1 000.000`), follows the locale's decimal separator. Spaces inside only group thousands. Empty text is `undefined` and unreadable text `NaN`, so `validate()` reports them.
- **Privacy.** Permissions are `storage` and `sidePanel` only. No host permissions, no network calls.

## Before the first edit

Write one sentence: what the user sees after the change, or what the engine returns that it did not before. If it is vague, do not code yet.

Every claim the change depends on needs an artifact from this session: a file and line, a test, a command's output. "I did not find X" is a gap to report, not permission to add X.

Smallest change that solves the cause. Do not refactor nearby code in the same change.

## Architecture

- `src/core/` imports nothing outside `src/core/`. No `browser`, `chrome`, `wxt/*`, DOM, `Date.now()`, `new Date()` without arguments or `Math.random()`. WXT auto-imports `browser` everywhere; ESLint (`eslint.config.js`) rejects it, and the rest of this list, in `src/core/`.
- The UI and storage import the engine from `@/core` only, never from a file inside it.
- No text in components: every label, message and title comes from `t()`. A key added in English is added in Spanish in the same change.
- The engine is the only place that computes money. The UI formats and displays; it does not add, round or derive amounts.
- One concept, one name, everywhere. If the type says `onTopOfInstallment`, the engine does not call it `insuranceOnTop` and `insuranceInInstallment`.

## Code speaks for itself

- Names carry the unit and the meaning: `annualRatePercent`, `monthlyRate` (fraction), `paymentNumber`, `lastPaymentNumber`. A reader should not have to open another file to know whether `15.6` or `0.156` goes in.
- A function does one thing at one level of abstraction. When a function needs a paragraph to explain what it does, split it and let the names say it.
- Prefer plain control flow over clever idioms. A loop whose condition mutates the array it reads is a function waiting to be extracted.
- No boolean pairs or nullable pairs that describe one state. Use a discriminated union (`{ ok: true, ... } | { ok: false, ... }`).
- Magic numbers become named constants next to their use (`MAX_TERM_MONTHS`, `TERM_EPSILON`). Closed sets are string-literal unions in `types.ts`.

## Comments

- JSDoc on exported functions and types when the name and signature cannot say it (units, edge cases, which payment a value belongs to).
- An inline comment only for a *why* that cannot become a name: a float tolerance, an external quirk with its source.
- Never: comments that repeat the code, section separators, `TODO`/`FIXME`, commented-out code, or references to files that are not in the repo (`DECISIONS/` is local and git-ignored).

## Types

- `strict` TypeScript. No `any`. No `as` in `src/` except `as const`; parse or narrow instead.
- Absence is `undefined` (optional) or `null`, never a sentinel value.
- Function inputs that are not changed are `readonly`.

## Money and numbers

- Round amounts only with `roundMoney`. No `toFixed`, `Math.round(x * 100)` or `Intl` rounding inside `src/core/`.
- Rates are converted between percent and fraction in one place, by a named function, not with `/ 100` scattered around.

## Tests

- Test behavior through `simulate()` or the module's export, not private state.
- Every new behavior has its edge or negative case: 0 %, one payment, the last payment, an extra payment that ends the loan, an invalid field.
- When the engine's math changes, the golden cases in `tests/golden/` must still pass. A new reference case records its source, date and the constant that source actually uses.
- Coverage of `src/core/`, `src/i18n/` and the side panel logic stays at 95 % or more (`vitest.config.ts`, enforced in CI).
- Tests live in `tests/**/*.test.ts`. A file outside that glob never runs.

## Docs

- `README.md` and `README.es.md` change together, in the same commit.
- A change to a formula or a default updates "How it's calculated" in both READMEs.
- When a phase closes, update "Status" above.

## Before presenting work

`npm run check` exits 0. It runs what CI runs: lint, format check, typecheck, tests with coverage, and build.

Then run the `self-grade` and `tech-audit` skills (`.claude/skills/`). Fix and re-run until every applicable self-grade row is **A** and the audit says **SHIP**. Only then propose commits.

## Git

- Never work on `main`. Branch first: `feat/`, `fix/`, `refactor/`, `test/`, `docs/`, `chore/`, `ci/`.
- Conventional commits (`feat(core): ...`). Large changes go in several commits, one per layer (engine, tests, UI, docs).
- Show the commit plan and wait for an OK before committing.
- PR description: **What**, **Why**, **How**, **Verification** (commands run and their result). No co-author or tool attribution lines.
- One concern per PR.
