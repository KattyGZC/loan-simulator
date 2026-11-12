import { createContext } from 'preact';
import { useEffect, useId } from 'preact/hooks';
import { t } from '@/i18n/translate';
import { GLOSSARY, type GlossaryTerm } from './glossary-terms';

/** Opens the glossary at a term; undefined where a field has no glossary to open. */
export const OpenGlossary = createContext<((term: GlossaryTerm) => void) | undefined>(undefined);

interface GlossaryProps {
  id: string;
  /** The term to land on, when a field's definition opened the glossary; otherwise its title. */
  term: GlossaryTerm | undefined;
  /** Escape closes the glossary, as the header button does. */
  onClose: () => void;
}

/**
 * Every term a loan raises, grouped, each with its definition and an example. It takes the focus
 * when it opens, on its title or on the term asked for, so a keyboard user lands on it instead of
 * on the hidden tabs.
 */
export function Glossary({ id, term: target, onClose }: GlossaryProps) {
  const titleId = useId();
  const termId = (term: GlossaryTerm) => `${titleId}-${term}`;
  const landingId = target ? termId(target) : titleId;
  useEffect(() => document.getElementById(landingId)?.focus(), [landingId]);
  // On the document: nothing in the glossary but where it lands takes the focus, and the focus
  // may be on the header button that opened it.
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <section id={id} class="glossary" aria-labelledby={titleId}>
      <h2 id={titleId} tabIndex={-1}>
        {t('section_glossary')}
      </h2>
      {GLOSSARY.map(({ group, terms }) => (
        <section key={group} aria-labelledby={`${titleId}-${group}`}>
          <h3 id={`${titleId}-${group}`}>{t(`glossaryGroup_${group}`)}</h3>
          <dl>
            {terms.map((term) => (
              <div key={term} class={term === target ? 'entry target' : 'entry'}>
                <dt id={termId(term)} tabIndex={term === target ? -1 : undefined}>
                  {t(`glossaryTerm_${term}`)}
                </dt>
                <dd>{t(`glossaryDefinition_${term}`)}</dd>
                <dd class="example">{t(`glossaryExample_${term}`)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </section>
  );
}
