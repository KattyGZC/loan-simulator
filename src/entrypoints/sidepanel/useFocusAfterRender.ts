import { useEffect, useRef } from 'preact/hooks';

/**
 * Focuses an element once the component has rendered again: one the render adds, or one that
 * stays when the element that had the focus goes away. Without it the focus falls back to the
 * page and a keyboard user starts over from the top.
 */
export function useFocusAfterRender(): (find: () => HTMLElement | null | undefined) => void {
  const pending = useRef<(() => HTMLElement | null | undefined) | null>(null);
  useEffect(() => {
    pending.current?.()?.focus();
    pending.current = null;
  });
  return (find) => {
    pending.current = find;
  };
}
