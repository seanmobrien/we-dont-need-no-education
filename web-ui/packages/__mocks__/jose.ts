/**
 * Mock for jose library
 * Used in Jest tests to avoid ESM module issues
 */

export const decodeJwt = jest.fn((token: string) => {
  // Default mock implementation - decode without verification
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  // Base64url decode the payload (second part)
  const payload = parts[1];
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = Buffer.from(base64, 'base64').toString('utf-8');
  return JSON.parse(decoded);
});

export const jwtVerify = jest.fn(async (token: string) => {
  // Default mock implementation - just decode
  const payload = decodeJwt(token);
  return { payload };
});

export const createRemoteJWKSet = jest.fn((url: URL) => {
  // Return a mock JWKS object
  return { url: url.toString() };
});
