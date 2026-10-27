import { describe, expect, it } from 'vitest';
import { storedFields, storedRecord } from '@/storage/stored-fields';

const METHODS = ['french', 'german'] as const;

describe('storedFields', () => {
  const fields = storedFields({ amount: '10000', solcaEnabled: false, method: 'german' });

  it('reads a field of the expected type', () => {
    expect(fields.text('amount', '')).toBe('10000');
    expect(fields.flag('solcaEnabled', true)).toBe(false);
    expect(fields.oneOf('method', METHODS, 'french')).toBe('german');
  });

  it('falls back on a missing field', () => {
    expect(fields.text('termMonths', '12')).toBe('12');
    expect(fields.flag('onTopOfInstallment', true)).toBe(true);
    expect(fields.oneOf('rateType', METHODS, 'french')).toBe('french');
  });

  it('falls back on a field of another type', () => {
    const wrong = storedFields({ amount: 10000, solcaEnabled: 'no', method: true });
    expect(wrong.text('amount', '')).toBe('');
    expect(wrong.flag('solcaEnabled', true)).toBe(true);
    expect(wrong.oneOf('method', METHODS, 'french')).toBe('french');
  });

  it('falls back on a value outside the options', () => {
    expect(storedFields({ method: 'american' }).oneOf('method', METHODS, 'french')).toBe('french');
  });

  it('falls back on every field when nothing was stored', () => {
    expect(storedFields(undefined).text('amount', '')).toBe('');
    expect(storedFields(null).flag('solcaEnabled', true)).toBe(true);
    expect(storedFields('amount=10000').text('amount', '')).toBe('');
  });
});

describe('storedRecord', () => {
  it('has no fields for a value that is not an object', () => {
    expect(storedRecord(42).size).toBe(0);
  });
});
