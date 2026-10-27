---
name: self-grade
description: >-
  Grade your own finished work against AGENTS.md before presenting it. Trigger when a task
  or a roadmap item is done, before a commit or PR, or when asked "is it ready", "are you
  done", "show me".
---

# Self-grade

Source: `AGENTS.md`. Grade only the rows that apply to the change; mark the rest N/A.

## Protocol

1. Re-read `AGENTS.md`.
2. List every file created or modified: `git status --short` and `git diff --stat main...HEAD`.
3. Run the commands in "Before presenting work" (`AGENTS.md`). Quote each exit code. Do not paraphrase output you did not see.
4. Run the mechanical checks below on the changed files.
5. Fill in the table. Every applicable row needs evidence (file:line, command output, test name). Empty evidence is **F**.
6. Fix every **F** and re-grade. Present only when every applicable row is **A**.

## Mechanical checks

```bash
# Engine purity: must print nothing
git grep -nE "\b(browser|chrome)\.|from 'wxt|Date\.now\(|new Date\(\)|Math\.random\(|\bdocument\.|\bwindow\." -- src/core

# No any, no casts other than `as const`: review every hit
git grep -nE ":\s*any\b|<any>|\bas (any|unknown|\[|\{|[A-Z])" -- src

# Rounding outside roundMoney: must print nothing
git grep -nE "toFixed\(|Math\.round\(" -- src ':!src/core/money.ts'

# Comments added by this change: classify each one
git diff main...HEAD -U0 -- src tests | grep -E "^\+.*(//|/\*)"

# Both READMEs changed together (when either did)
git diff --name-only main...HEAD -- README.md README.es.md

# Text written in components instead of t(): review every hit
git grep -nE ">[^<{]*[A-Za-z]{2}[^<{]*<|(title|placeholder|aria-label|alt)=\"[^\"]*[A-Za-z]" -- 'src/**/*.tsx'

# Keys added in one language and not the other: the messages test fails, but quote the diff
git diff main...HEAD --stat -- public/_locales

# References to the local, git-ignored notes: must print nothing
git grep -niE "DECISIONS/|implementation plan|research\.md|golden-cases\.md" -- src tests README.md README.es.md
```

## Table

| Row | Check | Grade | Evidence |
|---|---|---|---|
| Why | One sentence of the outcome was written before the first edit | | |
| Evidence | Every claim the change depends on has an artifact | | |
| Scope | Smallest change; no refactor of nearby code | | |
| Decisions | No decision in `AGENTS.md` reversed without saying so | | |
| Purity | `src/core/` imports nothing outside itself; purity grep is empty | | |
| Boundary | UI and storage import from `@/core` only | | |
| Names | Names carry unit and meaning; one name per concept | | |
| Functions | One thing per function; no clever loop that hides a step | | |
| Types | No `any`; no `as` except `as const`; unions instead of boolean or nullable pairs | | |
| Constants | No magic numbers; closed sets are unions in `types.ts` | | |
| UI text | Every visible string comes from `t()`; new keys exist in `en` and `es` | | |
| Money | Only `roundMoney` rounds; percent ↔ fraction in one named place | | |
| Comments | Each new comment is JSDoc on an export or a *why* that cannot be a name | | |
| Tests | New behavior tested with an edge or negative case, in `tests/**/*.test.ts` | | |
| Golden | Golden cases pass if the math changed; a new case records its source | | |
| Coverage | `src/core/` and `src/i18n/` ≥ 95 % (quote the summary) | | |
| Docs | Both READMEs updated together if behavior, formulas or defaults changed; "Status" updated if a phase closed | | |
| Dead code | Nothing left unused: imports, exports, files, branches | | |
| Git | On a feature branch; commits split by layer; commit plan shown before committing | | |

## Output

```
## Self-grade: <task>
Files: <paths>
Commands: lint 0 · format 0 · typecheck 0 · test:coverage 0 (<n> tests, <x> % branches) · build 0

<table>

### Fixed during grading
1. <row>: <what was wrong> → <fix>

### Overall: A
```

Any row below **A** means the work is not ready. Fix it before presenting.
