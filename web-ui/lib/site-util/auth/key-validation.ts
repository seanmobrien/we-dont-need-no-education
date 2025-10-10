/**
 * @fileoverview Key validation utilities for user authentication
 *
 * This module provides utilities for validating user cryptographic keys
 * against server-stored public keys, ensuring users maintain valid
 * credentials for secure operations.
 *
 * @module lib/site-util/auth/key-validation
 */

import { log } from '@/lib/logger';

/**
 * Storage key for tracking last key validation timestamp
 */
const KEY_VALIDATION_STORAGE_KEY = 'lastKeyValidation';

/**
 * Interval between key validations (2 hours in milliseconds)
 */
export const KEY_VALIDATION_INTERVAL = 2 * 60 * 60 * 1000;

/**
 * Result of key validation operation
 */
export interface KeyValidationResult {
  /** Whether the validation was successful */
  isValid: boolean;
  /** Whether user has a local private key */
  hasLocalKey: boolean;
  /** Whether local key matches any server keys */
  matchesServerKey: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Recommended action based on validation result */
  action: 'none' | 'generate_key' | 'upload_key' | 'retry';
}

/**
 * Result of key synchronization operation
 */
export interface KeySyncResult {
  /** Whether synchronization was successful */
  success: boolean;
  /** New public key that was uploaded (base64 encoded) */
  newPublicKey?: string;
  /** Error message if sync failed */
  error?: string;
}

/**
 * Checks if key validation is due based on last validation timestamp
 */
export function isKeyValidationDue(): boolean {
  try {
    const lastValidation =
      globalThis.localStorage &&
      globalThis.localStorage.getItem(KEY_VALIDATION_STORAGE_KEY);
    if (!lastValidation) {
      return true; // Never validated before
    }
    const lastValidationTime = parseInt(lastValidation, 10);

    // If parsing failed, default to validation needed
    if (isNaN(lastValidationTime)) {
      return true;
    }

    const now = Date.now();
    const timeSinceLastValidation = now - lastValidationTime;

    return timeSinceLastValidation >= KEY_VALIDATION_INTERVAL;
  } catch (error) {
    log((l) => l.warn('Failed to check key validation timing', { error }));
    return true; // Default to validation needed if we can't check
  }
}

/**
 * Updates the last key validation timestamp
 */
export function updateKeyValidationTimestamp(): void {
  try {
    localStorage.setItem(KEY_VALIDATION_STORAGE_KEY, Date.now().toString());
  } catch (error) {
    log((l) => l.warn('Failed to update key validation timestamp', { error }));
  }
}

/**
 * Converts a CryptoKey public key to base64 string for comparison
 */
