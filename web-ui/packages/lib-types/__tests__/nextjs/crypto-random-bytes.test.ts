import {
    cryptoRandomBytes,
    cryptoEncrypt,
    cryptoDecrypt,
} from '../../src/lib/nextjs/crypto-random-bytes';
import { generateKeyPairSync } from 'node:crypto';

describe('crypto-random-bytes shared module', () => {
    it('produces requested cryptographic byte length', () => {
        const bytes = cryptoRandomBytes(32);
        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.length).toBe(32);
    });

    it('round-trips RSA envelope encryption/decryption', async () => {
        const { publicKey, privateKey } = generateKeyPairSync('rsa', {
            modulusLength: 4096,
        });

        const plaintext = 'rsa roundtrip payload';
        const encrypted = await cryptoEncrypt(plaintext, {
            algorithm: 'RSA',
            rsaPublicKey: publicKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
        });

        const decrypted = await cryptoDecrypt(encrypted, {
            rsaPrivateKey: privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
        });

        expect(decrypted).toBe(plaintext);
    });

    it('round-trips EC envelope encryption/decryption', async () => {
        const { publicKey, privateKey } = generateKeyPairSync('ec', {
            namedCurve: 'secp521r1',
        });

        const plaintext = 'ec roundtrip payload';
        const encrypted = await cryptoEncrypt(plaintext, {
            algorithm: 'EC',
            ecPublicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
        });

        const decrypted = await cryptoDecrypt(encrypted, {
            ecPrivateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
        });

        expect(decrypted).toBe(plaintext);
    });

    it('falls back to WebCrypto subtle when Node loader is unavailable', async () => {
        const { publicKey, privateKey } = generateKeyPairSync('rsa', {
            modulusLength: 4096,
        });

        const originalGetBuiltinModule = (process as typeof process & {
            getBuiltinModule?: typeof process.getBuiltinModule;
        }).getBuiltinModule;

        try {
            (process as typeof process & { getBuiltinModule?: undefined }).getBuiltinModule =
                undefined;

            const plaintext = 'webcrypto fallback payload';
            const encrypted = await cryptoEncrypt(plaintext, {
                algorithm: 'RSA',
                rsaPublicKey: publicKey
                    .export({ type: 'pkcs1', format: 'pem' })
                    .toString(),
            });

            const decrypted = await cryptoDecrypt(encrypted, {
                rsaPrivateKey: privateKey
                    .export({ type: 'pkcs1', format: 'pem' })
                    .toString(),
            });

            expect(decrypted).toBe(plaintext);
        } finally {
            (
                process as typeof process & {
                    getBuiltinModule?: typeof process.getBuiltinModule;
                }
            ).getBuiltinModule = originalGetBuiltinModule;
        }
    });
});
