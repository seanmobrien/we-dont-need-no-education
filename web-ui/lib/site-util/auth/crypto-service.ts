import {
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  hkdfSync,
  publicEncrypt,
  privateDecrypt,
  randomBytes,
  diffieHellman,
} from 'node:crypto';

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
  // Env var names (override or extend as needed)
  private static readonly ALG_ENV = 'AUTH_CRYPTO_ALG'; // 'RSA' | 'EC'
  private static readonly RSA_PUBLIC_ENV = 'CRYPTO_KEYS_RSA_4096_PUBLIC';
  private static readonly RSA_PRIVATE_ENV = 'CRYPTO_KEYS_RSA_4096_PRIVATE';
  private static readonly EC_PUBLIC_ENV = 'CRYPTO_KEYS_EC_P521_PUBLIC';
  private static readonly EC_PRIVATE_ENV = 'CRYPTO_KEYS_EC_P521_PRIVATE';
  private static readonly BASE64_KEYPREFIX = 'LS0tL';

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
  async encrypt(plain: string): Promise<string> {
    const alg = await this.getAlgorithm();
    const data = Buffer.from(plain, 'utf8');

    if (alg === 'RSA') {
      const pubPem = await this.getRsaPublicKey();
      if (!pubPem) throw new Error('CryptoService: RSA public key missing');
      const pub = createPublicKey(pubPem);

      // Hybrid: random CEK for AES-GCM
      const cek = randomBytes(32);
      const iv = randomBytes(12);
      const { ct, tag } = this.aesGcmEncrypt(cek, iv, data);

      const encCek = publicEncrypt({ key: pub, oaepHash: 'sha256' }, cek);

      const envelope = {
        v: 1,
        alg: 'RSA-OAEP-256+AES-256-GCM',
        cek: encCek.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        ct: ct.toString('base64'),
      } satisfies RsaEnvelopeV1;
      return Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');
    }

    // EC P-521 ECIES-like (ephemeral-static ECDH)
    const recPubPem = await this.getEcPublicKey();
    if (!recPubPem) throw new Error('CryptoService: EC public key missing');
    const recPub = createPublicKey(recPubPem);

    const { privateKey: ephPriv, publicKey: ephPub } = generateKeyPairSync(
      'ec',
      {
        namedCurve: 'secp521r1',
      },
    );

    const shared = diffieHellman({ privateKey: ephPriv, publicKey: recPub });
    const salt = randomBytes(16);
    const keyBuf = hkdfSync(
      'sha256',
      shared,
      salt,
      Buffer.from('ECIES-P521', 'utf8'),
      32,
    );
    const key = Buffer.isBuffer(keyBuf)
      ? keyBuf
      : Buffer.from(keyBuf as ArrayBuffer);
    const iv = randomBytes(12);
    const { ct, tag } = this.aesGcmEncrypt(key, iv, data);

    const epkPem = ephPub.export({ format: 'pem', type: 'spki' }).toString();

    const envelope = {
      v: 1,
      alg: 'ECIES-P521+AES-256-GCM',
      epk: Buffer.from(epkPem, 'utf8').toString('base64'),
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ct: ct.toString('base64'),
    } satisfies EcEnvelopeV1;
    return Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');
  }

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
  async decrypt(encoded: string): Promise<string> {
    const obj = JSON.parse(
      Buffer.from(encoded, 'base64').toString('utf8'),
    ) as Partial<CipherEnvelopeV1> & { alg?: string };
    if (obj.alg === 'RSA-OAEP-256+AES-256-GCM') {
      const payload = obj as RsaEnvelopeV1;
      const privPem = await this.getRsaPrivateKey();
      if (!privPem) throw new Error('CryptoService: RSA private key missing');
      const priv = createPrivateKey(privPem);

      const cek = privateDecrypt(
        { key: priv, oaepHash: 'sha256' },
        Buffer.from(payload.cek, 'base64'),
      );
      const iv = Buffer.from(payload.iv, 'base64');
      const tag = Buffer.from(payload.tag, 'base64');
      const ct = Buffer.from(payload.ct, 'base64');
      const plain = this.aesGcmDecrypt(cek, iv, ct, tag);
      return plain.toString('utf8');
    }

    if (obj.alg === 'ECIES-P521+AES-256-GCM') {
      const payload = obj as EcEnvelopeV1;
      const recPrivPem = await this.getEcPrivateKey();
      if (!recPrivPem) throw new Error('CryptoService: EC private key missing');
      const recPriv = createPrivateKey(recPrivPem);

      const epkPem = Buffer.from(payload.epk, 'base64').toString('utf8');
      const epk = createPublicKey(epkPem);

      const shared = diffieHellman({ privateKey: recPriv, publicKey: epk });
      const salt = Buffer.from(payload.salt, 'base64');
      const keyBuf = hkdfSync(
        'sha256',
        shared,
        salt,
        Buffer.from('ECIES-P521', 'utf8'),
        32,
      );
      const key = Buffer.isBuffer(keyBuf)
        ? keyBuf
        : Buffer.from(keyBuf as ArrayBuffer);
      const iv = Buffer.from(payload.iv, 'base64');
      const tag = Buffer.from(payload.tag, 'base64');
      const ct = Buffer.from(payload.ct, 'base64');
      const plain = this.aesGcmDecrypt(key, iv, ct, tag);
      return plain.toString('utf8');
    }

    throw new Error('CryptoService: unsupported envelope algorithm');
  }

  // --- AES helpers ---
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
  ): { ct: Buffer; tag: Buffer } {
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([cipher.update(data), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { ct, tag };
  }

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
  ): Buffer {
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]);
  }

  // --- Key access (async to allow future Key Vault integration) ---
  /**
   * Resolve the algorithm mode from environment (AUTH_CRYPTO_ALG).
   * Defaults to RSA when unspecified or unknown.
   */
  protected async getAlgorithm(): Promise<'RSA' | 'EC'> {
    const v = process.env[CryptoService.ALG_ENV]?.toUpperCase();
    return v === 'EC' ? 'EC' : 'RSA';
  }

  /** @returns RSA public key (PEM) for encryption */
  protected async getRsaPublicKey(): Promise<string | undefined> {
    return this.unwrapKey(process.env[CryptoService.RSA_PUBLIC_ENV]);
  }
  /** @returns RSA private key (PEM) for decryption */
  protected async getRsaPrivateKey(): Promise<string | undefined> {
    return this.unwrapKey(process.env[CryptoService.RSA_PRIVATE_ENV]);
  }
  /** @returns EC P-521 public key (PEM, SPKI) for encryption */
  protected async getEcPublicKey(): Promise<string | undefined> {
    return this.unwrapKey(process.env[CryptoService.EC_PUBLIC_ENV]);
  }
  /** @returns EC P-521 private key (PEM) for decryption */
  protected async getEcPrivateKey(): Promise<string | undefined> {
    return this.unwrapKey(process.env[CryptoService.EC_PRIVATE_ENV]);
  }
  /**
   * Attempts to detect base64-encoded PEM keys and decode them.
   * @param key - PEM key string, possibly base64-encoded.
   * @returns The decoded PEM string, or original if encoding not detected.
   */
  private unwrapKey(key: string | undefined): string | undefined {
    if (!key || !key.startsWith(CryptoService.BASE64_KEYPREFIX)) {
      return key;
    }
    return Buffer.from(key, 'base64').toString('ascii');
  }
}

// --- Envelope types ---
/**
 * Base shape for versioned envelopes
 */
interface BaseEnvelopeV1 {
  v: 1;
  alg: string;
}

/**
 * RSA hybrid envelope: RSA-OAEP-256 wraps CEK used for AES-256-GCM content
 */
interface RsaEnvelopeV1 extends BaseEnvelopeV1 {
  alg: 'RSA-OAEP-256+AES-256-GCM';
  cek: string; // base64 RSA-encrypted CEK
  iv: string; // base64
  tag: string; // base64
  ct: string; // base64
}

/**
 * EC hybrid envelope: ECDH(P-521) + HKDF-SHA256 derives the AES-256-GCM key
 */
interface EcEnvelopeV1 extends BaseEnvelopeV1 {
  alg: 'ECIES-P521+AES-256-GCM';
  epk: string; // base64 of PEM (SPKI) ephemeral public key
  salt: string; // base64
  iv: string; // base64
  tag: string; // base64
  ct: string; // base64
}

type CipherEnvelopeV1 = RsaEnvelopeV1 | EcEnvelopeV1;

export default CryptoService;
