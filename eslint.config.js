import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const engineMustStayPure = 'The engine is pure: no browser APIs, clock or randomness (AGENTS.md).';

export default tseslint.config(
  { ignores: ['.output/', '.wxt/', 'coverage/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  prettier,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    files: ['src/core/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...['browser', 'chrome', 'window', 'document', 'localStorage', 'fetch'].map((name) => ({
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
      'no-restricted-syntax': [
        'error',
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
      ],
    },
  },
  {
    // Tests index into schedules whose length they just asserted.
    files: ['tests/**'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
