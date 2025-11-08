declare module '@/lib/site-util/auth/crypto-service' {
  /**
   * Module: CryptoService
   *
   * Purpose:
   * - Provide simple, safe string encryption/decryption for application secrets
   *   using modern hybrid cryptography. The module supports two algorithms:
   *   1) RSA-OAEP-256 (key wrap) + AES-256-GCM (content encryption)
   *   2) ECDH(P-521) + HKDF-SHA256 (key derivation) + AES-256-GCM (content)
   *
   * Design notes:
   * - Hybrid encryption: symmetric encryption for payloads + asymmetric for
   *   key exchange/wrap. This is both performant and secure for typical app
   *   secrets (API keys, tokens, configuration values).
   * - Async key providers: accessors are async to enable future migration to a
   *   hardware-backed or cloud Key Vault without changing the calling code.
   * - Envelope format: base64-encoded JSON string carrying only non-sensitive
   *   metadata (algorithm, IV, tag, wrapped key, ephemeral key, salt) and
   *   ciphertext.
   *
   * Security caveats:
   * - This is not a streaming API; intended for small secrets, not large files.
   * - Callers must protect environment variables holding the private keys.
   * - For EC mode, the sender generates an ephemeral keypair (one-time) per
   *   message; the receiver must hold the long-term private key.
   */
  export class CryptoService {
    /**
     * Encrypt a UTF-8 string and return a base64-encoded JSON envelope.
     *
     * Behavior by algorithm:
     * - RSA: Generates a random 32-byte CEK, encrypts with AES-256-GCM, then
     *   wraps CEK using RSA-OAEP-256 with the configured public key.
     * - EC: Generates an ephemeral P-521 keypair, performs ECDH with receiver's
     *   public key, derives a 32-byte key via HKDF-SHA256, then encrypts with
     *   AES-256-GCM. The ephemeral public key and salt are included in the
     *   envelope.
     *
     * Throws when required keys are missing.
     *
     * @param plain - UTF-8 string to encrypt
     * @returns Base64 string of the JSON envelope
     */
    encrypt(plain: string): Promise<string>;

    /**
     * Decrypt a base64-encoded envelope back to a UTF-8 string.
     *
     * The method auto-detects the envelope algorithm and selects the matching
     * decryption path. Throws if the algorithm is unsupported or if required
     * keys are missing.
     *
     * @param encoded - Base64 string previously produced by encrypt()
     * @returns Decrypted UTF-8 string
     */
    decrypt(encoded: string): Promise<string>;

    /**
     * AES-256-GCM encrypt helper
     * @param key - 32-byte key
     * @param iv - 12-byte nonce
     * @param data - plaintext Buffer
     * @returns ciphertext + auth tag
     */
    private aesGcmEncrypt(
      key: Buffer,
      iv: Buffer,
      data: Buffer,
    ): { ct: Buffer; tag: Buffer };

    /**
     * AES-256-GCM decrypt helper
     * @param key - 32-byte key
     * @param iv - 12-byte nonce
     * @param ct - ciphertext
     * @param tag - authentication tag
     * @returns plaintext Buffer
     */
    private aesGcmDecrypt(
      key: Buffer,
      iv: Buffer,
      ct: Buffer,
      tag: Buffer,
    ): Buffer;

    /**
     * Resolve the algorithm mode from environment (AUTH_CRYPTO_ALG).
     * Defaults to RSA when unspecified or unknown.
     */
    protected getAlgorithm(): Promise<'RSA' | 'EC'>;

    /** @returns RSA public key (PEM) for encryption */
    protected getRsaPublicKey(): Promise<string | undefined>;

    /** @returns RSA private key (PEM) for decryption */
    protected getRsaPrivateKey(): Promise<string | undefined>;

    /** @returns EC P-521 public key (PEM, SPKI) for encryption */
    protected getEcPublicKey(): Promise<string | undefined>;

    /** @returns EC P-521 private key (PEM) for decryption */
    protected getEcPrivateKey(): Promise<string | undefined>;

    /**
     * Attempts to detect base64-encoded PEM keys and decode them.
     * @param key - PEM key string, possibly base64-encoded.
     * @returns The decoded PEM string, or original if encoding not detected.
     */
    private unwrapKey(key: string | undefined): string | undefined;
  }

  /**
   * Default export of CryptoService class
   */
  export default CryptoService;
}
