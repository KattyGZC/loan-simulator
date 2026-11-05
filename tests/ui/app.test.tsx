// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { axeViolations } from './axe';
import { renderApp } from './render-app';

afterEach(cleanup);

const selectedTab = () => screen.getByRole('tab', { selected: true });

describe('side panel', () => {
  it('opens on the new-loan tab without moving the focus', async () => {
    await renderApp();
    expect(selectedTab().textContent).toBe('New loan');
    expect(document.activeElement).toBe(document.body);
  });

  it('breaks no axe rule when it opens', async () => {
    await renderApp();
    expect(await axeViolations()).toEqual([]);
  });
});

describe('tabs', () => {
  it('names the tab list', async () => {
    await renderApp();
    expect(screen.getByRole('tablist', { name: 'Sections' })).toBeTruthy();
  });

  it('keeps only the selected tab in the tab order', async () => {
    await renderApp();
    expect(screen.getAllByRole('tab').map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);
  });

  it('moves with the arrow keys, wrapping at both ends, and takes the focus along', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(selectedTab());

    await user.keyboard('{ArrowRight}');
    expect(selectedTab().textContent).toBe('Loan I already have');
    expect(document.activeElement).toBe(selectedTab());
    expect(screen.getAllByRole('tab').map((tab) => tab.tabIndex)).toEqual([-1, 0, -1]);

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(selectedTab().textContent).toBe('New loan');

    await user.keyboard('{ArrowLeft}');
    expect(selectedTab().textContent).toBe('Scenarios');
    expect(document.activeElement).toBe(selectedTab());
  });

  it('jumps to the first and last tab with Home and End', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(selectedTab());

    await user.keyboard('{End}');
    expect(selectedTab().textContent).toBe('Scenarios');
    await user.keyboard('{Home}');
    expect(selectedTab().textContent).toBe('New loan');
  });

  it('ignores other keys', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(selectedTab());

    await user.keyboard('{ArrowDown}a');
    expect(selectedTab().textContent).toBe('New loan');
  });

  it('shows the selected panel, which the keyboard can reach', async () => {
    await renderApp();
    const panel = screen.getByRole('tabpanel', { name: 'New loan' });
    expect(panel.tabIndex).toBe(0);
    expect(screen.getAllByRole('tabpanel')).toEqual([panel]);
  });
});

describe('preferences', () => {
  it('takes the focus when it opens', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: 'Preferences' }));

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Preferences' }));
    expect(screen.getByRole('button', { name: 'Done' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('closes with Escape and gives the focus back to its button', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: 'Preferences' }));

    await user.keyboard('{Escape}');
    const button = screen.getByRole('button', { name: 'Preferences' });
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('heading', { name: 'Preferences' })).toBeNull();
  });

  it('points its button at the section it opens', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: 'Preferences' }));

    const section = screen.getByRole('region', { name: 'Preferences' });
    expect(screen.getByRole('button', { name: 'Done' }).getAttribute('aria-controls')).toBe(
      section.id,
    );
  });

  it('breaks no axe rule while open', async () => {
    const user = userEvent.setup();
    await renderApp();
    await user.click(screen.getByRole('button', { name: 'Preferences' }));
    expect(await axeViolations()).toEqual([]);
  });
});
