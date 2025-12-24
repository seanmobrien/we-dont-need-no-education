import { redirect } from '@/lib/auth/redirect';

/**
 * Tests for the redirect utility function that provides secure OAuth redirect URL handling.
 * This function prevents open redirect vulnerabilities by only allowing relative paths
 * or same-origin URLs, extracting just the pathname and reconstructing with the configured hostname.
 */
describe('redirect', () => {
  describe('basic functionality', () => {
    it('should handle relative paths correctly', async () => {
      const result = await redirect({
        url: '/dashboard',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/dashboard');
    });

    it('should strip query parameters from relative paths for security', async () => {
      const result = await redirect({
        url: '/dashboard?tab=settings',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/dashboard');
    });

    it('should strip fragments from relative paths for security', async () => {
      const result = await redirect({
        url: '/dashboard#section',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/dashboard');
    });

    it('should strip query parameters and fragments from relative paths for security', async () => {
      const result = await redirect({
        url: '/dashboard?tab=settings#section',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/dashboard');
    });
  });

  describe('absolute URLs on same origin', () => {
    it('should sanitize absolute URLs on the same origin to just the path', async () => {
      const result = await redirect({
        url: 'http://test-run.localhost/dashboard',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/dashboard');
    });

    it('should strip query parameters from absolute URLs on same origin for security', async () => {
      const result = await redirect({
        url: 'http://test-run.localhost/dashboard?tab=settings',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/dashboard');
    });

    it('should strip fragments from absolute URLs on same origin for security', async () => {
      const result = await redirect({
        url: 'http://test-run.localhost/dashboard#section',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/dashboard');
    });
  });

  describe('absolute URLs on different origins (security)', () => {
    it('should prevent open redirect by sanitizing different origin URLs', async () => {
      const result = await redirect({
        url: 'https://evil.com/malicious',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/malicious');
    });

    it('should prevent open redirect and strip query parameters from different origin', async () => {
      const result = await redirect({
        url: 'https://evil.com/malicious?param=value',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/malicious');
    });

    it('should prevent open redirect and strip fragments from different origin', async () => {
      const result = await redirect({
        url: 'https://evil.com/malicious#fragment',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/malicious');
    });

    it('should handle different protocols (http vs https)', async () => {
      const result = await redirect({
        url: 'http://evil.com/malicious',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/malicious');
    });

    it('should handle subdomains as different origins', async () => {
      const result = await redirect({
        url: 'https://sub.evil.com/malicious',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/malicious');
    });
  });

  describe('baseUrl parameter', () => {
    it('should use baseUrl when provided', async () => {
      const result = await redirect({
        url: '/dashboard',
        baseUrl: 'https://custom-base.com',
      });
      expect(result).toBe('http://test-run.localhost/dashboard');
    });

    it('should handle baseUrl with different origins', async () => {
      const result = await redirect({
        url: 'https://other.com/path',
        baseUrl: 'https://custom-base.com',
      });
      expect(result).toBe('http://test-run.localhost/path');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty string', async () => {
      const result = await redirect({
        url: '',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/');
    });

    it('should handle root path', async () => {
      const result = await redirect({
        url: '/',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/');
    });

    it('should handle paths without leading slash', async () => {
      const result = await redirect({
        url: 'dashboard',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/dashboard');
    });

    it('should handle malformed URLs gracefully', async () => {
      // URL constructor treats 'not-a-url' as a relative path when a baseUrl is provided
      const result = await redirect({
        url: 'not-a-url',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/not-a-url');
    });

    it('should handle URLs with special characters', async () => {
      const result = await redirect({
        url: '/path with spaces',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/path%20with%20spaces');
    });

    it('should handle URLs with unicode characters', async () => {
      const result = await redirect({
        url: '/café',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/caf%C3%A9');
    });
  });

  describe('URL components preservation', () => {
    it('should strip query parameters for security', async () => {
      const result = await redirect({
        url: '/path?key1=value1&key2=value2',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/path');
    });

    it('should strip fragments for security', async () => {
      const result = await redirect({
        url: '/path#section',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/path');
    });

    it('should strip complex query strings for security', async () => {
      const result = await redirect({
        url: '/path?search=hello%20world&page=1',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/path');
    });

    it('should handle URLs with auth information (should be stripped)', async () => {
      const result = await redirect({
        url: 'https://user:pass@evil.com/path',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/path');
    });
  });

  describe('protocol handling', () => {
    it('should handle different protocols in input URLs', async () => {
      const result = await redirect({
        url: 'http://evil.com/path',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/path');
    });

    it('should handle protocol-relative URLs', async () => {
      const result = await redirect({
        url: '//evil.com/path',
        baseUrl: 'http://test-run.localhost',
      });
      expect(result).toBe('http://test-run.localhost/path');
    });
  });
});
