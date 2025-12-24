import {
  isKeyOf,
  isMemberOfUnion,
  isOperationCancelledError,
  isValidUuid,
} from '@/lib/typescript/_guards';

describe('isKeyOf', () => {
  it('should return true if the key is a key of the given object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(isKeyOf('a', obj)).toBe(true);
    expect(isKeyOf('b', obj)).toBe(true);
    expect(isKeyOf('c', obj)).toBe(true);
    expect(isKeyOf('d', obj)).toBe(false);
  });

  it('should return true if the key is in the given array', () => {
    const arr = ['a', 'b', 'c'];
    expect(isKeyOf('a', arr)).toBe(true);
    expect(isKeyOf('b', arr)).toBe(true);
    expect(isKeyOf('c', arr)).toBe(true);
    expect(isKeyOf('d', arr)).toBe(false);
  });

  it('should return false if the check parameter is undefined or null', () => {
    expect(isKeyOf('a', undefined)).toBe(false);
    expect(isKeyOf('a', null)).toBe(false);
  });

  it('should return false if the key is not a string, number, or symbol', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(isKeyOf({}, obj)).toBe(false);
  });
});

describe('isMemberOfUnion', () => {
  it('should return true if the check value is a member of the union', () => {
    type Union = 'a' | 'b' | 'c';
    expect(isMemberOfUnion<Union>('a', ['a', 'b', 'c'])).toBe(true);
    expect(isMemberOfUnion<Union>('b', ['a', 'b', 'c'])).toBe(true);
    expect(isMemberOfUnion<Union>('c', ['a', 'b', 'c'])).toBe(true);
    expect(isMemberOfUnion<Union>('d', ['a', 'b', 'c'])).toBe(false);
  });

  it('should return false if the members parameter is undefined', () => {
    type Union = 'a' | 'b' | 'c';
    expect(isMemberOfUnion<Union>('a', undefined as unknown as Union[])).toBe(
      false,
    );
  });
});

describe('isOperationCancelledError', () => {
  it('should return false for a non-abort error', () => {
    const error = new Error('Some error');
    expect(isOperationCancelledError(error)).toBe(false);
  });

  it('should return false for a non-error object', () => {
    const obj = { message: 'Some error' };
    expect(isOperationCancelledError(obj)).toBe(false);
  });

  it('should return false for a null value', () => {
    expect(isOperationCancelledError(null)).toBe(false);
  });

  it('should return false for an undefined value', () => {
    expect(isOperationCancelledError(undefined)).toBe(false);
  });
});

describe('isValidUuid', () => {
  const validUuid = '12345678-1234-4567-8901-123456789012';
  it('should return true for a valid UUID', () => {
    expect(isValidUuid(validUuid)).toBe(true);
  });
  it('should return false for a non-v4 UUID', () => {
    const nonV4Uuid = '123e4567-e89b-12d3-a456-426614174000';
    expect(isValidUuid(nonV4Uuid)).toBe(false);
  });
  it('should return false for an invalid UUID string', () => {
    const invalidUuid = 'not-a-uuid';
    expect(isValidUuid(invalidUuid)).toBe(false);
  });

  it('should return false for a string with incorrect UUID format', () => {
    const almostUuid = '123e4567-e89b-12d3-a456-42661417400'; // shorter
    expect(isValidUuid(almostUuid)).toBe(false);
  });

  it('should return false for non-string input', () => {
    expect(isValidUuid(123)).toBe(false);
    expect(isValidUuid(null)).toBe(false);
    expect(isValidUuid(undefined)).toBe(false);
    expect(isValidUuid({})).toBe(false);
  });
});
