/**
 * @fileoverview Tests for UserKeyManager enhancements
 * 
 * Tests the new validation methods added to UserKeyManager
 * including server key validation and local key checks.
 * 
 * @module __tests__/lib/site-util/auth/user-keys.test.ts
 */

import {
  validateUserKeysAgainstServer,
  hasValidLocalKeys,
  generateUserKeyPair,
  getUserPublicKey,
  getUserPrivateKey,
} from '@/lib/site-util/auth/user-keys';
import { TimeoutError } from '@opentelemetry/core';
import { mockDeep } from 'jest-mock-extended';

// Mock db get promise
let mockDbGet: (PromiseWithResolvers<any> & { mockTimeout?: number | NodeJS.Timeout;} ) = Promise.withResolvers<any>();

// Mock IndexedDB
const mockIDBDatabase = {
  transaction: jest.fn(),
  createObjectStore: jest.fn(),
  objectStoreNames: {
    contains: jest.fn(),
  },
};

const mockIDBTransaction = {
  objectStore: jest.fn(),
  onsuccess: null as any,
  onerror: null as any,
};

const mockIDBObjectStore = {
  put: jest.fn(),
  get: jest.fn(),
};

const mockIDBRequest = {
  result: null as any,
  error: null as any,
  onsuccess: null as any,
  onerror: null as any,
};

const mockIndexedDb = mockDeep<IDBIndex>();
// Mock IndexedDB globally
Object.defineProperty(window, 'indexedDB', {
  value: {
    open: jest.fn(),
  },
});

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

