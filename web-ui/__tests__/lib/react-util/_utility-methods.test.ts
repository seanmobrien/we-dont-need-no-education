import { generateUniqueId } from 'lib/react-util/_utility-methods';

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
