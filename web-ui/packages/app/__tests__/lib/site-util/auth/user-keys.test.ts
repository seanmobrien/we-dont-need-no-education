 
/**
 * @fileoverview Tests for UserKeyManager enhancements
 *
 * Tests the new validation methods added to UserKeyManager
 * including server key validation and local key checks.
 *
 * @module __tests__/lib/site-util/auth/user-keys.test.ts
 */

import { hideConsoleOutput } from '@/__tests__/test-utils';
import {
  validateUserKeysAgainstServer,
  hasValidLocalKeys,
  generateUserKeyPair,
  getUserPublicKey,
  getUserPrivateKey,
} from '@/lib/site-util/auth/user-keys';

// Mock Web Crypto API
const mockCryptoSubtle = {
  generateKey: jest.fn(),
  exportKey: jest.fn(),
};

Object.defineProperty(window, 'crypto', {
  value: {
    subtle: mockCryptoSubtle,
  },
});

// Mock btoa/atob
global.btoa = jest.fn();
global.atob = jest.fn();

// Create a factory for mock requests to avoid conflicts
const createMockRequest = (result: any = null, error: any = null) => ({
  result,
  error,
  onsuccess: null as any,
  onerror: null as any,
});

// Mock IndexedDB
let mockRequests: ReturnType<typeof createMockRequest>[] = [];

const mockIDBObjectStore = {
  put: jest.fn(),
  get: jest.fn(),
};

const mockIDBTransaction = {
  objectStore: jest.fn().mockReturnValue(mockIDBObjectStore),
};

const mockIDBDatabase = {
  transaction: jest.fn().mockReturnValue(mockIDBTransaction),
  createObjectStore: jest.fn(),
  objectStoreNames: {
    contains: jest.fn().mockReturnValue(false),
  },
};

const mockIDBOpenRequest = {
  result: mockIDBDatabase,
  error: null,
  onsuccess: null as any,
  onerror: null as any,
  onupgradeneeded: null as any,
};

Object.defineProperty(window, 'indexedDB', {
  value: {
    open: jest.fn().mockReturnValue(mockIDBOpenRequest),
  },
});

// Define it as a let so that someone -could- reassign it, even though
// we don't...
 
