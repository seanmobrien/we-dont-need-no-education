import {
    cryptoRandomBytes,
    cryptoEncrypt,
    cryptoDecrypt,
} from '../../src/lib/nextjs/crypto-random-bytes';
import { generateKeyPairSync } from 'node:crypto';

const NODE_CRYPTO_MODULE_SYMBOL = Symbol.for(
    '@compliance-theater/types/lib/nextjs/crypto-random-bytes/node-crypto-module'
);
const WEB_CRYPTO_MODULE_SYMBOL = Symbol.for(
    '@compliance-theater/types/lib/nextjs/crypto-random-bytes/web-crypto-module'
);

describe('crypto-random-bytes shared module', () => {
    it('throws for invalid random byte size values', () => {
        expect(() => cryptoRandomBytes(0)).toThrow(
            'cryptoRandomBytes size must be a positive integer'
        );
        expect(() => cryptoRandomBytes(-1)).toThrow(
            'cryptoRandomBytes size must be a positive integer'
        );
        expect(() => cryptoRandomBytes(1.5)).toThrow(
            'cryptoRandomBytes size must be a positive integer'
        );
    });

    it('produces requested cryptographic byte length', () => {
        const bytes = cryptoRandomBytes(32);
        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.length).toBe(32);
    });

    it('throws when no cryptographically secure random source exists', () => {
        const originalGetBuiltinModule = (process as typeof process & {
            getBuiltinModule?: typeof process.getBuiltinModule;
        }).getBuiltinModule;
        const originalCrypto = (globalThis as typeof globalThis & {
            crypto?: Crypto;
        }).crypto;

        try {
            delete (
                globalThis as typeof globalThis & {
                    [NODE_CRYPTO_MODULE_SYMBOL]?: unknown;
                    [WEB_CRYPTO_MODULE_SYMBOL]?: unknown;
                }
            )[NODE_CRYPTO_MODULE_SYMBOL];
            delete (
                globalThis as typeof globalThis & {
                    [NODE_CRYPTO_MODULE_SYMBOL]?: unknown;
                    [WEB_CRYPTO_MODULE_SYMBOL]?: unknown;
                }
            )[WEB_CRYPTO_MODULE_SYMBOL];

            (process as typeof process & { getBuiltinModule?: undefined }).getBuiltinModule =
                undefined;

            Object.defineProperty(globalThis, 'crypto', {
                configurable: true,
                value: undefined,
            });

            expect(() => cryptoRandomBytes(8)).toThrow(
                'No cryptographically secure random source available'
            );
        } finally {
            (
                process as typeof process & {
                    getBuiltinModule?: typeof process.getBuiltinModule;
                }
            ).getBuiltinModule = originalGetBuiltinModule;

            Object.defineProperty(globalThis, 'crypto', {
                configurable: true,
                value: originalCrypto,
            });
        }
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
            delete (
                globalThis as typeof globalThis & {
                    [NODE_CRYPTO_MODULE_SYMBOL]?: unknown;
                    [WEB_CRYPTO_MODULE_SYMBOL]?: unknown;
                }
            )[NODE_CRYPTO_MODULE_SYMBOL];
            delete (
                globalThis as typeof globalThis & {
                    [NODE_CRYPTO_MODULE_SYMBOL]?: unknown;
                    [WEB_CRYPTO_MODULE_SYMBOL]?: unknown;
                }
            )[WEB_CRYPTO_MODULE_SYMBOL];

            (process as typeof process & { getBuiltinModule?: undefined }).getBuiltinModule =
                undefined;

            const plaintext = 'webcrypto fallback payload';
            const encrypted = await cryptoEncrypt(plaintext, {
                algorithm: 'RSA',
                rsaPublicKey: publicKey
                    .export({ type: 'spki', format: 'pem' })
                    .toString(),
            });

            const decrypted = await cryptoDecrypt(encrypted, {
                rsaPrivateKey: privateKey
                    .export({ type: 'pkcs8', format: 'pem' })
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

    it('falls back to WebCrypto subtle for EC envelope encryption/decryption', async () => {
        const { publicKey, privateKey } = generateKeyPairSync('ec', {
            namedCurve: 'secp521r1',
        });

        const originalGetBuiltinModule = (process as typeof process & {
            getBuiltinModule?: typeof process.getBuiltinModule;
        }).getBuiltinModule;

        try {
            delete (
                globalThis as typeof globalThis & {
                    [NODE_CRYPTO_MODULE_SYMBOL]?: unknown;
                    [WEB_CRYPTO_MODULE_SYMBOL]?: unknown;
                }
            )[NODE_CRYPTO_MODULE_SYMBOL];
            delete (
                globalThis as typeof globalThis & {
                    [NODE_CRYPTO_MODULE_SYMBOL]?: unknown;
                    [WEB_CRYPTO_MODULE_SYMBOL]?: unknown;
                }
            )[WEB_CRYPTO_MODULE_SYMBOL];

            (process as typeof process & { getBuiltinModule?: undefined }).getBuiltinModule =
                undefined;

            const plaintext = 'webcrypto ec fallback payload';
            const encrypted = await cryptoEncrypt(plaintext, {
                algorithm: 'EC',
                ecPublicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
            });

            const decrypted = await cryptoDecrypt(encrypted, {
                ecPrivateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
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

    it('throws when RSA encryption key is missing', async () => {
        await expect(
            cryptoEncrypt('payload', { algorithm: 'RSA' })
        ).rejects.toThrow('cryptoEncrypt: RSA public key missing');
    });

    it('throws when EC encryption key is missing', async () => {
        await expect(
            cryptoEncrypt('payload', { algorithm: 'EC' })
        ).rejects.toThrow('cryptoEncrypt: EC public key missing');
    });

    it('throws when RSA decryption key is missing for RSA envelope', async () => {
        const { publicKey } = generateKeyPairSync('rsa', {
            modulusLength: 4096,
        });

        const encrypted = await cryptoEncrypt('rsa key required', {
            algorithm: 'RSA',
            rsaPublicKey: publicKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
        });

        await expect(cryptoDecrypt(encrypted, {})).rejects.toThrow(
            'cryptoDecrypt: RSA private key missing'
        );
    });

    it('throws when EC decryption key is missing for EC envelope', async () => {
        const { publicKey } = generateKeyPairSync('ec', {
            namedCurve: 'secp521r1',
        });

        const encrypted = await cryptoEncrypt('ec key required', {
            algorithm: 'EC',
            ecPublicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
        });

        await expect(cryptoDecrypt(encrypted, {})).rejects.toThrow(
            'cryptoDecrypt: EC private key missing'
        );
    });

    it('throws when EC encryption key is missing on WebCrypto fallback path', async () => {
        const originalGetBuiltinModule = (process as typeof process & {
            getBuiltinModule?: typeof process.getBuiltinModule;
        }).getBuiltinModule;

        try {
            delete (
                globalThis as typeof globalThis & {
                    [NODE_CRYPTO_MODULE_SYMBOL]?: unknown;
                    [WEB_CRYPTO_MODULE_SYMBOL]?: unknown;
                }
            )[NODE_CRYPTO_MODULE_SYMBOL];
            delete (
                globalThis as typeof globalThis & {
                    [NODE_CRYPTO_MODULE_SYMBOL]?: unknown;
                    [WEB_CRYPTO_MODULE_SYMBOL]?: unknown;
                }
            )[WEB_CRYPTO_MODULE_SYMBOL];

            (process as typeof process & { getBuiltinModule?: undefined }).getBuiltinModule =
                undefined;

            await expect(cryptoEncrypt('payload', { algorithm: 'EC' })).rejects.toThrow(
                'cryptoEncrypt: EC public key missing'
            );
        } finally {
            (
                process as typeof process & {
                    getBuiltinModule?: typeof process.getBuiltinModule;
                }
            ).getBuiltinModule = originalGetBuiltinModule;
        }
    });

    it('throws when EC decryption key is missing on WebCrypto fallback path', async () => {
        const { publicKey } = generateKeyPairSync('ec', {
            namedCurve: 'secp521r1',
        });

        const originalGetBuiltinModule = (process as typeof process & {
            getBuiltinModule?: typeof process.getBuiltinModule;
        }).getBuiltinModule;

        try {
            delete (
                globalThis as typeof globalThis & {
                    [NODE_CRYPTO_MODULE_SYMBOL]?: unknown;
                    [WEB_CRYPTO_MODULE_SYMBOL]?: unknown;
                }
            )[NODE_CRYPTO_MODULE_SYMBOL];
            delete (
                globalThis as typeof globalThis & {
                    [NODE_CRYPTO_MODULE_SYMBOL]?: unknown;
                    [WEB_CRYPTO_MODULE_SYMBOL]?: unknown;
                }
            )[WEB_CRYPTO_MODULE_SYMBOL];

            (process as typeof process & { getBuiltinModule?: undefined }).getBuiltinModule =
                undefined;

            const encrypted = await cryptoEncrypt('fallback ec key required', {
                algorithm: 'EC',
                ecPublicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
            });

            await expect(cryptoDecrypt(encrypted, {})).rejects.toThrow(
                'cryptoDecrypt: EC private key missing'
            );
        } finally {
            (
                process as typeof process & {
                    getBuiltinModule?: typeof process.getBuiltinModule;
                }
            ).getBuiltinModule = originalGetBuiltinModule;
        }
    });

    it('throws for unsupported envelope algorithm during decrypt', async () => {
        const unsupported = {
            v: 1,
            alg: 'unknown',
        };
        const encoded = Buffer.from(JSON.stringify(unsupported), 'utf8').toString(
            'base64'
        );

        await expect(cryptoDecrypt(encoded, {})).rejects.toThrow(
            'cryptoDecrypt: unsupported envelope algorithm'
        );
    });

    it('throws for unsupported envelope algorithm during decrypt on WebCrypto fallback path', async () => {
        const unsupported = {
            v: 1,
            alg: 'unknown',
        };
        const encoded = Buffer.from(JSON.stringify(unsupported), 'utf8').toString('base64');

        const originalGetBuiltinModule = (process as typeof process & {
            getBuiltinModule?: typeof process.getBuiltinModule;
        }).getBuiltinModule;

        try {
            delete (
                globalThis as typeof globalThis & {
                    [NODE_CRYPTO_MODULE_SYMBOL]?: unknown;
                    [WEB_CRYPTO_MODULE_SYMBOL]?: unknown;
                }
            )[NODE_CRYPTO_MODULE_SYMBOL];
            delete (
                globalThis as typeof globalThis & {
                    [NODE_CRYPTO_MODULE_SYMBOL]?: unknown;
                    [WEB_CRYPTO_MODULE_SYMBOL]?: unknown;
                }
            )[WEB_CRYPTO_MODULE_SYMBOL];

            (process as typeof process & { getBuiltinModule?: undefined }).getBuiltinModule =
                undefined;

            await expect(cryptoDecrypt(encoded, {})).rejects.toThrow(
                'cryptoDecrypt: unsupported envelope algorithm'
            );
        } finally {
            (
                process as typeof process & {
                    getBuiltinModule?: typeof process.getBuiltinModule;
                }
            ).getBuiltinModule = originalGetBuiltinModule;
        }
    });

    it('throws when web crypto subtle is unavailable on fallback path', async () => {
        const originalGetBuiltinModule = (process as typeof process & {
            getBuiltinModule?: typeof process.getBuiltinModule;
        }).getBuiltinModule;
        const originalCrypto = (globalThis as typeof globalThis & {
            crypto?: Crypto;
        }).crypto;

        try {
            delete (
                globalThis as typeof globalThis & {
                    [NODE_CRYPTO_MODULE_SYMBOL]?: unknown;
                    [WEB_CRYPTO_MODULE_SYMBOL]?: unknown;
                }
            )[NODE_CRYPTO_MODULE_SYMBOL];
            delete (
                globalThis as typeof globalThis & {
                    [NODE_CRYPTO_MODULE_SYMBOL]?: unknown;
                    [WEB_CRYPTO_MODULE_SYMBOL]?: unknown;
                }
            )[WEB_CRYPTO_MODULE_SYMBOL];

            (process as typeof process & { getBuiltinModule?: undefined }).getBuiltinModule =
                undefined;

            Object.defineProperty(globalThis, 'crypto', {
                configurable: true,
                value: {
                    getRandomValues: (array: Uint8Array) => array,
                },
            });

            await expect(
                cryptoEncrypt('payload', { algorithm: 'RSA', rsaPublicKey: 'invalid-pem' })
            ).rejects.toThrow(
                'Web Crypto API is unavailable. Encryption/decryption on this runtime requires crypto.subtle.'
            );
        } finally {
            (
                process as typeof process & {
                    getBuiltinModule?: typeof process.getBuiltinModule;
                }
            ).getBuiltinModule = originalGetBuiltinModule;

            Object.defineProperty(globalThis, 'crypto', {
                configurable: true,
                value: originalCrypto,
            });
        }
    });
});