async function exportPublicKeyToBase64(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', publicKey);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

/**
 * Derives the public key from a private key
async function derivePublicKeyFromPrivate(privateKey: CryptoKey): Promise<CryptoKey> {
  // For ECDSA, we need to extract the public key from the private key
  // This is done by exporting the private key and importing just the public portion
  const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
  const buffer = new Uint8Array(exported);
  
  // Extract the public key portion from the PKCS#8 private key
  // This is a simplified approach - in production, you might want to use a library
  // For now, we'll generate a matching public key by creating a key pair with the same algorithm
  
  // Alternative approach: derive public key by creating signature and verifying
  // This is more reliable for ECDSA keys
  const testData = new TextEncoder().encode('test');
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    testData
  );
  
  // Since we can't directly derive the public key from private key in Web Crypto API,
  // we'll use the fact that the key pair was stored together in IndexedDB
  // and retrieve the public key from there
  throw new Error('Cannot derive public key from private key directly in Web Crypto API');
}
 */

/**
 * Validates user's local cryptographic keys against server's registered public keys
 */
export async function validateUserKeys(
  serverPublicKeys: string[],
  getUserPublicKey: () => Promise<CryptoKey | null>,
): Promise<KeyValidationResult> {
  try {
    // Check if user has a local public key
    const localPublicKey = await getUserPublicKey();

    if (!localPublicKey) {
      return {
        isValid: false,
        hasLocalKey: false,
        matchesServerKey: false,
        action: 'generate_key',
      };
    }

    // Convert local public key to base64 for comparison
    const localPublicKeyBase64 = await exportPublicKeyToBase64(localPublicKey);

    // Check if local key matches any server key
    const matchesServerKey = serverPublicKeys.some(
      (serverKey) => serverKey === localPublicKeyBase64,
    );

    if (matchesServerKey) {
      return {
        isValid: true,
        hasLocalKey: true,
        matchesServerKey: true,
        action: 'none',
      };
    }

    // Local key exists but doesn't match server keys
    return {
      isValid: false,
      hasLocalKey: true,
      matchesServerKey: false,
      action: 'upload_key', // Try uploading current key first
    };
  } catch (error) {
    log((l) =>
      l.error('Key validation failed', {
        error,
        serverPublicKeys: serverPublicKeys.length,
      }),
    );
    return {
      isValid: false,
      hasLocalKey: false,
      matchesServerKey: false,
      error:
        error instanceof Error ? error.message : 'Unknown validation error',
      action: 'retry',
    };
  }
}

/**
 * Synchronizes user keys by generating new keys and uploading to server
 */
export async function synchronizeKeys(
  generateKeyPair: () => Promise<{
    publicKey: CryptoKey;
    privateKey: CryptoKey;
  }>,
  exportPublicKeyForServer: () => Promise<string | null>,
  uploadPublicKeyToServer: ({
    publicKey,
  }: {
    publicKey: string;
  }) => Promise<void>,
): Promise<KeySyncResult> {
  try {
    log((l) => l.info('Starting key synchronization'));

    // Generate new key pair
    await generateKeyPair();

    // Export new public key for server
    const newPublicKeyBase64 = await exportPublicKeyForServer();

    if (!newPublicKeyBase64) {
      throw new Error('Failed to export new public key');
    }

    await uploadPublicKeyToServer({
      publicKey: newPublicKeyBase64,
    });

    /*
    // Upload public key to server
    const uploadResponse = await fetch('/api/auth/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        publicKey: newPublicKeyBase64,
      }),
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Key upload failed: ${uploadResponse.status} ${errorText}`);
    }
    
    const result = await uploadResponse.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Key upload was not successful');
    }
    */

    // Update validation timestamp on successful sync
    updateKeyValidationTimestamp();

    log((l) => l.info('Key synchronization completed successfully'));

    return {
      success: true,
      newPublicKey: newPublicKeyBase64,
    };
  } catch (error) {
    log((l) => l.error('Key synchronization failed', { error }));
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown sync error',
    };
  }
}

/**
 * Performs the complete key validation and synchronization workflow
 *
 * This is the main function that should be called to validate and sync keys
 */
export async function performKeyValidationWorkflow(
  serverPublicKeys: string[],
  keyManagerMethods: {
    getPublicKey: () => Promise<CryptoKey | null>;
    generateKeyPair: () => Promise<{
      publicKey: CryptoKey;
      privateKey: CryptoKey;
    }>;
    exportPublicKeyForServer: () => Promise<string | null>;
    uploadPublicKeyToServer: ({
      publicKey,
    }: {
      publicKey: string;
    }) => Promise<void>;
  },
): Promise<{ validated: boolean; synchronized: boolean; error?: string }> {
  try {
    // Validate current keys
    const validationResult = await validateUserKeys(
      serverPublicKeys,
      keyManagerMethods.getPublicKey,
    );

    if (validationResult.isValid) {
      updateKeyValidationTimestamp();
      return { validated: true, synchronized: false };
    }
    // If validation failed, try to synchronize
    if (validationResult.action === 'upload_key') {
      const publicKey = await keyManagerMethods.exportPublicKeyForServer();
      if (!publicKey) {
        return {
          validated: false,
          synchronized: false,
          error: 'Failed to export public key for upload',
        };
      }
      await keyManagerMethods.uploadPublicKeyToServer({
        publicKey,
      });
    }

    if (validationResult.action === 'generate_key') {
      const syncResult = await synchronizeKeys(
        keyManagerMethods.generateKeyPair,
        keyManagerMethods.exportPublicKeyForServer,
        keyManagerMethods.uploadPublicKeyToServer,
      );

      if (syncResult.success) {
        return { validated: true, synchronized: true };
      } else {
        return {
          validated: false,
          synchronized: false,
          error: syncResult.error,
        };
      }
    }

    return {
      validated: false,
      synchronized: false,
      error: validationResult.error || 'Key validation failed',
    };
  } catch (error) {
    log((l) => l.error('Key validation workflow failed', { error }));
    return {
      validated: false,
      synchronized: false,
      error: error instanceof Error ? error.message : 'Unknown workflow error',
    };
  }
}
