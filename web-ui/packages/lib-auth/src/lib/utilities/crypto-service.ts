import {
  cryptoEncrypt,
  cryptoDecrypt,
} from '@compliance-theater/types/lib/nextjs/crypto-random-bytes';

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

    if (alg === 'RSA') {
      const pubPem = await this.getRsaPublicKey();
      return cryptoEncrypt(plain, {
        algorithm: 'RSA',
        rsaPublicKey: pubPem,
      });
    }

    const recPubPem = await this.getEcPublicKey();
    return cryptoEncrypt(plain, {
      algorithm: 'EC',
      ecPublicKey: recPubPem,
    });
  }

  async decrypt(encoded: string): Promise<string> {
    const [rsaPrivateKey, ecPrivateKey] = await Promise.all([
      this.getRsaPrivateKey(),
      this.getEcPrivateKey(),
    ]);
    return cryptoDecrypt(encoded, {
      rsaPrivateKey,
      ecPrivateKey,
    });
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

export default CryptoService;
