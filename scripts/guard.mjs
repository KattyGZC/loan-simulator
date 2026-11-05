// Flags a branch that changes what "passing" means instead of the code: a guarded file, the
// check scripts in package.json, or fewer tests than the base branch.
// Usage: node scripts/guard.mjs <base> [<head>]
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { checkSettings, isGuarded } from './guarded-files.mjs';

const [base = 'origin/main', head = 'HEAD'] = process.argv.slice(2);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });

const changed = git('diff', '--name-only', `${base}...${head}`).split('\n').filter(Boolean);
const findings = changed.filter(isGuarded).map((path) => `${path} changed.`);

const checksBefore = checkSettings(git('show', `${base}:package.json`));
if (checksBefore !== checkSettings(git('show', `${head}:package.json`))) {
  findings.push('package.json changed its scripts, git hooks or lint-staged.');
}

// One per test declaration, `it.each([` that opens a multi-line table included.
const TEST_CALL = String.raw`^\s*(it|test)(\.each\(.*\))?\(|^\s*(it|test)\.each\($`;
const grepCounts = (ref) => {
  try {
    return git('grep', '-cE', TEST_CALL, ref, '--', 'tests');
  } catch {
    // git grep exits 1 when nothing matches.
    return '';
  }
};
const testCount = (ref) =>
  grepCounts(ref)
    .split('\n')
    .filter(Boolean)
    .reduce((sum, line) => sum + Number(line.split(':').at(-1)), 0);
const [before, after] = [testCount(base), testCount(head)];
if (after < before) findings.push(`Tests went from ${before} to ${after}.`);

const report = findings.length
  ? `## Needs the owner's review\n\n${findings.map((finding) => `- ${finding}`).join('\n')}\n`
  : '## Guard: nothing to review\n';
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
console.log(report);
for (const finding of findings) console.log(`::error title=Guard::${finding}`);
process.exit(findings.length ? 1 : 0);
