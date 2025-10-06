import {
  EmailPropertyTypeTypeValues,
  EmailPropertyCategoryTypeValues,
} from '/data-models/api/email-properties/property-type';
import {
  isEmailPropertyCategory,
  isEmailPropertyType,
  lookupEmailPropertyCategory,
  lookupEmailPropertyType,
  normalizeDateAndTime,
  normalizeNullableNumeric,
} from '/data-models/_utilities';

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
describe('normalizeDateAndTime', () => {
  it('should return the ISO string format of a valid date string', () => {
    const date = '2023-10-10T10:10:10Z';
    expect(normalizeDateAndTime(date)).toBe('2023-10-10T10:10');
  });

  it('should return the ISO string format of a valid Date object', () => {
    const date = new Date('2023-10-10T10:10:10Z');
    expect(normalizeDateAndTime(date)).toBe('2023-10-10T10:10');
  });

  it('should return the default value if the input is invalid', () => {
    const defaultValue = new Date('2023-10-10T10:10:10Z');
    expect(normalizeDateAndTime('invalid-date', defaultValue)).toBe(
      '2023-10-10T10:10',
    );
  });

  it('should return the current date and time if the input is invalid and no default value is provided', () => {
    const result = normalizeDateAndTime('invalid-date');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});

describe('lookupEmailPropertyType', () => {
  it('should return the correct ID for a known property type', () => {
    expect(lookupEmailPropertyType('Cc')).toBe(
      EmailPropertyTypeTypeValues.indexOf('Cc') + 1,
    );
  });

  it('should return -1 for an unknown property type', () => {
    expect(lookupEmailPropertyType('unknown-type')).toBe(-1);
  });
});

describe('isEmailPropertyType', () => {
  it('should return true for a valid email property type', () => {
    expect(isEmailPropertyType('Key Points')).toBe(true);
  });

  it('should return false for an invalid email property type', () => {
    expect(isEmailPropertyType('unknown-type')).toBe(false);
  });
});

describe('lookupEmailPropertyCategory', () => {
  it('should return the correct ID for a known property category', () => {
    expect(lookupEmailPropertyCategory('Key Point')).toBe(
      EmailPropertyCategoryTypeValues.indexOf('Key Point') + 1,
    );
  });

  it('should return -1 for an unknown property category', () => {
    expect(lookupEmailPropertyCategory('unknown-category')).toBe(-1);
  });
});

describe('isEmailPropertyCategory', () => {
  it('should return true for a valid email property category', () => {
    expect(isEmailPropertyCategory('Key Point')).toBe(true);
  });

  it('should return false for an invalid email property category', () => {
    expect(isEmailPropertyCategory('unknown-category')).toBe(false);
  });
});
