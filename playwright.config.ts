import { defineConfig } from '@playwright/test';

const inCi = process.env.CI !== undefined;

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'reports/e2e',
  forbidOnly: inCi,
  reporter: inCi ? [['github'], ['list']] : 'list',
  use: { trace: 'retain-on-failure' },
});
