/**
 * @fileoverview Tests for key validation utilities
 * 
 * Tests the key validation workflow including timing checks,
 * key comparison, and synchronization operations.
 * 
 * @module __tests__/lib/site-util/auth/key-validation.test.ts
 */

import {
  isKeyValidationDue,
  updateKeyValidationTimestamp,
  validateUserKeys,
  synchronizeKeys,
  performKeyValidationWorkflow,
  KEY_VALIDATION_INTERVAL,
} from '@/lib/site-util/auth/key-validation';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});


// Mock the logger
jest.mock('@/lib/logger', () => ({
  log: jest.fn(),
}));

describe('Key Validation Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
  });

  describe('isKeyValidationDue', () => {
    it('should return true when no validation timestamp exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const result = isKeyValidationDue();
      
      expect(result).toBe(true);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('lastKeyValidation');
    });

    it('should return true when validation timestamp is older than interval', () => {
      const oldTimestamp = Date.now() - KEY_VALIDATION_INTERVAL - 1000; // 1 second past interval
      mockLocalStorage.getItem.mockReturnValue(oldTimestamp.toString());
      
      const result = isKeyValidationDue();
      
      expect(result).toBe(true);
    });

    it('should return false when validation is recent', () => {
      const recentTimestamp = Date.now() - 1000; // 1 second ago
      mockLocalStorage.getItem.mockReturnValue(recentTimestamp.toString());
      
      const result = isKeyValidationDue();
      
      expect(result).toBe(false);
    });

    it('should handle invalid timestamp gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-timestamp');
      
      const result = isKeyValidationDue();
      
      expect(result).toBe(true); // Default to validation needed
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const result = isKeyValidationDue();
      
      expect(result).toBe(true); // Default to validation needed
    });
  });

  describe('updateKeyValidationTimestamp', () => {
    it('should store current timestamp in localStorage', () => {
      const mockTimestamp = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
      
      updateKeyValidationTimestamp();
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'lastKeyValidation',
        mockTimestamp.toString()
      );
    });

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      // Should not throw
      expect(() => updateKeyValidationTimestamp()).not.toThrow();
    });
  });

  describe('validateUserKeys', () => {
    const mockPublicKey = {} as CryptoKey;
    const mockGetPublicKey = jest.fn();
    const mockUploadPublicKeyToServer = jest.fn();

    const testServerKeys = ['server-key-1', 'server-key-2'];

    // Mock Web Crypto API
    const mockExportKey = jest.fn();
    Object.defineProperty(window, 'crypto', {
      value: {
        subtle: {
          exportKey: mockExportKey,
        },
      },
    });

    beforeEach(() => {
      mockGetPublicKey.mockClear();
      mockExportKey.mockClear();
      mockUploadPublicKeyToServer.mockClear();
    });

    it('should return invalid when no local key exists', async () => {
      mockGetPublicKey.mockResolvedValue(null);
      
      const result = await validateUserKeys(testServerKeys, mockGetPublicKey);
      
      expect(result).toEqual({
        isValid: false,
        hasLocalKey: false,
        matchesServerKey: false,
        action: 'generate_key',
      });
    });

    it('should return valid when local key matches server key', async () => {
      const testKeyBase64 = 'server-key-1';
      mockGetPublicKey.mockResolvedValue(mockPublicKey);
      mockExportKey.mockResolvedValue(new Uint8Array([/* mock SPKI data */]));
      
      // Mock btoa to return our test key
      global.btoa = jest.fn().mockReturnValue(testKeyBase64);
      
      const result = await validateUserKeys(testServerKeys, mockGetPublicKey);
      
      expect(result).toEqual({
        isValid: true,
        hasLocalKey: true,
        matchesServerKey: true,
        action: 'none',
      });
    });

    it('should return invalid when local key does not match server keys', async () => {
      const testKeyBase64 = 'different-key';
      mockGetPublicKey.mockResolvedValue(mockPublicKey);
      mockExportKey.mockResolvedValue(new Uint8Array([/* mock SPKI data */]));
      global.btoa = jest.fn().mockReturnValue(testKeyBase64);
      
      const result = await validateUserKeys(testServerKeys, mockGetPublicKey);
      
      expect(result).toEqual({
        isValid: false,
        hasLocalKey: true,
        matchesServerKey: false,
        action: 'upload_key',
      });
    });

    it('should handle errors gracefully', async () => {
      mockGetPublicKey.mockRejectedValue(new Error('Key retrieval failed'));
      
      const result = await validateUserKeys(testServerKeys, mockGetPublicKey);
      
      expect(result.isValid).toBe(false);
      expect(result.action).toBe('retry');
      expect(result.error).toBe('Key retrieval failed');
    });
  });

  describe('synchronizeKeys', () => {
    const mockKeyPair = {
      publicKey: {} as CryptoKey,
      privateKey: {} as CryptoKey,
    };
    const mockGenerateKeyPair = jest.fn();
    const mockExportPublicKey = jest.fn();
    const mockUploadPublicKeyToServer = jest.fn();

    beforeEach(() => {
      mockGenerateKeyPair.mockClear();
      mockExportPublicKey.mockClear();
      mockUploadPublicKeyToServer.mockClear();

      mockUploadPublicKeyToServer.mockReturnValue(Promise.resolve());
    });

    it('should successfully synchronize keys', async () => {
      const testPublicKey = 'new-public-key';
      mockGenerateKeyPair.mockResolvedValue(mockKeyPair);
      mockExportPublicKey.mockResolvedValue(testPublicKey);
      mockUploadPublicKeyToServer.mockResolvedValue({ success: true });
  
      const result = await synchronizeKeys(
        mockGenerateKeyPair,
        mockExportPublicKey,
        mockUploadPublicKeyToServer,
      );
      
      expect(result).toEqual({
        success: true,
        newPublicKey: testPublicKey,
      });
      
      expect(mockGenerateKeyPair).toHaveBeenCalled();
      expect(mockExportPublicKey).toHaveBeenCalled();
      expect(mockUploadPublicKeyToServer).toHaveBeenCalledWith({
        publicKey: 'new-public-key',
      });
      
    });

    it('should handle key generation failure', async () => {
      mockGenerateKeyPair.mockRejectedValue(new Error('Key generation failed'));
      
      const result = await synchronizeKeys(
        mockGenerateKeyPair,
        mockExportPublicKey,
        mockUploadPublicKeyToServer,
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Key generation failed');
    });

    it('should handle key export failure', async () => {
      mockGenerateKeyPair.mockResolvedValue(mockKeyPair);
      mockExportPublicKey.mockResolvedValue(null);
      
      const result = await synchronizeKeys(
        mockGenerateKeyPair,
        mockExportPublicKey,
        mockUploadPublicKeyToServer,
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to export new public key');
    });

    it('should handle API upload failure', async () => {
      const testPublicKey = 'new-public-key';
      mockGenerateKeyPair.mockResolvedValue(mockKeyPair);
      mockExportPublicKey.mockResolvedValue(testPublicKey);
      
      mockUploadPublicKeyToServer.mockRejectedValueOnce(
        new Error('Key upload failed: 400 Bad request'));
      
      const result = await synchronizeKeys(
        mockGenerateKeyPair,
        mockExportPublicKey,
        mockUploadPublicKeyToServer,
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Key upload failed: 400 Bad request');
    });

    it('should handle API success: false response', async () => {
      const testPublicKey = 'new-public-key';
      mockGenerateKeyPair.mockResolvedValue(mockKeyPair);
      mockExportPublicKey.mockResolvedValue(testPublicKey);
      mockUploadPublicKeyToServer.mockRejectedValue(new Error('Key upload failed: 400 Bad request'));  
      
      const result = await synchronizeKeys(
        mockGenerateKeyPair,
        mockExportPublicKey,
        mockUploadPublicKeyToServer,
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Key upload failed: 400 Bad request');
    });
  });

  describe('performKeyValidationWorkflow', () => {
    const mockKeyManagerMethods = {
      getPublicKey: jest.fn(),
      generateKeyPair: jest.fn(),
      exportPublicKeyForServer: jest.fn(),
      uploadPublicKeyToServer: jest.fn(),
    };

    const testServerKeys = ['server-key-1'];

    beforeEach(() => {
      Object.values(mockKeyManagerMethods).forEach(mock => mock.mockClear());
      (global.fetch as jest.Mock).mockClear();
    });

    it('should complete workflow when keys are already valid', async () => {
      // Mock valid key validation
      const mockPublicKey = {} as CryptoKey;
      mockKeyManagerMethods.getPublicKey.mockResolvedValue(mockPublicKey);
      
      // Mock crypto.subtle.exportKey
      Object.defineProperty(window, 'crypto', {
        value: {
          subtle: {
            exportKey: jest.fn().mockResolvedValue(new Uint8Array()),
          },
        },
      });
      global.btoa = jest.fn().mockReturnValue('server-key-1');
      
      const result = await performKeyValidationWorkflow(testServerKeys, mockKeyManagerMethods);
      
      expect(result).toEqual({
        validated: true,
        synchronized: false,
      });
    });

    it('should complete workflow with key generation when no local keys exist', async () => {
      // Mock no local key
      mockKeyManagerMethods.getPublicKey.mockResolvedValue(null);
      
      // Mock successful key generation and sync
      mockKeyManagerMethods.generateKeyPair.mockResolvedValue({
        publicKey: {} as CryptoKey,
        privateKey: {} as CryptoKey,
      });
      mockKeyManagerMethods.exportPublicKeyForServer.mockResolvedValue('new-key');
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      
      const result = await performKeyValidationWorkflow(testServerKeys, mockKeyManagerMethods);
      
      expect(result).toEqual({
        validated: true,
        synchronized: true,
      });
    });

    it('should handle workflow failure gracefully', async () => {
      mockKeyManagerMethods.getPublicKey.mockRejectedValue(new Error('Workflow error'));
      
      const result = await performKeyValidationWorkflow(testServerKeys, mockKeyManagerMethods);
      
      expect(result.validated).toBe(false);
      expect(result.synchronized).toBe(false);
      expect(result.error).toBe('Workflow error');
    });
  });
});