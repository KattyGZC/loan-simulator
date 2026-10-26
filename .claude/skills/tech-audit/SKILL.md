---
name: tech-audit
description: >-
  Fresh-eyes clean-code review of a branch, a PR or the whole repo, with a ship verdict.
  Trigger after a phase or a large change, before a PR is marked ready, or when asked to
  "audit", "review the code", "is this clean".
---

# Tech audit

Review as if you did not write the code: you are the person who just cloned the repo and has to continue it. Hunt for what makes that hard. The standard is `AGENTS.md`.

## Scope

- Branch or PR: `git diff main...HEAD` (or `gh pr diff <n>`). Judge only what changed, but say when a change makes nearby code inconsistent.
- Whole repo: every file under `src/`, `tests/`, the config files and both READMEs.

Read every file in scope. Run the checks in "Before presenting work" (`AGENTS.md`) and the mechanical checks in `.claude/skills/self-grade/SKILL.md`, and quote the results.

## What to look for

**Can a newcomer continue it?**
- The README says what exists, not only what is planned. Commands in the README work.
- `AGENTS.md` "Status" matches the code.
- No reference to files that are not in the repo (`DECISIONS/` is local).

**Does the code speak for itself?**
- Functions longer than ~40 lines, or that need a paragraph of JSDoc to explain their steps.
- Names without unit or meaning (`number`, `covered`, `lastNumber`), or one concept with several names.
- Repeated branching on the same value (`method === 'french'` in four places) that one shape per case would remove.
- Clever idioms where plain flow would do.
- Comments that a rename or an extracted function would make unnecessary.

**Are the types honest?**
- States the types allow but the code never produces (two nullable fields that are always null together).
- `as` casts, `any`, `string` where a union of known values exists (field paths, codes).
- Options whose combinations are silently ignored.

**Is the engine still trustworthy?**
- Purity of `src/core/`. Rounding only through `roundMoney`. Percent ↔ fraction in one place.
- Branches with no test (read the coverage report's uncovered lines).
- Edge cases: 0 % rate, one payment, 360 payments, an extra payment that ends the loan, invalid input that feeds another check.

**Tooling**
- A dependency nobody imports. A script the README or CI needs but `package.json` lacks.
- A rule from `AGENTS.md` that a lint rule could enforce instead of a reviewer.

## Output

```
## Tech audit: <scope> — SHIP | ACCEPT-WITH-FIXES | DO-NOT-SHIP

Commands: <each with exit code>

### Findings
| # | Severity | File:line | Issue | Fix |
|---|---|---|---|---|

### Edge cases checked
- [x] ...

### What is already good
<two or three lines, so the fixes do not undo it>
```

Severity: **High** (wrong money, broken contract or a newcomer is blocked), **Medium** (hard to read or change safely), **Low** (polish). Any High is DO-NOT-SHIP.

Every finding cites a file and line you read in this session. Do not report something you inferred without opening the file.
