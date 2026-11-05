import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

// Every line of every logic file runs in a test, so new logic cannot hide behind the files around it.
const everyLogicFile = { perFile: true, statements: 100, branches: 90, functions: 100, lines: 100 };

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      // Entry files only mount the app; the browser runs them, not the tests.
      exclude: [
        'src/core/index.ts',
        'src/core/types.ts',
        'src/entrypoints/background.ts',
        'src/entrypoints/*/main.tsx',
      ],
      thresholds: {
        // The components and hooks: today's level, so it can only go up.
        statements: 80,
        branches: 86,
        functions: 71,
        lines: 80,
        'src/{core,i18n,storage}/**': everyLogicFile,
        // Hooks (`use*.ts`) count as UI; `locale.ts` is under-tested and waits for its tests.
        'src/entrypoints/sidepanel/!(use*|locale).ts': everyLogicFile,
      },
    },
  },
});
