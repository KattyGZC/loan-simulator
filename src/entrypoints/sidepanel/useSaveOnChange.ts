import { useEffect, useRef } from 'preact/hooks';

/**
 * Saves `value` each time it changes, but not the value it started with: saving that would
 * overwrite what is stored with defaults whenever reading it back failed.
 */
export function useSaveOnChange<T>(value: T, save: (value: T) => Promise<void>) {
  const lastSaved = useRef(value);
  useEffect(() => {
    if (value === lastSaved.current) return;
    lastSaved.current = value;
    save(value).catch((error: unknown) => console.error(error));
  }, [value, save]);
}
