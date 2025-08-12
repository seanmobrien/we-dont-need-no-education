import { LoggedError } from '@/lib/react-util/errors/logged-error';



/**
 * Key pair management for user signing
 */
class UserKeyManager {
  private static readonly DB_NAME = 'UserKeyStore';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'keys';
  private static readonly KEY_ID = 'userSigningKey';

  /**
   * Opens IndexedDB connection
   */
  private static async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
    });
  }

  /**
   * Generates and stores a new ECDSA key pair
   */
  static async generateKeyPair(): Promise<{
    publicKey: CryptoKey;
    privateKey: CryptoKey;
  }> {
    if (!window.crypto?.subtle) {
      throw new Error('Web Crypto API not available. Requires HTTPS context.');
    }

    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256', // Fast and secure curve
      },
      false, // Non-extractable for security
      ['sign', 'verify'],
    );

    // Store the key pair in IndexedDB
    const db = await this.openDB();
    const transaction = db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.put(
        {
          publicKey: keyPair.publicKey,
          privateKey: keyPair.privateKey,
          created: new Date().toISOString(),
        },
        this.KEY_ID,
      );

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return keyPair;
  }

  /**
   * Retrieves the user's private key from IndexedDB
   */
  static async getPrivateKey(): Promise<CryptoKey | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);

      return new Promise<CryptoKey | null>((resolve) => {
        const request = store.get(this.KEY_ID);

        request.onsuccess = () => {
          const result = request.result;
          resolve(result?.privateKey || null);
        };

        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Gets the user's public key for server verification
   */
  static async getPublicKey(): Promise<CryptoKey | null> {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);

      return new Promise<CryptoKey | null>((resolve) => {
        const request = store.get(this.KEY_ID);

        request.onsuccess = () => {
          const result = request.result;
          resolve(result?.publicKey || null);
        };

        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Exports public key to send to server for user account association
   */
  static async exportPublicKeyForServer({
    publicKey,
  }: { publicKey?: CryptoKey | undefined } | undefined = {}): Promise<string | null> {
    const key = publicKey ?? (await this.getPublicKey());
    if (!key) return null;

    const exported = await crypto.subtle.exportKey('spki', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  /**
   * Ensures user has a key pair, generating one if needed
   */
  static async ensureKeyPair(): Promise<void> {
    const privateKey = await this.getPrivateKey();
    if (!privateKey) {
      await this.generateKeyPair();
    }
  }

  /**
   * Validates that the local public key matches one of the provided server keys
   */
  static async validateAgainstServerKeys(
    serverKeys: string[],
  ): Promise<boolean> {
    try {
      const localPublicKey = await this.getPublicKey();
      if (!localPublicKey) {
        return false;
      }

      const localPublicKeyBase64 =
        await this.exportPublicKeyToBase64(localPublicKey);
      return serverKeys.includes(localPublicKeyBase64);
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        message: 'Failed to validate against server keys',
        context: { serverKeys }
      });
      return false;
    }
  }

  /**
   * Exports a public key to base64 string format
   */
  private static async exportPublicKeyToBase64(
    publicKey: CryptoKey,
  ): Promise<string> {
    const exported = await crypto.subtle.exportKey('spki', publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  /**
   * Checks if the user has any valid keys stored locally
   */
  static async hasValidKeys(): Promise<boolean> {
    try {
      const publicKey = await this.getPublicKey();
      const privateKey = await this.getPrivateKey();
      return publicKey !== null && privateKey !== null;
    } catch {
      return false;
    }
  }
}

/**
 * Signs data using ECDSA with the user's private key
 */
export const signData = async (data: string): Promise<string> => {
  await UserKeyManager.ensureKeyPair();
  const privateKey = await UserKeyManager.getPrivateKey();
  
  if (!privateKey) {
    throw new Error('Failed to retrieve user private key');
  }

  // Create a message to sign
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Sign the data
  const signature = await crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: 'SHA-256',
    },
    privateKey,
    dataBuffer
  );

  // Convert signature to base64 string
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
};

/**
 * Export user's public key for server-side verification setup
 * Call this when user first logs in to associate their public key with their account
 */
export const getUserPublicKeyForServer = async (props?: { publicKey?: CryptoKey | undefined }): Promise<
  string | null
> => {
  return await UserKeyManager.exportPublicKeyForServer(props);
};

/**
 * Initialize user's key pair (call this on app startup or user login)
 */
export const initializeUserKeys = async (): Promise<void> => {
  await UserKeyManager.ensureKeyPair();
};

/**
 * Validates that the user's local keys match server-registered keys
 */
export const validateUserKeysAgainstServer = async (serverKeys: string[]): Promise<boolean> => {
  return await UserKeyManager.validateAgainstServerKeys(serverKeys);
};

/**
 * Checks if user has valid keys stored locally
 */
export const hasValidLocalKeys = async (): Promise<boolean> => {
  return await UserKeyManager.hasValidKeys();
};

/**
 * Generate and return a new key pair, storing it locally
 */
export const generateUserKeyPair = async (): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> => {
  return await UserKeyManager.generateKeyPair();
};

/**
 * Get the user's stored public key
 */
export const getUserPublicKey = async (): Promise<CryptoKey | null> => {
  return await UserKeyManager.getPublicKey();
};

/**
 * Get the user's stored private key
 */
export const getUserPrivateKey = async (): Promise<CryptoKey | null> => {
  return await UserKeyManager.getPrivateKey();
};


