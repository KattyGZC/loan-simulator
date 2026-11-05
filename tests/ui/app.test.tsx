// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { axeViolations } from './axe';
import { renderApp } from './render-app';

afterEach(cleanup);

describe('side panel', () => {
  it('opens on the new-loan tab', async () => {
    await renderApp();
    expect(screen.getByRole('tab', { name: 'New loan' }).getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('breaks no axe rule when it opens', async () => {
    await renderApp();
    expect(await axeViolations()).toEqual([]);
  });
});
