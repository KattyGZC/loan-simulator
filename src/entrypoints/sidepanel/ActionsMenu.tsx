import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { t } from '@/i18n/translate';

export interface MenuAction {
  label: string;
  onSelect: () => void;
}

/** The index the arrow, Home and End keys move to from `current`, wrapping; null for other keys. */
function itemIndexForKey(key: string, current: number, count: number): number | null {
  switch (key) {
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowUp':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/**
 * The ⋮ button and the menu of what can be done with the results, following the ARIA menu
 * button pattern: the menu opens with the focus on its first item, the arrow keys, Home and End
 * move between items, and Escape, Tab or a click outside close it.
 */
export function ActionsMenu({ actions }: { actions: readonly MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const menuId = useId();
  const items = () => [...(menu.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])];

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const closeOnClickOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menu.current?.contains(target) || trigger.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnClickOutside);
    return () => document.removeEventListener('pointerdown', closeOnClickOutside);
  }, [open]);

  const closeAndFocusTrigger = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  return (
    <div class="menu">
      <button
        ref={trigger}
        type="button"
        class="icon-button"
        aria-label={t('button_moreActions')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(!open)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
      <ul
        ref={menu}
        id={menuId}
        role="menu"
        aria-label={t('button_moreActions')}
        hidden={!open}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            closeAndFocusTrigger();
            return;
          }
          if (event.key === 'Tab') {
            setOpen(false);
            return;
          }
          const all = items();
          const current = all.findIndex((item) => item === document.activeElement);
          const next = itemIndexForKey(event.key, current, all.length);
          if (next === null) return;
          event.preventDefault();
          all[next]?.focus();
        }}
      >
        {actions.map((action) => (
          <li key={action.label} role="none">
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                closeAndFocusTrigger();
                action.onSelect();
              }}
            >
              {action.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
