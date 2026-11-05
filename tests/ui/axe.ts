import axe from 'axe-core';

/**
 * The axe rules the page breaks, one line each with the elements that break it. Contrast is
 * left out: happy-dom does not lay out or paint, so axe cannot read the colors; the theme's
 * contrast is checked on its tokens instead.
 */
export async function axeViolations(context: axe.ElementContext = document): Promise<string[]> {
  const results = await axe.run(context, { rules: { 'color-contrast': { enabled: false } } });
  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} (${violation.nodes.map((node) => node.target.join(' ')).join(', ')})`,
  );
}
