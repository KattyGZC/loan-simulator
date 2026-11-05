/**
 * Files that decide what "passing" means: the reference schedules, the thresholds and the rules.
 * Changing one can make a check pass without fixing anything, so a person reviews the change.
 */
const GUARDED = [
  'tests/golden/',
  '.github/',
  '.claude/hooks/',
  '.claude/settings.json',
  '.claude/settings.local.json',
  '.claude/skills/',
  'scripts/',
  'eslint.config.js',
  'vitest.config.ts',
  'stryker.config.json',
  'knip.json',
  'tsconfig.json',
  '.prettierrc.json',
  '.prettierignore',
];

/** Whether `path` (relative to the repo, `/`-separated) is one of the guarded files. */
export function isGuarded(path) {
  return GUARDED.some((guarded) =>
    guarded.endsWith('/') ? path.startsWith(guarded) : path === guarded,
  );
}

/** The parts of package.json that run the checks; its dependencies change freely. */
export function checkSettings(packageJson) {
  const {
    scripts,
    'simple-git-hooks': gitHooks,
    'lint-staged': lintStaged,
  } = JSON.parse(packageJson);
  return JSON.stringify({ scripts, gitHooks, lintStaged });
}