describe('UserKeyManager Enhancements', () => {
  beforeEach(() => {
    //jest.clearAllMocks();
    
    // Reset mock implementations
    mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
    mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);
    mockIDBObjectStore.put.mockReturnValue(mockIDBRequest);
    mockIDBObjectStore.get.mockReturnValue(mockIDBRequest);
    mockDbGet = Promise.withResolvers<any>();
    if (mockIDBRequest.mockTimeout) {
      clearTimeout(mockIDBRequest.mockTimeout);

    // Mock IndexedDB open to return successful connection
    (window.indexedDB.open as jest.Mock).mockImplementation(() => {
      const request = {
        result: mockIDBDatabase,
        error: null,
        onsuccess: null as (() => void) | null,
        onerror: null as any,
        onupgradeneeded: null as any,
      };
      jest.spyOn(request, 'onsuccess', 'set').mockImplementation((event) => {
        if (!event) return;
        mockDbGet.then((x) => {
          event();
          return x;
        });
        if (!mockDbGet.mockTimeout) {          
          mockDbGet.mockTimeout = setTimeout(() => {
            mockDbGet.reject(new Error('KABOOOOOOOOM!'));
          }, 5000);
        }
      });
      afterEach(() => {
        if (mockDbGet.mockTimeout) {
          clearTimeout(mockDbGet.mockTimeout);
          mockDbGet.mockTimeout = undefined;
        }

      });
      jest.spyOn(request, 'onerror', 'set').mockImplementation((event) => {
        if (!event) return;
        mockDbGet.promise.catch(() => event());        
        mockDbGet.mockTimeout = setTimeout(() => {          
            mockDbGet.reject(new Error('KABOOOOOOOOM!'));         
        }, 5000);        
      });
      jest.spyOn(request, 'result', 'set').mockImplementation((event) => {
        mockDbGet.resolve(event);
        if (mockDbGet.mockTimeout) {
          clearTimeout(mockDbGet.mockTimeout);
          mockDbGet.mockTimeout = undefined;  
        }
      });

      return request;
    });
  });

  describe('hasValidLocalKeys', () => {
    it('should return true when both public and private keys exist', async () => {
      // Mock successful key retrieval
      mockIDBRequest.result = {
        publicKey: {} as CryptoKey,
        privateKey: {} as CryptoKey,
      };
      
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess({ target: mockIDBRequest });
        }
      }, 0);
      
      const result = await hasValidLocalKeys();
      expect(result).toBe(true);
    });

    it('should return false when no keys exist', async () => {
      // Mock no keys found
      mockIDBRequest.result = null;
      
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess({ target: mockIDBRequest });
        }
      }, 0);
      
      const result = await hasValidLocalKeys();
      expect(result).toBe(false);
    });

    it('should return false when only public key exists', async () => {
      // Mock only public key exists
      mockIDBRequest.result = {
        publicKey: {} as CryptoKey,
        privateKey: null,
      };
      
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess({ target: mockIDBRequest });
        }
      }, 0);
      
      const result = await hasValidLocalKeys();
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockIDBRequest.error = new Error('Database error');
      
      setTimeout(() => {
        if (mockIDBRequest.onerror) {
          mockIDBRequest.onerror({ target: mockIDBRequest });
        }
      }, 0);
      
      const result = await hasValidLocalKeys();
      expect(result).toBe(false);
    });
  });

  describe('validateUserKeysAgainstServer', () => {
    const testServerKeys = ['server-key-1', 'server-key-2', 'server-key-3'];

    it('should return true when local key matches server key', async () => {
      const testLocalKey = 'server-key-2'; // Matches second server key
      
      // Mock successful key retrieval
      mockIDBRequest.result = {
        publicKey: {} as CryptoKey,
        privateKey: {} as CryptoKey,
      };
      
      // Mock crypto export and btoa
      mockCryptoSubtle.exportKey.mockResolvedValue(new Uint8Array([1, 2, 3]));
      (global.btoa as jest.Mock).mockReturnValue(testLocalKey);
      
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess({ target: mockIDBRequest });
        }
      }, 0);
      
      const result = await validateUserKeysAgainstServer(testServerKeys);
      expect(result).toBe(true);
    });

    it('should return false when local key does not match any server key', async () => {
      const testLocalKey = 'different-key'; // Does not match any server key
      
      // Mock successful key retrieval
      mockIDBRequest.result = {
        publicKey: {} as CryptoKey,
        privateKey: {} as CryptoKey,
      };
      
      // Mock crypto export and btoa
      mockCryptoSubtle.exportKey.mockResolvedValue(new Uint8Array([1, 2, 3]));
      (global.btoa as jest.Mock).mockReturnValue(testLocalKey);
      
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess({ target: mockIDBRequest });
        }
      }, 0);
      
      const result = await validateUserKeysAgainstServer(testServerKeys);
      expect(result).toBe(false);
    });

    it('should return false when no local key exists', async () => {
      // Mock no keys found
      mockIDBRequest.result = null;
      
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess({ target: mockIDBRequest });
        }
      }, 0);
      
      const result = await validateUserKeysAgainstServer(testServerKeys);
      expect(result).toBe(false);
    });

    it('should handle crypto export errors gracefully', async () => {
      // Mock successful key retrieval but failed export
      mockIDBRequest.result = {
        publicKey: {} as CryptoKey,
        privateKey: {} as CryptoKey,
      };
      
      mockCryptoSubtle.exportKey.mockRejectedValue(new Error('Export failed'));
      
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess({ target: mockIDBRequest });
        }
      }, 0);
      
      const result = await validateUserKeysAgainstServer(testServerKeys);
      expect(result).toBe(false);
    });

    it('should handle empty server keys array', async () => {
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
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess({ target: mockIDBRequest });
        }
      }, 0);
      
      const result = await generateUserKeyPair();
      
      expect(result).toEqual(mockKeyPair);
      expect(mockCryptoSubtle.generateKey).toHaveBeenCalledWith(
        {
          name: 'ECDSA',
          namedCurve: 'P-256',
        },
        false,
        ['sign', 'verify']
      );
    });

    it('should handle crypto generation errors', async () => {
      mockCryptoSubtle.generateKey.mockRejectedValue(new Error('Generation failed'));
      
      await expect(generateUserKeyPair()).rejects.toThrow('Generation failed');
    });

    it('should handle storage errors gracefully', async () => {
      const mockKeyPair = {
        publicKey: {} as CryptoKey,
        privateKey: {} as CryptoKey,
      };
      
      mockCryptoSubtle.generateKey.mockResolvedValue(mockKeyPair);
      
      // Mock storage error
      setTimeout(() => {
        if (mockIDBRequest.onerror) {
          mockIDBRequest.onerror({ target: { error: new Error('Storage failed') } });
        }
      }, 0);
      
      await expect(generateUserKeyPair()).rejects.toThrow();
    });
  });

  describe('getUserPublicKey', () => {
    it('should retrieve public key from storage', async () => {
      const mockPublicKey = {} as CryptoKey;
      
      mockIDBRequest.result = {
        publicKey: mockPublicKey,
        privateKey: {} as CryptoKey,
      };

      
      const result = await getUserPublicKey();
      expect(result).toBe(mockPublicKey);
    });

    it('should return null when no key exists', async () => {
      mockIDBRequest.result = null;
      
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess({ target: mockIDBRequest });
        }
      }, 0);
      
      const result = await getUserPublicKey();
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      setTimeout(() => {
        if (mockIDBRequest.onerror) {
          mockIDBRequest.onerror({ target: mockIDBRequest });
        }
      }, 0);
      
      const result = await getUserPublicKey();
      expect(result).toBeNull();
    });
  });

  describe('getUserPrivateKey', () => {
    it('should retrieve private key from storage', async () => {
      const mockPrivateKey = {} as CryptoKey;
      
      mockIDBRequest.result = {
        publicKey: {} as CryptoKey,
        privateKey: mockPrivateKey,
      };
      
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess({ target: mockIDBRequest });
        }
      }, 0);
      
      const result = await getUserPrivateKey();
      expect(result).toBe(mockPrivateKey);
    });

    it('should return null when no key exists', async () => {
      mockIDBRequest.result = null;
      
      setTimeout(() => {
        if (mockIDBRequest.onsuccess) {
          mockIDBRequest.onsuccess({ target: mockIDBRequest });
        }
      }, 0);
      
      const result = await getUserPrivateKey();
      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      setTimeout(() => {
        if (mockIDBRequest.onerror) {
          mockIDBRequest.onerror({ target: mockIDBRequest });
        }
      }, 0);
      
      const result = await getUserPrivateKey();
      expect(result).toBeNull();
    });
  });
});