import { getLastPathSegment, normalizePath } from '../src/url';

describe('react-util/url', () => {
  describe('normalizePath', () => {
    it('removes trailing slash except for root', () => {
      expect(normalizePath('/foo/bar/')).toBe('/foo/bar');
      expect(normalizePath('/')).toBe('/');
      expect(normalizePath('/foo//')).toBe('/foo');
    });
  });

  describe('getLastPathSegment', () => {
    it('returns undefined for falsy input', () => {
      expect(getLastPathSegment(undefined)).toBeUndefined();
      expect(getLastPathSegment('')).toBeUndefined();
    });
    it('ignores query and hash', () => {
      expect(getLastPathSegment('/a/b/c?x=1#y')).toBe('c');
    });
    it('returns last non-empty segment', () => {
      expect(getLastPathSegment('/a/b/c')).toBe('c');
      expect(getLastPathSegment('/a/b/c/')).toBe('c');
      expect(getLastPathSegment('/only')).toBe('only');
    });
  });
});
