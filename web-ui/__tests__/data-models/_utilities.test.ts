import { normalizeNullableNumeric } from 'data-models/_utilities';

describe('normalizeNullableNumeric', () => {
  it('should return null if the value is null', () => {
    expect(normalizeNullableNumeric(null)).toBeNull();
  });

  it('should return null if the value is less than or equal to zero', () => {
    expect(normalizeNullableNumeric(0)).toBeNull();
    expect(normalizeNullableNumeric(-1)).toBeNull();
  });

  it('should return the original value if it is greater than zero', () => {
    expect(normalizeNullableNumeric(1)).toBe(1);
    expect(normalizeNullableNumeric(100)).toBe(100);
  });
});
