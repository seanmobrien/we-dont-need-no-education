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

export class CryptoService {
  // Env var names (override or extend as needed)
  private static readonly ALG_ENV = 'AUTH_CRYPTO_ALG'; // 'RSA' | 'EC'
  private static readonly RSA_PUBLIC_ENV = 'CRYPTO_KEYS_RSA_4096_PUBLIC';
  private static readonly RSA_PRIVATE_ENV = 'CRYPTO_KEYS_RSA_4096_PRIVATE';
  private static readonly EC_PUBLIC_ENV = 'CRYPTO_KEYS_EC_P521_PUBLIC';
  private static readonly EC_PRIVATE_ENV = 'CRYPTO_KEYS_EC_P521_PRIVATE';
  private static readonly BASE64_KEYPREFIX = 'LS0tL';

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

  protected async getAlgorithm(): Promise<'RSA' | 'EC'> {
    const v = process.env[CryptoService.ALG_ENV]?.toUpperCase();
    return v === 'EC' ? 'EC' : 'RSA';
  }

  protected async getRsaPublicKey(): Promise<string | undefined> {
    return this.unwrapKey(process.env[CryptoService.RSA_PUBLIC_ENV]);
  }

  protected async getRsaPrivateKey(): Promise<string | undefined> {
    return this.unwrapKey(process.env[CryptoService.RSA_PRIVATE_ENV]);
  }

  protected async getEcPublicKey(): Promise<string | undefined> {
    return this.unwrapKey(process.env[CryptoService.EC_PUBLIC_ENV]);
  }

  protected async getEcPrivateKey(): Promise<string | undefined> {
    return this.unwrapKey(process.env[CryptoService.EC_PRIVATE_ENV]);
  }

  private unwrapKey(key: string | undefined): string | undefined {
    if (!key || !key.startsWith(CryptoService.BASE64_KEYPREFIX)) {
      return key;
    }
    return Buffer.from(key, 'base64').toString('ascii');
  }
}

interface BaseEnvelopeV1 {
  v: 1;
  alg: string;
}

interface RsaEnvelopeV1 extends BaseEnvelopeV1 {
  alg: 'RSA-OAEP-256+AES-256-GCM';
  cek: string;
  iv: string;
  tag: string;
  ct: string;
}

interface EcEnvelopeV1 extends BaseEnvelopeV1 {
  alg: 'ECIES-P521+AES-256-GCM';
  epk: string;
  salt: string;
  iv: string;
  tag: string;
  ct: string;
}

type CipherEnvelopeV1 = RsaEnvelopeV1 | EcEnvelopeV1;

export default CryptoService;
