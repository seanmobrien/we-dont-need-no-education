import { CryptoService } from '@/lib/site-util/auth/crypto-service';
import { generateKeyPairSync } from 'node:crypto';

/**
 * CryptoService tests
 * - Generates RSA and EC test key pairs at runtime (fast enough for unit tests)
 * - Verifies round-trip encrypt/decrypt for both algorithms
 * - Checks error behavior for missing keys
 */

describe('CryptoService', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    // jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('RSA: round-trip encrypt/decrypt', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    process.env.AUTH_CRYPTO_ALG = 'RSA';
    process.env.CRYPTO_KEYS_RSA_4096_PUBLIC = publicKey;
    process.env.CRYPTO_KEYS_RSA_4096_PRIVATE = privateKey;

    const svc = new CryptoService();
    const plaintext = 'hello-world-rsa';
    const enc = await svc.encrypt(plaintext);
    expect(typeof enc).toBe('string');
    const dec = await svc.decrypt(enc);
    expect(dec).toBe(plaintext);
  });

  test('EC: round-trip encrypt/decrypt', async () => {
    const { publicKey, privateKey } = generateKeyPairSync('ec', {
      namedCurve: 'secp521r1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    process.env.AUTH_CRYPTO_ALG = 'EC';
    process.env.CRYPTO_KEYS_EC_P521_PUBLIC = publicKey;
    process.env.CRYPTO_KEYS_EC_P521_PRIVATE = privateKey;

    const svc = new CryptoService();
    const plaintext = 'hello-world-ec';
    const enc = await svc.encrypt(plaintext);
    expect(typeof enc).toBe('string');
    const dec = await svc.decrypt(enc);
    expect(dec).toBe(plaintext);
  });

  test('missing RSA keys should error on encrypt', async () => {
    process.env.AUTH_CRYPTO_ALG = 'RSA';
    delete process.env.CRYPTO_KEYS_RSA_4096_PUBLIC;
    const svc = new CryptoService();
    await expect(svc.encrypt('x')).rejects.toThrow(/RSA public key missing/);
  });

  test('missing EC keys should error on decrypt', async () => {
    // produce an EC envelope with valid keys, then remove private key before decrypt
    const { publicKey, privateKey } = generateKeyPairSync('ec', {
      namedCurve: 'secp521r1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    process.env.AUTH_CRYPTO_ALG = 'EC';
    process.env.CRYPTO_KEYS_EC_P521_PUBLIC = publicKey;
    process.env.CRYPTO_KEYS_EC_P521_PRIVATE = privateKey;

    const svc = new CryptoService();
    const enc = await svc.encrypt('secret');

    delete process.env.CRYPTO_KEYS_EC_P521_PRIVATE;
    await expect(svc.decrypt(enc)).rejects.toThrow(/EC private key missing/);
  });
});
