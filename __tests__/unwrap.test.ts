import { unwrap } from '@/api/unwrap';

// This replaced eleven near-identical local copies across src/api/, so it is a
// single point of failure for every one of those modules. The behaviour the
// callers actually depend on is the two-level fallback and the null floor.
const res = (body: unknown) => ({ data: body });

describe('unwrap', () => {
  it('takes the payload three levels below the axios response', () => {
    expect(unwrap(res({ data: { data: { id: 'x' } } }))).toEqual({ id: 'x' });
  });

  it('falls back a level for routes that answer one level shallower', () => {
    expect(unwrap(res({ data: { id: 'y' } }))).toEqual({ id: 'y' });
  });

  it('returns null, not undefined, when there is no payload', () => {
    expect(unwrap(res({}))).toBeNull();
    expect(unwrap(res(null))).toBeNull();
    expect(unwrap(null)).toBeNull();
    expect(unwrap(undefined)).toBeNull();
  });

  // The `||` copies this replaced skipped a falsy-but-real payload and handed
  // back the envelope above it. `??` keeps it.
  it('keeps a falsy payload rather than falling back past it', () => {
    expect(unwrap(res({ data: { data: 0 } }))).toBe(0);
    expect(unwrap(res({ data: { data: '' } }))).toBe('');
    expect(unwrap(res({ data: { data: [] } }))).toEqual([]);
  });
});
