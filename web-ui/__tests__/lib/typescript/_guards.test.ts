import { isKeyOf, isMemberOfUnion } from 'lib/typescript/_guards';

describe('isKeyOf', () => {
  it('should return true if the key is a key of the given object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(isKeyOf('a', obj)).toBe(true);
    expect(isKeyOf('d', obj)).toBe(false);
  });

  it('should return true if the key is in the given array', () => {
    const arr = ['a', 'b', 'c'];
    expect(isKeyOf('a', arr)).toBe(true);
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
    expect(isMemberOfUnion<Union>('a', ['a', 'b'])).toBe(true);
  });

  it('should return false if the members parameter is undefined', () => {
    type Union = 'a' | 'b' | 'c';
    expect(isMemberOfUnion<Union>('f', ['a', 'b', 'c'])).toBe(false);
  });
});
