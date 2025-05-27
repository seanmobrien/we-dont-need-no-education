jest.mock('@/lib/neondb');

import { generateUniqueId, isTruthy } from '@/lib/react-util/_utility-methods';
import { query } from '@/lib/neondb';

describe('generateUniqueId', () => {
  it('should generate a unique identifier of 9 characters', () => {
    const id = generateUniqueId();
    expect(id).toHaveLength(7);
  });

  it('should generate a unique identifier consisting of alphanumeric characters', () => {
    const id = generateUniqueId();
    expect(id).toMatch(/^[a-z0-9]{7}$/);
  });

  it('should generate different identifiers on subsequent calls', () => {
    const id1 = generateUniqueId();
    const id2 = generateUniqueId();
    expect(id1).not.toBe(id2);
  });
});
describe('isTruthy', () => {
  it('should return true for boolean true', () => {
    expect(isTruthy(true)).toBe(true);
  });

  it('should return false for boolean false', () => {
    expect(isTruthy(false)).toBe(false);
  });

  it('should return true for string "true"', () => {
    expect(isTruthy('true')).toBe(true);
  });

  it('should return true for string "1"', () => {
    expect(isTruthy('1')).toBe(true);
  });

  it('should return true for string "yes"', () => {
    expect(isTruthy('yes')).toBe(true);
  });

  it('should return true for string "y"', () => {
    expect(isTruthy('y')).toBe(true);
  });

  it('should return false for string "false"', () => {
    expect(isTruthy('false')).toBe(false);
  });

  it('should return false for string "0"', () => {
    expect(isTruthy('0')).toBe(false);
  });

  it('should return false for string "no"', () => {
    expect(isTruthy('no')).toBe(false);
  });

  it('should return false for string "n"', () => {
    expect(isTruthy('n')).toBe(false);
  });

  it('should return default value for undefined', () => {
    expect(isTruthy(undefined, true)).toBe(true);
    expect(isTruthy(undefined, false)).toBe(false);
  });

  it('should return default value for null', () => {
    expect(isTruthy(null, true)).toBe(true);
    expect(isTruthy(null, false)).toBe(false);
  });

  it('should return true for non-empty array', () => {
    expect(isTruthy([1, 2, 3])).toBe(true);
  });

  it('should return false for empty array', () => {
    expect(isTruthy([])).toBe(false);
  });

  it('should return true for non-empty object', () => {
    expect(isTruthy({ key: 'value' })).toBe(true);
  });

  it('should return false for empty object', () => {
    expect(isTruthy({})).toBe(false);
  });
});
