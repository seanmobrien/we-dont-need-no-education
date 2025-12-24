declare module '@/lib/site-util/auth/key-validation' {
  /**
   * @fileoverview Key validation utilities for user authentication
   *
   * This module provides utilities for validating user cryptographic keys
   * against server-stored public keys, ensuring users maintain valid
   * credentials for secure operations.
   *
   * @module lib/site-util/auth/key-validation
   */

  /**
   * Interval between key validations (2 hours in milliseconds)
   */
  export const KEY_VALIDATION_INTERVAL: number;

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
  export function isKeyValidationDue(): boolean;

  /**
   * Updates the last key validation timestamp
   */
  export function updateKeyValidationTimestamp(): void;

  /**
   * Validates user's local cryptographic keys against server's registered public keys
   */
  export function validateUserKeys(
    serverPublicKeys: string[],
    getUserPublicKey: () => Promise<CryptoKey | null>,
  ): Promise<KeyValidationResult>;

  /**
   * Synchronizes user keys by generating new keys and uploading to server
   */
  export function synchronizeKeys(
    generateKeyPair: () => Promise<{
      publicKey: CryptoKey;
      privateKey: CryptoKey;
    }>,
    exportPublicKeyForServer: () => Promise<string | null>,
    uploadPublicKeyToServer: (params: { publicKey: string }) => Promise<void>,
  ): Promise<KeySyncResult>;

  /**
   * Performs the complete key validation and synchronization workflow
   *
   * This is the main function that should be called to validate and sync keys
   */
  export function performKeyValidationWorkflow(
    serverPublicKeys: string[],
    keyManagerMethods: {
      getPublicKey: () => Promise<CryptoKey | null>;
      generateKeyPair: () => Promise<{
        publicKey: CryptoKey;
        privateKey: CryptoKey;
      }>;
      exportPublicKeyForServer: () => Promise<string | null>;
      uploadPublicKeyToServer: (params: { publicKey: string }) => Promise<void>;
    },
  ): Promise<{ validated: boolean; synchronized: boolean; error?: string }>;
}
