/**
 * Reads the fields of a value read back from storage. Each read falls back when the field is
 * missing or holds something else, so data from an older or damaged save never reaches the UI.
 */
export interface StoredFields {
  text(key: string, fallback: string): string;
  flag(key: string, fallback: boolean): boolean;
  /** The stored value when it is one of `options`. */
  oneOf<T extends string>(key: string, options: readonly T[], fallback: T): T;
}

/** The fields of a stored object, by name; none when `stored` is not an object. */
export function storedRecord(stored: unknown): ReadonlyMap<string, unknown> {
  return new Map(typeof stored === 'object' && stored !== null ? Object.entries(stored) : []);
}

export function storedFields(stored: unknown): StoredFields {
  const fields = storedRecord(stored);
  return {
    text(key, fallback) {
      const value = fields.get(key);
      return typeof value === 'string' ? value : fallback;
    },
    flag(key, fallback) {
      const value = fields.get(key);
      return typeof value === 'boolean' ? value : fallback;
    },
    oneOf(key, options, fallback) {
      const value = fields.get(key);
      return options.find((option) => option === value) ?? fallback;
    },
  };
}
