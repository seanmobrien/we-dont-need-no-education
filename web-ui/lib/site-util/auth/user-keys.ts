import { eq, lte, gte, and, or, isNull } from 'drizzle-orm';
import { drizDb, DatabaseType, schema, type UserPublicKeysType } from '@/lib/drizzle-db';
import { auth } from '@/auth';

/**
 * Returns all public keys for a user that were active at a given date.
 * @param userId - The user's id (number)
 * @param effectiveDate - ISO string or Date for the point in time
 * @param db - Drizzle database instance (must be provided by caller)
 */
export async function getActiveUserPublicKeys({db: database, effectiveDate, userId: userIdFromProps } : { userId: number; effectiveDate?: string | Date; db?: DatabaseType; }): Promise<string[]> {
  const dbInstance = database ?? drizDb();
  const date = typeof effectiveDate === 'undefined' 
    ? new Date() 
    : (typeof effectiveDate === 'string' ? new Date(effectiveDate) : effectiveDate);
  let userId: number;
  if (userIdFromProps) {
    userId = userIdFromProps;
  } else {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      throw new Error('User is not authenticated or user ID is missing');
    }
    userId = typeof session.user.id === 'number' ? session.user.id : parseInt(session.user.id, 10);
    if (isNaN(userId)) {
      throw new Error('Invalid user ID format');  
    }
  }
  // Query userPublicKeys for keys where:
  // userId matches, effectiveDate <= date, and (expirationDate is null or expirationDate > date)
  const keys = await dbInstance
    .select()
    .from(schema.userPublicKeys)
    .where(
      and(
        eq(schema.userPublicKeys.userId, userId),
        gte(schema.userPublicKeys.effectiveDate, date.toISOString()),
        or(
          isNull(schema.userPublicKeys.expirationDate),
          lte(schema.userPublicKeys.expirationDate, date.toISOString()),
        ),
      ),
    );
  return keys.map((k: UserPublicKeysType) => k.publicKey);
}
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
  static async generateKeyPair(): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
    if (!window.crypto?.subtle) {
      throw new Error('Web Crypto API not available. Requires HTTPS context.');
    }

    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256', // Fast and secure curve
      },
      false, // Non-extractable for security
      ['sign', 'verify']
    );

    // Store the key pair in IndexedDB
    const db = await this.openDB();
    const transaction = db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        created: new Date().toISOString(),
      }, this.KEY_ID);
      
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
  static async exportPublicKeyForServer(): Promise<string | null> {
    const publicKey = await this.getPublicKey();
    if (!publicKey) return null;

    const exported = await crypto.subtle.exportKey('spki', publicKey);
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
export const getUserPublicKeyForServer = async (): Promise<string | null> => {
  return await UserKeyManager.exportPublicKeyForServer();
};

/**
 * Initialize user's key pair (call this on app startup or user login)
 */
export const initializeUserKeys = async (): Promise<void> => {
  await UserKeyManager.ensureKeyPair();
};


