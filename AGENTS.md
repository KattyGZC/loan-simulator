# Coding standard: Loan Simulator

Read this before the first edit. It binds every author and every model (Claude, Cursor, Copilot or another). `README.md` is the product contract: inputs, outputs and formulas. If code, a test or an idea contradicts it, stop and say so. Do not change how a payment is computed to make a test pass.

## Where things are

| Path | What it holds |
|---|---|
| `src/core/` | The calculation engine. Pure TypeScript, no browser APIs. Public API in `src/core/index.ts` |
| `src/core/types.ts` | Every input, output, warning and error code of the engine |
| `src/entrypoints/background.ts` | Opens the side panel when the toolbar icon is clicked |
| `src/entrypoints/sidepanel/` | The UI (Preact). Only a placeholder today |
| `tests/core/` | Unit tests of the engine, through `simulate()` or the module's export |
| `tests/golden/` | Reference schedules copied from real simulators, with their source |
| `wxt.config.ts` | Manifest: name, permissions (`storage`, `sidePanel`), side panel |

## Status

Done: project setup (phase 0) and the calculation engine (phase 1), tested against Cooperativa JEP.

Next, in order:

1. **Languages and formatting.** `public/_locales/en` and `es`, a `t(key, substitutions)` helper over `chrome.i18n`, `Intl` formatting for money, percent and dates, and parsing numbers typed with `,` or `.`. A test fails when a key exists in one language and not the other. One message per validation code.
2. **Side panel UI.** Required fields, an "Advanced options" section, recompute while typing, summary, amortization table, extra-payment editor, comparison, max-rate warning, empty state.
3. **Saved scenarios and preferences** (`src/storage/`), with a `schemaVersion`.
4. **CSV export and print view.**
5. **Accessibility, dark theme, final icons.**
6. **QA:** Playwright e2e and a manual check against 3 institutions.
7. **Chrome Web Store** listing, privacy page and release workflow.

After v1, not planned: total effective cost (IRR), non-monthly payments, actual-day bases, grace periods, Firefox.

## Decisions the code relies on

Do not reverse one of these in passing. If a change needs to, say so first.

- **Generic engine.** The user enters every value. No rates, maximum rates or institutions are hardcoded: they change too often.
- **Inputs as published.** `15.6` means 15.6 %, and the per-mille insurance unit means ‰. The engine converts to fractions; the UI passes what the user typed.
- **30/360 basis.** Monthly rate = nominal annual rate / 12. Banco Guayaquil uses actual days / 365, so it is not a golden reference.
- **Rounding.** Every row value is rounded to cents, half away from zero, with `roundMoney`. The rounded balance carries over, and the last payment takes what is left so the balance ends at exactly 0.
- **Insurance inside the French payment by default.** The annuity uses interest rate + insurance rate, as most credit unions do. `onTopOfInstallment` adds it on top instead.
- **Extra payments.** One larger than the balance is clipped to the balance; one due after the loan ended is ignored. Both return a warning, not an error.
- **No hidden defaults in the engine.** No SOLCA and no first-payment date unless the input sets them. "SOLCA on, 0.5 %" and "one month from today" belong to the UI. The engine never reads the clock.
- **Errors are codes.** `validate()` returns `{ field, code, params }`. The UI turns them into text in the user's language.
- **Privacy.** Permissions are `storage` and `sidePanel` only. No host permissions, no network calls.

## Before the first edit

Write one sentence: what the user sees after the change, or what the engine returns that it did not before. If it is vague, do not code yet.

Every claim the change depends on needs an artifact from this session: a file and line, a test, a command's output. "I did not find X" is a gap to report, not permission to add X.

Smallest change that solves the cause. Do not refactor nearby code in the same change.

## Architecture

- `src/core/` imports nothing outside `src/core/`. No `browser`, `chrome`, `wxt/*`, DOM, `Date.now()`, `new Date()` without arguments or `Math.random()`. WXT auto-imports `browser` everywhere; ESLint (`eslint.config.js`) rejects it, and the rest of this list, in `src/core/`.
- The UI and storage import the engine from `@/core` only, never from a file inside it.
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
- Coverage of `src/core/` stays at 95 % or more (`vitest.config.ts`, enforced in CI).
- Tests live in `tests/**/*.test.ts`. A file outside that glob never runs.

## Docs

- `README.md` and `README.es.md` change together, in the same commit.
- A change to a formula or a default updates "How it's calculated" in both READMEs.
- When a phase closes, update "Status" above.

## Before presenting work

`npm run check` exits 0. It runs what CI runs: lint, format check, typecheck, tests with coverage, and build.

Then run the `self-grade` skill (`.claude/skills/self-grade/`).

## Git

- Never work on `main`. Branch first: `feat/`, `fix/`, `refactor/`, `test/`, `docs/`, `chore/`, `ci/`.
- Conventional commits (`feat(core): ...`). Large changes go in several commits, one per layer (engine, tests, UI, docs).
- Show the commit plan and wait for an OK before committing.
- PR description: **What**, **Why**, **How**, **Verification** (commands run and their result). No co-author or tool attribution lines.
- One concern per PR.
