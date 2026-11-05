import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const engineMustStayPure = 'The engine is pure: no browser APIs, clock or randomness (AGENTS.md).';
const roundOnlyWithRoundMoney = 'Round amounts only with roundMoney (AGENTS.md).';
const percentInOnePlace =
  'Convert between percent and fraction with the functions in rates.ts (AGENTS.md).';

const noCasts = [
  {
    selector: "TSAsExpression:not([typeAnnotation.typeName.name='const'])",
    message: 'No `as` in src/ except `as const`: parse or narrow instead (AGENTS.md).',
  },
  {
    selector: 'TSTypeAssertion',
    message: 'No type assertions in src/: parse or narrow instead (AGENTS.md).',
  },
];

const noRounding = [
  {
    selector: "CallExpression[callee.property.name='toFixed']",
    message: roundOnlyWithRoundMoney,
  },
  {
    selector: "CallExpression[callee.object.name='Math'][callee.property.name='round']",
    message: roundOnlyWithRoundMoney,
  },
];

const noPercentArithmetic = [
  {
    selector: 'BinaryExpression[operator=/^[*\\/]$/][right.value=100]',
    message: percentInOnePlace,
  },
  {
    selector: "BinaryExpression[operator='*'][left.value=100]",
    message: percentInOnePlace,
  },
];

const noCoreAccess = [
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: engineMustStayPure,
  },
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: engineMustStayPure,
  },
  {
    selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
    message: engineMustStayPure,
  },
];

const noTextInComponents = [
  {
    selector: 'JSXText[value=/[A-Za-z]{2}/]',
    message: 'No text in components: every label and message comes from t() (AGENTS.md).',
  },
  {
    selector:
      'JSXOpeningElement[name.name=/^[a-z]/] > JSXAttribute[name.name=/^(title|placeholder|alt|aria-label|aria-description)$/] > Literal[value=/[A-Za-z]{2}/]',
    message: 'No text in components: every label and message comes from t() (AGENTS.md).',
  },
];

export default tseslint.config(
  { ignores: ['.output/', '.wxt/', 'coverage/', 'reports/', '.stryker-tmp/'] },
  {
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'error' },
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  jsxA11y.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['error', { allow: ['error'] }],
      'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'xxx', 'hack'] }],
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],
    },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    // Node scripts for CI and Claude Code's hooks: they report on the console.
    files: ['scripts/**', '.claude/hooks/**'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off' },
  },
  {
    // The compiler rules of the recommended set do not recognize Preact's hooks as React's.
    files: ['src/**'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    // The ARIA tabs pattern: the tab list handles the arrow keys, and its tabs take the focus.
    files: ['src/entrypoints/sidepanel/App.tsx'],
    rules: { 'jsx-a11y-x/interactive-supports-focus': 'off' },
  },
  {
    // Escape closes the preferences from any field inside them.
    files: ['src/entrypoints/sidepanel/PreferencesForm.tsx'],
    rules: { 'jsx-a11y-x/no-noninteractive-element-interactions': 'off' },
  },
  {
    // A table that scrolls sideways must be focusable for keyboard users (axe: scrollable-region-focusable).
    files: ['src/entrypoints/sidepanel/ScheduleTable.tsx'],
    rules: { 'jsx-a11y-x/no-noninteractive-tabindex': 'off' },
  },
  {
    files: ['src/**'],
    rules: {
      'no-restricted-syntax': ['error', ...noCasts, ...noRounding, ...noPercentArithmetic],
    },
  },
  {
    files: ['src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...noCasts,
        ...noRounding,
        ...noPercentArithmetic,
        ...noTextInComponents,
      ],
    },
  },
  {
    // The two files that own rounding and the percent conversion.
    files: ['src/core/money.ts', 'src/core/rates.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...noCasts, ...noCoreAccess, ...noTextInComponents],
    },
  },
  {
    files: ['src/core/**'],
    ignores: ['src/core/money.ts', 'src/core/rates.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...noCasts,
        ...noRounding,
        ...noPercentArithmetic,
        ...noCoreAccess,
        ...noTextInComponents,
      ],
    },
  },
  {
    files: ['src/core/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...[
          'browser',
          'chrome',
          'window',
          'document',
          'navigator',
          'globalThis',
          'localStorage',
          'fetch',
          'setTimeout',
          'setInterval',
        ].map((name) => ({
          name,
          message: engineMustStayPure,
        })),
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['wxt', 'wxt/*', '#imports'], message: engineMustStayPure },
            { group: ['@/*', '../*'], message: 'The engine imports only from src/core/.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**'],
    ignores: ['src/core/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/core/*', '**/core/*'],
              message:
                'Import the engine from @/core only, never from a file inside it (AGENTS.md).',
            },
          ],
        },
      ],
    },
  },
  {
    // Tests index into schedules whose length they just asserted, and Vitest's asymmetric
    // matchers (`expect.anything()`) are typed `any`.
    files: ['tests/**'],
    extends: [vitest.configs.recommended],
    rules: {
      // A test that skips, focuses or asserts nothing passes without checking anything.
      'vitest/expect-expect': ['error', { assertFunctionNames: ['expect', 'expect*'] }],
      // Vitest's expect takes a message as its second argument.
      'vitest/valid-expect': ['error', { maxArgs: 2 }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
);
