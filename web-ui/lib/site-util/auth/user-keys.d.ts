declare module '@/lib/site-util/auth/user-keys' {
  /**
   * Key pair management for user signing
   *
   * This module provides client-side cryptographic key management using the Web Crypto API
   * and IndexedDB for secure storage. Keys are stored in the browser and never leave the
   * client unless explicitly exported (public key only).
   *
   * Key characteristics:
   * - Algorithm: ECDSA with P-256 curve (fast and secure)
   * - Storage: IndexedDB (non-extractable private keys for security)
   * - Usage: Digital signatures for user authentication and data integrity
   *
   * Security features:
   * - Private keys are non-extractable and stored only in IndexedDB
   * - Keys are bound to the user's browser/device
   * - Public keys can be exported for server-side verification
   * - Automatic key generation on first use
   */

  /**
   * Signs data using ECDSA with the user's private key
   *
   * This function ensures a key pair exists (generating one if needed), retrieves
   * the private key from IndexedDB, and creates a digital signature using ECDSA
   * with SHA-256 hashing.
   *
   * The signature can be verified server-side using the user's registered public key,
   * providing strong authentication without transmitting the private key.
   *
   * @param data - UTF-8 string to sign
   * @returns Promise resolving to base64-encoded signature
   * @throws {Error} If private key cannot be retrieved or signing fails
   *
   * @example
   * ```typescript
   * // Sign a challenge from the server
   * const signature = await signData('challenge-string-from-server');
   *
   * // Send signature to server for verification
   * await fetch('/api/verify', {
   *   method: 'POST',
   *   body: JSON.stringify({ signature })
   * });
   * ```
   */
  export function signData(data: string): Promise<string>;

  /**
   * Export user's public key for server-side verification setup
   * Call this when user first logs in to associate their public key with their account
   *
   * The exported key is in SPKI format, base64-encoded, which can be stored server-side
   * and used to verify signatures created by the user's private key.
   *
   * @param props - Optional object containing a pre-loaded public key
   * @param props.publicKey - Optional CryptoKey to export (if not provided, retrieves from IndexedDB)
   * @returns Promise resolving to base64-encoded public key, or null if no key exists
   *
   * @example
   * ```typescript
   * // Export public key during user registration
   * const publicKey = await getUserPublicKeyForServer();
   * if (publicKey) {
   *   await fetch('/api/auth/register-key', {
   *     method: 'POST',
   *     body: JSON.stringify({ publicKey })
   *   });
   * }
   * ```
   */
  export function getUserPublicKeyForServer(props?: {
    publicKey?: CryptoKey | undefined;
  }): Promise<string | null>;

  /**
   * Initialize user's key pair (call this on app startup or user login)
   *
   * Ensures the user has a valid ECDSA key pair stored in IndexedDB. If no key pair
   * exists, one is automatically generated. This should be called early in the
   * application lifecycle to ensure keys are ready when needed.
   *
   * @returns Promise that resolves when initialization is complete
   *
   * @example
   * ```typescript
   * // Initialize keys on app startup
   * useEffect(() => {
   *   initializeUserKeys();
   * }, []);
   * ```
   */
  export function initializeUserKeys(): Promise<void>;

  /**
   * Validates that the user's local keys match server-registered keys
   *
   * Compares the user's local public key against a list of public keys registered
   * on the server. This is useful for detecting key mismatches that could indicate:
   * - Browser data was cleared
   * - User is on a different device
   * - Key rotation is needed
   *
   * @param serverKeys - Array of base64-encoded public keys from the server
   * @returns Promise resolving to true if local key matches any server key, false otherwise
   *
   * @example
   * ```typescript
   * // Validate keys on login
   * const serverKeys = await fetchServerKeys();
   * const isValid = await validateUserKeysAgainstServer(serverKeys);
   *
   * if (!isValid) {
   *   // Prompt user to re-register their device
   *   console.warn('Key mismatch detected - re-registration required');
   * }
   * ```
   */
  export function validateUserKeysAgainstServer(
    serverKeys: string[],
  ): Promise<boolean>;

  /**
   * Checks if user has valid keys stored locally
   *
   * Verifies that both public and private keys exist in IndexedDB. This is a quick
   * check to determine if key initialization or generation is needed.
   *
   * @returns Promise resolving to true if both keys exist, false otherwise
   *
   * @example
   * ```typescript
   * if (await hasValidLocalKeys()) {
   *   console.log('User has valid keys');
   * } else {
   *   await initializeUserKeys();
   * }
   * ```
   */
  export function hasValidLocalKeys(): Promise<boolean>;

  /**
   * Generate and return a new key pair, storing it locally
   *
   * Creates a new ECDSA P-256 key pair, stores it in IndexedDB, and returns
   * both the public and private CryptoKey objects. The private key is marked
   * as non-extractable for security.
   *
   * Warning: This replaces any existing key pair. Ensure the public key is
   * registered with the server before using the new keys for authentication.
   *
   * @returns Promise resolving to an object containing the new public and private keys
   *
   * @example
   * ```typescript
   * // Generate new keys and register with server
   * const { publicKey } = await generateUserKeyPair();
   * const publicKeyBase64 = await getUserPublicKeyForServer({ publicKey });
   *
   * await fetch('/api/auth/register-key', {
   *   method: 'POST',
   *   body: JSON.stringify({ publicKey: publicKeyBase64 })
   * });
   * ```
   */
  export function generateUserKeyPair(): Promise<{
    publicKey: CryptoKey;
    privateKey: CryptoKey;
  }>;

  /**
   * Get the user's stored public key
   *
   * Retrieves the public key from IndexedDB. This can be used for local operations
   * or exported for server registration.
   *
   * @returns Promise resolving to the CryptoKey public key, or null if none exists
   *
   * @example
   * ```typescript
   * const publicKey = await getUserPublicKey();
   * if (publicKey) {
   *   // Use key for cryptographic operations
   * }
   * ```
   */
  export function getUserPublicKey(): Promise<CryptoKey | null>;

  /**
   * Get the user's stored private key
   *
   * Retrieves the private key from IndexedDB. The private key is non-extractable
   * and can only be used for signing operations within the Web Crypto API.
   *
   * @returns Promise resolving to the CryptoKey private key, or null if none exists
   *
   * @example
   * ```typescript
   * const privateKey = await getUserPrivateKey();
   * if (privateKey) {
   *   // Use key for signing operations
   *   const signature = await crypto.subtle.sign(
   *     { name: 'ECDSA', hash: 'SHA-256' },
   *     privateKey,
   *     data
   *   );
   * }
   * ```
   */
  export function getUserPrivateKey(): Promise<CryptoKey | null>;
}
