import { log } from '@compliance-theater/logger';
import { SingletonProvider } from '@compliance-theater/typescript';

const KEY_VALIDATION_STORAGE_KEY = 'lastKeyValidation';

export const KEY_VALIDATION_INTERVAL = 2 * 60 * 60 * 1000;

export interface KeyValidationResult {
  isValid: boolean;
  hasLocalKey: boolean;
  matchesServerKey: boolean;
  error?: string;
  action: 'none' | 'generate_key' | 'upload_key' | 'retry';
}

export interface KeySyncResult {
  success: boolean;
  newPublicKey?: string;
  error?: string;
}

export function isKeyValidationDue(): boolean {
  try {
    const lastValidationTime = SingletonProvider.Instance.get<number>(
      KEY_VALIDATION_STORAGE_KEY
    );
    if (!lastValidationTime || isNaN(lastValidationTime)) {
      return true; // Never validated before
    }

    const now = Date.now();
    const timeSinceLastValidation = now - lastValidationTime;

    return timeSinceLastValidation >= KEY_VALIDATION_INTERVAL;
  } catch (error) {
    log((l) => l.warn('Failed to check key validation timing', { error }));
    return true; // Default to validation needed if we can't check
  }
}

export function updateKeyValidationTimestamp(): void {
  try {
    SingletonProvider.Instance.set(KEY_VALIDATION_STORAGE_KEY, Date.now());
  } catch (error) {
    log((l) => l.warn('Failed to update key validation timestamp', { error }));
  }
}

async function exportPublicKeyToBase64(publicKey: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', publicKey);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function validateUserKeys(
  serverPublicKeys: string[],
  getUserPublicKey: () => Promise<CryptoKey | null>
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
      (serverKey) => serverKey === localPublicKeyBase64
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
      })
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
  }) => Promise<void>
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
  }
): Promise<{ validated: boolean; synchronized: boolean; error?: string }> {
  try {
    // Validate current keys
    const validationResult = await validateUserKeys(
      serverPublicKeys,
      keyManagerMethods.getPublicKey
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
        keyManagerMethods.uploadPublicKeyToServer
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
