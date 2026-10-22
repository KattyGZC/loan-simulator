import { describe, expect, it } from 'vitest';

describe('test setup', () => {
  it('runs with the WXT fake browser', () => {
    expect(browser.runtime).toBeDefined();
  });
});
