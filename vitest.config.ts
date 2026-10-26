import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/core/**'],
      exclude: ['src/core/index.ts', 'src/core/types.ts'],
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
    },
  },
});
