import { useId } from 'preact/hooks';
import type { PrintBlock, Printout, PrintSection } from '@/entrypoints/sidepanel/printout';
import { t } from '@/i18n/translate';

function PrintTable({ rowHeading, columns, rows }: Extract<PrintBlock, { kind: 'table' }>) {
  return (
    <table>
      <thead>
        <tr>
          {rowHeading === null ? <td /> : <th scope="col">{rowHeading}</th>}
          {columns.map((label) => (
            <th key={label} scope="col">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(({ heading, cells, marked }) => (
          <tr key={heading} class={marked ? 'marked' : undefined}>
            <th scope="row">{heading}</th>
            {cells.map((cell, index) => (
              <td key={index}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Block({ block }: { block: PrintBlock }) {
  switch (block.kind) {
    case 'lines':
      return (
        <dl class="lines">
          {block.lines.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      );
    case 'note':
      return <p class="note">{block.text}</p>;
    case 'table':
      return <PrintTable {...block} />;
  }
}

function Section({ section }: { section: PrintSection }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId}>{section.title}</h2>
      {section.blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </section>
  );
}

/** The results the panel stored, laid out for paper; a message when there are none. */
export function PrintPage({ printout }: { printout: Printout | null }) {
  if (!printout) {
    return (
      <main>
        <h1>{t('extName')}</h1>
        <p class="note">{t('print_nothing')}</p>
      </main>
    );
  }
  return (
    <>
      <header>
        <div>
          <p class="product">{t('extName')}</p>
          <h1>{printout.title}</h1>
        </div>
        <button type="button" class="button" onClick={() => window.print()}>
          {t('button_print')}
        </button>
      </header>
      <main>
        {printout.warnings.length > 0 && (
          <ul class="warnings">
            {printout.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}
        {printout.sections.map((section) => (
          <Section key={section.title} section={section} />
        ))}
      </main>
      <footer class="disclaimer">{printout.disclaimer}</footer>
    </>
  );
}
