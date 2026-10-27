import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: [
        'src/core/**',
        'src/i18n/**',
        'src/entrypoints/sidepanel/form.ts',
        'src/entrypoints/sidepanel/existing-form.ts',
      ],
      exclude: ['src/core/index.ts', 'src/core/types.ts'],
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
    },
  },
});