let requestIndex = 0;
const mockConsole = hideConsoleOutput();
describe('UserKeyManager Enhancements', () => {
  beforeEach(() => {
    // jest.clearAllMocks();
    mockRequests = [];
    requestIndex = 0;

    // Mock the get method to return new request objects
    mockIDBObjectStore.get.mockImplementation(() => {
      const request = createMockRequest();
      mockRequests.push(request);
      return request;
    });

    // Mock the put method to return new request objects
    mockIDBObjectStore.put.mockImplementation(() => {
      const request = createMockRequest();
      mockRequests.push(request);
      return request;
    });

    // Mock IndexedDB open to handle multiple database openings
    (window.indexedDB.open as jest.Mock).mockImplementation(() => {
      const request = {
        result: mockIDBDatabase,
        error: null,
        onsuccess: null as any,
        onerror: null as any,
        onupgradeneeded: null as any,
      };

      // Immediately trigger success for database opening
      setTimeout(() => {
        if (request.onsuccess) {
          request.onsuccess({} as any);
        }
      }, 0);

      return request;
    });
  });
  afterEach(() => {
    mockConsole.dispose();
  });

  describe('hasValidLocalKeys', () => {
    it('should return true when both public and private keys exist', async () => {
      const keyData = {
        publicKey: {} as CryptoKey,
        privateKey: {} as CryptoKey,
      };

      // Mock the get requests to return immediately
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = createMockRequest(keyData);
        // Trigger success immediately
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request } as any);
          }
        }, 0);
        return request;
      });

      const result = await hasValidLocalKeys();
      expect(result).toBe(true);
    });

    it('should return false when no keys exist', async () => {
      // Mock the get requests to return null immediately
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = createMockRequest(null);
        // Trigger success immediately
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request } as any);
          }
        }, 0);
        return request;
      });

      const result = await hasValidLocalKeys();
      expect(result).toBe(false);
    });

    it('should return false when only public key exists', async () => {
      const publicKeyData = {
        publicKey: {} as CryptoKey,
        privateKey: null,
      };

      // Mock the get requests to return data with null private key
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = createMockRequest(publicKeyData);
        // Trigger success immediately
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request } as any);
          }
        }, 0);
        return request;
      });

      const result = await hasValidLocalKeys();
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // Mock the get request to trigger an error
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = createMockRequest(null, new Error('Database error'));
        // Trigger error immediately
        setTimeout(() => {
          if (request.onerror) {
            request.onerror({ target: request } as any);
          }
        }, 0);
        return request;
      });

      const result = await hasValidLocalKeys();
      expect(result).toBe(false);
    });
  });

  describe('validateUserKeysAgainstServer', () => {
    const testServerKeys = ['server-key-1', 'server-key-2', 'server-key-3'];

    it('should return true when local key matches server key', async () => {
      const testLocalKey = 'server-key-2'; // Matches second server key
      const keyData = {
        publicKey: {} as CryptoKey,
        privateKey: {} as CryptoKey,
      };

      // Mock crypto export and btoa
      mockCryptoSubtle.exportKey.mockResolvedValue(new Uint8Array([1, 2, 3]));
      (global.btoa as jest.Mock).mockReturnValue(testLocalKey);

      // Mock the get request to return key data immediately
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = createMockRequest(keyData);
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request } as any);
          }
        }, 0);
        return request;
      });

      const result = await validateUserKeysAgainstServer(testServerKeys);
      expect(result).toBe(true);
    });

    it('should return false when local key does not match any server key', async () => {
      const testLocalKey = 'different-key'; // Does not match any server key
      const keyData = {
        publicKey: {} as CryptoKey,
        privateKey: {} as CryptoKey,
      };

      // Mock crypto export and btoa
      mockCryptoSubtle.exportKey.mockResolvedValue(new Uint8Array([1, 2, 3]));
      (global.btoa as jest.Mock).mockReturnValue(testLocalKey);

      // Mock the get request to return key data immediately
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = createMockRequest(keyData);
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request } as any);
          }
        }, 0);
        return request;
      });

      const result = await validateUserKeysAgainstServer(testServerKeys);
      expect(result).toBe(false);
    });

    it('should return false when no local key exists', async () => {
      // Mock the get request to return null immediately
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = createMockRequest(null);
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request } as any);
          }
        }, 0);
        return request;
      });

      const result = await validateUserKeysAgainstServer(testServerKeys);
      expect(result).toBe(false);
    });

    it('should handle crypto export errors gracefully', async () => {
      mockConsole.setup();
      const keyData = {
        publicKey: {} as CryptoKey,
        privateKey: {} as CryptoKey,
      };

      mockCryptoSubtle.exportKey.mockRejectedValue(new Error('Export failed'));

      // Mock the get request to return key data immediately
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = createMockRequest(keyData);
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request } as any);
          }
        }, 0);
        return request;
      });

      const result = await validateUserKeysAgainstServer(testServerKeys);
      expect(result).toBe(false);
    });

    it('should handle empty server keys array', async () => {
      // Even with empty server keys, the function still tries to get the local key
      // So we need to mock the database request
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = createMockRequest({
          publicKey: {} as CryptoKey,
          privateKey: {} as CryptoKey,
        });
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request } as any);
          }
        }, 0);
        return request;
      });

      // Mock crypto export
      mockCryptoSubtle.exportKey.mockResolvedValue(new Uint8Array([1, 2, 3]));
      (global.btoa as jest.Mock).mockReturnValue('some-key');

      const result = await validateUserKeysAgainstServer([]);
      expect(result).toBe(false);
    });
  });

  describe('generateUserKeyPair', () => {
    it('should generate and store new key pair', async () => {
      const mockKeyPair = {
        publicKey: {} as CryptoKey,
        privateKey: {} as CryptoKey,
      };

      // Mock crypto key generation
      mockCryptoSubtle.generateKey.mockResolvedValue(mockKeyPair);

      // Mock successful storage
      mockIDBObjectStore.put.mockImplementation(() => {
        const request = createMockRequest();
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request } as any);
          }
        }, 0);
        return request;
      });

      const result = await generateUserKeyPair();
      expect(result).toEqual(mockKeyPair);
      expect(mockCryptoSubtle.generateKey).toHaveBeenCalledWith(
        {
          name: 'ECDSA',
          namedCurve: 'P-256',
        },
        false,
        ['sign', 'verify'],
      );
    });

    it('should handle crypto generation errors', async () => {
      mockCryptoSubtle.generateKey.mockRejectedValue(
        new Error('Generation failed'),
      );

      await expect(generateUserKeyPair()).rejects.toThrow('Generation failed');
    });

    it('should handle storage errors gracefully', async () => {
      const mockKeyPair = {
        publicKey: {} as CryptoKey,
        privateKey: {} as CryptoKey,
      };

      mockCryptoSubtle.generateKey.mockResolvedValue(mockKeyPair);

      // Mock storage error
      mockIDBObjectStore.put.mockImplementation(() => {
        const request = createMockRequest(null, new Error('Storage failed'));
        setTimeout(() => {
          if (request.onerror) {
            request.onerror({ target: request } as any);
          }
        }, 0);
        return request;
      });

      await expect(generateUserKeyPair()).rejects.toThrow();
    });
  });

  describe('getUserPublicKey', () => {
    it('should retrieve public key from storage', async () => {
      const mockPublicKey = {} as CryptoKey;
      const keyData = {
        publicKey: mockPublicKey,
        privateKey: {} as CryptoKey,
      };

      // Mock the get request to return key data immediately
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = createMockRequest(keyData);
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request } as any);
          }
        }, 0);
        return request;
      });

      const result = await getUserPublicKey();
      expect(result).toBe(mockPublicKey);
    });

    it('should return null when no key exists', async () => {
      // Mock the get request to return null immediately
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = createMockRequest(null);
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request } as any);
          }
        }, 0);
        return request;
      });

      const result = await getUserPublicKey();
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Mock the get request to trigger an error
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = createMockRequest(null, new Error('Database error'));
        setTimeout(() => {
          if (request.onerror) {
            request.onerror({ target: request } as any);
          }
        }, 0);
        return request;
      });

      const result = await getUserPublicKey();
      expect(result).toBeNull();
    });
  });

  describe('getUserPrivateKey', () => {
    it('should retrieve private key from storage', async () => {
      const mockPrivateKey = {} as CryptoKey;
      const keyData = {
        publicKey: {} as CryptoKey,
        privateKey: mockPrivateKey,
      };

      // Mock the get request to return key data immediately
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = createMockRequest(keyData);
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request } as any);
          }
        }, 0);
        return request;
      });

      const result = await getUserPrivateKey();
      expect(result).toBe(mockPrivateKey);
    });

    it('should return null when no key exists', async () => {
      // Mock the get request to return null immediately
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = createMockRequest(null);
        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({ target: request } as any);
          }
        }, 0);
        return request;
      });

      const result = await getUserPrivateKey();
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      // Mock the get request to trigger an error
      mockIDBObjectStore.get.mockImplementation(() => {
        const request = createMockRequest(null, new Error('Database error'));
        setTimeout(() => {
          if (request.onerror) {
            request.onerror({ target: request } as any);
          }
        }, 0);
        return request;
      });

      const result = await getUserPrivateKey();
      expect(result).toBeNull();
    });
  });
});
