type NodeCryptoModule = {
    randomBytes: (size: number) => Uint8Array;
    createCipheriv: (
        algorithm: string,
        key: Uint8Array,
        iv: Uint8Array,
    ) => {
        update: (data: Uint8Array) => Uint8Array | ArrayBuffer;
        final: () => Uint8Array | ArrayBuffer;
        getAuthTag: () => Uint8Array | ArrayBuffer;
    };
    createDecipheriv: (
        algorithm: string,
        key: Uint8Array,
        iv: Uint8Array,
    ) => {
        update: (data: Uint8Array) => Uint8Array | ArrayBuffer;
        final: () => Uint8Array | ArrayBuffer;
        setAuthTag: (tag: Uint8Array | ArrayBuffer) => void;
    };
    createPrivateKey: (key: string) => unknown;
    createPublicKey: (key: string) => unknown;
    generateKeyPairSync: (
        type: 'ec',
        options: { namedCurve: 'secp521r1' },
    ) => {
        privateKey: unknown;
        publicKey: {
            export: (options: { format: 'pem'; type: 'spki' }) => string | Uint8Array;
        };
    };
    hkdfSync: (
        digest: string,
        ikm: Uint8Array,
        salt: Uint8Array,
        info: Uint8Array,
        keylen: number,
    ) => Uint8Array | ArrayBuffer;
    publicEncrypt: (
        options: { key: unknown; oaepHash: 'sha256' },
        buffer: Uint8Array,
    ) => Uint8Array | ArrayBuffer;
    privateDecrypt: (
        options: { key: unknown; oaepHash: 'sha256' },
        buffer: Uint8Array,
    ) => Uint8Array | ArrayBuffer;
    diffieHellman: (params: {
        privateKey: unknown;
        publicKey: unknown;
    }) => Uint8Array | ArrayBuffer;
};

type WebCryptoModule = {
    subtle: {
        importKey: (
            format: 'raw' | 'spki' | 'pkcs8',
            keyData: ArrayBuffer | Uint8Array,
            algorithm: unknown,
            extractable: boolean,
            keyUsages: string[],
        ) => Promise<unknown>;
        encrypt: (
            algorithm: unknown,
            key: unknown,
            data: ArrayBuffer | Uint8Array,
        ) => Promise<ArrayBuffer>;
        decrypt: (
            algorithm: unknown,
            key: unknown,
            data: ArrayBuffer | Uint8Array,
        ) => Promise<ArrayBuffer>;
        generateKey: (
            algorithm: unknown,
            extractable: boolean,
            keyUsages: string[],
        ) => Promise<{ privateKey: unknown; publicKey: unknown }>;
        deriveBits: (
            algorithm: unknown,
            baseKey: unknown,
            length: number,
        ) => Promise<ArrayBuffer>;
        exportKey: (format: 'spki', key: unknown) => Promise<ArrayBuffer>;
    };
    getRandomValues: (array: Uint8Array) => Uint8Array;
};

export type CryptoEnvelopeAlgorithm =
    | 'RSA-OAEP-256+AES-256-GCM'
    | 'ECIES-P521+AES-256-GCM';

type BaseEnvelopeV1 = {
    v: 1;
    alg: CryptoEnvelopeAlgorithm;
};

export type RsaEnvelopeV1 = BaseEnvelopeV1 & {
    alg: 'RSA-OAEP-256+AES-256-GCM';
    cek: string;
    iv: string;
    tag: string;
    ct: string;
};

export type EcEnvelopeV1 = BaseEnvelopeV1 & {
    alg: 'ECIES-P521+AES-256-GCM';
    epk: string;
    salt: string;
    iv: string;
    tag: string;
    ct: string;
};

export type CipherEnvelopeV1 = RsaEnvelopeV1 | EcEnvelopeV1;

export type CryptoEncryptOptions = {
    algorithm: 'RSA' | 'EC';
    rsaPublicKey?: string;
    ecPublicKey?: string;
};

export type CryptoDecryptOptions = {
    rsaPrivateKey?: string;
    ecPrivateKey?: string;
};

const NODE_CRYPTO_MODULE_SYMBOL = Symbol.for(
    '@compliance-theater/types/lib/nextjs/crypto-random-bytes/node-crypto-module',
);

const WEB_CRYPTO_MODULE_SYMBOL = Symbol.for(
    '@compliance-theater/types/lib/nextjs/crypto-random-bytes/web-crypto-module',
);

type GlobalWithCryptoModules = typeof globalThis & {
    [NODE_CRYPTO_MODULE_SYMBOL]?: NodeCryptoModule;
    [WEB_CRYPTO_MODULE_SYMBOL]?: WebCryptoModule;
};

const loadNodeCryptoModule = (): NodeCryptoModule | undefined => {
    const g = globalThis as GlobalWithCryptoModules;

    if (g[NODE_CRYPTO_MODULE_SYMBOL]) {
        return g[NODE_CRYPTO_MODULE_SYMBOL];
    }

    try {
        if (typeof process?.getBuiltinModule !== 'function') {
            return undefined;
        }

        const nodeCrypto = process.getBuiltinModule('node:crypto') as unknown as
            | NodeCryptoModule
            | undefined;
        if (nodeCrypto?.randomBytes) {
            g[NODE_CRYPTO_MODULE_SYMBOL] = nodeCrypto;
            return nodeCrypto;
        }
    } catch {
        return undefined;
    }

    return undefined;
};

const loadWebCryptoModule = (): WebCryptoModule | undefined => {
    const g = globalThis as GlobalWithCryptoModules;

    if (g[WEB_CRYPTO_MODULE_SYMBOL]) {
        return g[WEB_CRYPTO_MODULE_SYMBOL];
    }

    const runtimeCrypto =
        (globalThis as typeof globalThis & { crypto?: WebCryptoModule }).crypto;
    if (
        runtimeCrypto?.subtle &&
        typeof runtimeCrypto.getRandomValues === 'function'
    ) {
        g[WEB_CRYPTO_MODULE_SYMBOL] = runtimeCrypto;
        return runtimeCrypto;
    }

    return undefined;
};

/**
 * Runtime-safe cryptographic random bytes for both browser and server.
 * - Browser: uses window.crypto.getRandomValues
 * - Server: lazily loads node:crypto at runtime
 * - Fallback: uses globalThis.crypto.getRandomValues when available (e.g. edge runtimes)
 */
export const cryptoRandomBytes = (size: number): Uint8Array => {
    if (!Number.isInteger(size) || size <= 0) {
        throw new RangeError('cryptoRandomBytes size must be a positive integer');
    }

    if (
        typeof window !== 'undefined' &&
        typeof window.crypto?.getRandomValues === 'function'
    ) {
        return window.crypto.getRandomValues(new Uint8Array(size));
    }

    const nodeCrypto = loadNodeCryptoModule();
    if (nodeCrypto?.randomBytes) {
        return nodeCrypto.randomBytes(size);
    }

    if (typeof globalThis.crypto?.getRandomValues === 'function') {
        return globalThis.crypto.getRandomValues(new Uint8Array(size));
    }

    throw new Error('No cryptographically secure random source available');
};

const requireWebCryptoModule = (): WebCryptoModule => {
    const webCrypto = loadWebCryptoModule();
    if (!webCrypto) {
        throw new Error(
            'Web Crypto API is unavailable. Encryption/decryption on this runtime requires crypto.subtle.',
        );
    }
    return webCrypto;
};

const utf8ToBytes = (value: string): Uint8Array =>
    typeof Buffer !== 'undefined'
        ? Buffer.from(value, 'utf8')
        : new TextEncoder().encode(value);

const bytesToUtf8 = (value: Uint8Array): string =>
    typeof Buffer !== 'undefined'
        ? Buffer.from(value).toString('utf8')
        : new TextDecoder().decode(value);

const bytesToBase64 = (value: Uint8Array): string => {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(value).toString('base64');
    }

    let binary = '';
    for (let i = 0; i < value.length; i += 1) {
        binary += String.fromCharCode(value[i]);
    }
    if (typeof btoa !== 'function') {
        throw new Error('No base64 encoder available');
    }
    return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(value, 'base64');
    }

    if (typeof atob !== 'function') {
        throw new Error('No base64 decoder available');
    }
    const binary = atob(value);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        out[i] = binary.charCodeAt(i);
    }
    return out;
};

const asBytes = (value: Uint8Array | ArrayBuffer): Uint8Array =>
    value instanceof Uint8Array ? value : new Uint8Array(value);

const pemToDer = (pem: string): Uint8Array => {
    const normalized = pem
        .replace(/-----BEGIN [^-]+-----/g, '')
        .replace(/-----END [^-]+-----/g, '')
        .replace(/\s+/g, '');
    return base64ToBytes(normalized);
};

const derToPem = (
    label: 'PUBLIC KEY' | 'PRIVATE KEY',
    der: Uint8Array,
): string => {
    const b64 = bytesToBase64(der);
    const lines = b64.match(/.{1,64}/g)?.join('\n') ?? b64;
    return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
};

const splitGcmPayload = (
    encryptedWithTag: Uint8Array,
): { ct: Uint8Array; tag: Uint8Array } => {
    const tagLength = 16;
    if (encryptedWithTag.length < tagLength) {
        throw new Error('Invalid AES-GCM payload');
    }
    return {
        ct: encryptedWithTag.slice(0, encryptedWithTag.length - tagLength),
        tag: encryptedWithTag.slice(encryptedWithTag.length - tagLength),
    };
};

const joinGcmPayload = (ct: Uint8Array, tag: Uint8Array): Uint8Array => {
    const out = new Uint8Array(ct.length + tag.length);
    out.set(ct, 0);
    out.set(tag, ct.length);
    return out;
};

const aesGcmEncryptNode = (
    nodeCrypto: NodeCryptoModule,
    key: Uint8Array,
    iv: Uint8Array,
    data: Uint8Array,
): { ct: Uint8Array; tag: Uint8Array } => {
    const cipher = nodeCrypto.createCipheriv('aes-256-gcm', key, iv);
    const ct =
        typeof Buffer !== 'undefined'
            ? Buffer.concat([
                Buffer.from(asBytes(cipher.update(data))),
                Buffer.from(asBytes(cipher.final())),
            ])
            : new Uint8Array([
                ...asBytes(cipher.update(data)),
                ...asBytes(cipher.final()),
            ]);
    const tag = asBytes(cipher.getAuthTag());
    return { ct, tag };
};

const aesGcmDecryptNode = (
    nodeCrypto: NodeCryptoModule,
    key: Uint8Array,
    iv: Uint8Array,
    ct: Uint8Array,
    tag: Uint8Array,
): Uint8Array => {
    const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return typeof Buffer !== 'undefined'
        ? Buffer.concat([
            Buffer.from(asBytes(decipher.update(ct))),
            Buffer.from(asBytes(decipher.final())),
        ])
        : new Uint8Array([
            ...asBytes(decipher.update(ct)),
            ...asBytes(decipher.final()),
        ]);
};

const encryptNode = (
    plain: string,
    options: CryptoEncryptOptions,
    nodeCrypto: NodeCryptoModule,
): string => {
    const data = utf8ToBytes(plain);

    if (options.algorithm === 'RSA') {
        if (!options.rsaPublicKey) {
            throw new Error('cryptoEncrypt: RSA public key missing');
        }

        const pub = nodeCrypto.createPublicKey(options.rsaPublicKey);
        const cek = cryptoRandomBytes(32);
        const iv = cryptoRandomBytes(12);
        const { ct, tag } = aesGcmEncryptNode(nodeCrypto, cek, iv, data);
        const encCek = asBytes(
            nodeCrypto.publicEncrypt({ key: pub, oaepHash: 'sha256' }, cek),
        );

        const envelope: RsaEnvelopeV1 = {
            v: 1,
            alg: 'RSA-OAEP-256+AES-256-GCM',
            cek: bytesToBase64(encCek),
            iv: bytesToBase64(iv),
            tag: bytesToBase64(tag),
            ct: bytesToBase64(ct),
        };
        return bytesToBase64(utf8ToBytes(JSON.stringify(envelope)));
    }

    if (!options.ecPublicKey) {
        throw new Error('cryptoEncrypt: EC public key missing');
    }

    const recPub = nodeCrypto.createPublicKey(options.ecPublicKey);
    const { privateKey: ephPriv, publicKey: ephPub } =
        nodeCrypto.generateKeyPairSync('ec', {
            namedCurve: 'secp521r1',
        });

    const shared = asBytes(
        nodeCrypto.diffieHellman({ privateKey: ephPriv, publicKey: recPub }),
    );
    const salt = cryptoRandomBytes(16);
    const key = asBytes(
        nodeCrypto.hkdfSync('sha256', shared, salt, utf8ToBytes('ECIES-P521'), 32),
    );
    const iv = cryptoRandomBytes(12);
    const { ct, tag } = aesGcmEncryptNode(nodeCrypto, key, iv, data);
    const epkPem = ephPub.export({ format: 'pem', type: 'spki' });

    const envelope: EcEnvelopeV1 = {
        v: 1,
        alg: 'ECIES-P521+AES-256-GCM',
        epk: bytesToBase64(
            typeof epkPem === 'string' ? utf8ToBytes(epkPem) : epkPem,
        ),
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        tag: bytesToBase64(tag),
        ct: bytesToBase64(ct),
    };
    return bytesToBase64(utf8ToBytes(JSON.stringify(envelope)));
};

const decryptNode = (
    encoded: string,
    options: CryptoDecryptOptions,
    nodeCrypto: NodeCryptoModule,
): string => {
    const obj = JSON.parse(bytesToUtf8(base64ToBytes(encoded))) as
        | Partial<CipherEnvelopeV1>
        | { alg?: string };

    if (obj.alg === 'RSA-OAEP-256+AES-256-GCM') {
        if (!options.rsaPrivateKey) {
            throw new Error('cryptoDecrypt: RSA private key missing');
        }

        const payload = obj as RsaEnvelopeV1;
        const priv = nodeCrypto.createPrivateKey(options.rsaPrivateKey);
        const cek = asBytes(
            nodeCrypto.privateDecrypt(
                { key: priv, oaepHash: 'sha256' },
                base64ToBytes(payload.cek),
            ),
        );
        const plain = aesGcmDecryptNode(
            nodeCrypto,
            cek,
            base64ToBytes(payload.iv),
            base64ToBytes(payload.ct),
            base64ToBytes(payload.tag),
        );
        return bytesToUtf8(plain);
    }

    if (obj.alg === 'ECIES-P521+AES-256-GCM') {
        if (!options.ecPrivateKey) {
            throw new Error('cryptoDecrypt: EC private key missing');
        }

        const payload = obj as EcEnvelopeV1;
        const recPriv = nodeCrypto.createPrivateKey(options.ecPrivateKey);
        const epkPem = bytesToUtf8(base64ToBytes(payload.epk));
        const epk = nodeCrypto.createPublicKey(epkPem);
        const shared = asBytes(
            nodeCrypto.diffieHellman({ privateKey: recPriv, publicKey: epk }),
        );
        const key = asBytes(
            nodeCrypto.hkdfSync(
                'sha256',
                shared,
                base64ToBytes(payload.salt),
                utf8ToBytes('ECIES-P521'),
                32,
            ),
        );

        const plain = aesGcmDecryptNode(
            nodeCrypto,
            key,
            base64ToBytes(payload.iv),
            base64ToBytes(payload.ct),
            base64ToBytes(payload.tag),
        );
        return bytesToUtf8(plain);
    }

    throw new Error('cryptoDecrypt: unsupported envelope algorithm');
};

const encryptWeb = async (
    plain: string,
    options: CryptoEncryptOptions,
    webCrypto: WebCryptoModule,
): Promise<string> => {
    const data = utf8ToBytes(plain);

    if (options.algorithm === 'RSA') {
        if (!options.rsaPublicKey) {
            throw new Error('cryptoEncrypt: RSA public key missing');
        }

        const publicKey = await webCrypto.subtle.importKey(
            'spki',
            pemToDer(options.rsaPublicKey),
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false,
            ['encrypt'],
        );

        const cek = cryptoRandomBytes(32);
        const iv = cryptoRandomBytes(12);
        const aesKey = await webCrypto.subtle.importKey(
            'raw',
            cek,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt'],
        );
        const encryptedWithTag = asBytes(
            await webCrypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, data),
        );
        const { ct, tag } = splitGcmPayload(encryptedWithTag);
        const encCek = asBytes(
            await webCrypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, cek),
        );

        const envelope: RsaEnvelopeV1 = {
            v: 1,
            alg: 'RSA-OAEP-256+AES-256-GCM',
            cek: bytesToBase64(encCek),
            iv: bytesToBase64(iv),
            tag: bytesToBase64(tag),
            ct: bytesToBase64(ct),
        };
        return bytesToBase64(utf8ToBytes(JSON.stringify(envelope)));
    }

    if (!options.ecPublicKey) {
        throw new Error('cryptoEncrypt: EC public key missing');
    }

    const recipientPubKey = await webCrypto.subtle.importKey(
        'spki',
        pemToDer(options.ecPublicKey),
        { name: 'ECDH', namedCurve: 'P-521' },
        true,
        [],
    );

    const eph = await webCrypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-521' },
        true,
        ['deriveBits'],
    );

    const shared = asBytes(
        await webCrypto.subtle.deriveBits(
            { name: 'ECDH', public: recipientPubKey },
            eph.privateKey,
            528,
        ),
    );

    const salt = cryptoRandomBytes(16);
    const hkdfKey = await webCrypto.subtle.importKey(
        'raw',
        shared,
        'HKDF',
        false,
        ['deriveBits'],
    );
    const keyBits = asBytes(
        await webCrypto.subtle.deriveBits(
            {
                name: 'HKDF',
                hash: 'SHA-256',
                salt,
                info: utf8ToBytes('ECIES-P521'),
            },
            hkdfKey,
            256,
        ),
    );

    const aesKey = await webCrypto.subtle.importKey(
        'raw',
        keyBits,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt'],
    );
    const iv = cryptoRandomBytes(12);
    const encryptedWithTag = asBytes(
        await webCrypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, data),
    );
    const { ct, tag } = splitGcmPayload(encryptedWithTag);

    const epkDer = asBytes(await webCrypto.subtle.exportKey('spki', eph.publicKey));
    const epkPem = derToPem('PUBLIC KEY', epkDer);

    const envelope: EcEnvelopeV1 = {
        v: 1,
        alg: 'ECIES-P521+AES-256-GCM',
        epk: bytesToBase64(utf8ToBytes(epkPem)),
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        tag: bytesToBase64(tag),
        ct: bytesToBase64(ct),
    };
    return bytesToBase64(utf8ToBytes(JSON.stringify(envelope)));
};

const decryptWeb = async (
    encoded: string,
    options: CryptoDecryptOptions,
    webCrypto: WebCryptoModule,
): Promise<string> => {
    const obj = JSON.parse(bytesToUtf8(base64ToBytes(encoded))) as
        | Partial<CipherEnvelopeV1>
        | { alg?: string };

    if (obj.alg === 'RSA-OAEP-256+AES-256-GCM') {
        if (!options.rsaPrivateKey) {
            throw new Error('cryptoDecrypt: RSA private key missing');
        }

        const payload = obj as RsaEnvelopeV1;
        const privateKey = await webCrypto.subtle.importKey(
            'pkcs8',
            pemToDer(options.rsaPrivateKey),
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false,
            ['decrypt'],
        );

        const cek = asBytes(
            await webCrypto.subtle.decrypt(
                { name: 'RSA-OAEP' },
                privateKey,
                base64ToBytes(payload.cek),
            ),
        );
        const aesKey = await webCrypto.subtle.importKey(
            'raw',
            cek,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt'],
        );
        const plain = asBytes(
            await webCrypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: base64ToBytes(payload.iv),
                },
                aesKey,
                joinGcmPayload(base64ToBytes(payload.ct), base64ToBytes(payload.tag)),
            ),
        );
        return bytesToUtf8(plain);
    }

    if (obj.alg === 'ECIES-P521+AES-256-GCM') {
        if (!options.ecPrivateKey) {
            throw new Error('cryptoDecrypt: EC private key missing');
        }

        const payload = obj as EcEnvelopeV1;
        const privateKey = await webCrypto.subtle.importKey(
            'pkcs8',
            pemToDer(options.ecPrivateKey),
            { name: 'ECDH', namedCurve: 'P-521' },
            false,
            ['deriveBits'],
        );
        const epkPem = bytesToUtf8(base64ToBytes(payload.epk));
        const epkPublic = await webCrypto.subtle.importKey(
            'spki',
            pemToDer(epkPem),
            { name: 'ECDH', namedCurve: 'P-521' },
            false,
            [],
        );

        const shared = asBytes(
            await webCrypto.subtle.deriveBits(
                { name: 'ECDH', public: epkPublic },
                privateKey,
                528,
            ),
        );
        const hkdfKey = await webCrypto.subtle.importKey(
            'raw',
            shared,
            'HKDF',
            false,
            ['deriveBits'],
        );
        const keyBits = asBytes(
            await webCrypto.subtle.deriveBits(
                {
                    name: 'HKDF',
                    hash: 'SHA-256',
                    salt: base64ToBytes(payload.salt),
                    info: utf8ToBytes('ECIES-P521'),
                },
                hkdfKey,
                256,
            ),
        );

        const aesKey = await webCrypto.subtle.importKey(
            'raw',
            keyBits,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt'],
        );
        const plain = asBytes(
            await webCrypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: base64ToBytes(payload.iv),
                },
                aesKey,
                joinGcmPayload(base64ToBytes(payload.ct), base64ToBytes(payload.tag)),
            ),
        );
        return bytesToUtf8(plain);
    }

    throw new Error('cryptoDecrypt: unsupported envelope algorithm');
};

export const cryptoEncrypt = async (
    plain: string,
    options: CryptoEncryptOptions,
): Promise<string> => {
    const nodeCrypto = loadNodeCryptoModule();
    if (nodeCrypto) {
        return encryptNode(plain, options, nodeCrypto);
    }

    const webCrypto = requireWebCryptoModule();
    return encryptWeb(plain, options, webCrypto);
};

export const cryptoDecrypt = async (
    encoded: string,
    options: CryptoDecryptOptions,
): Promise<string> => {
    const nodeCrypto = loadNodeCryptoModule();
    if (nodeCrypto) {
        return decryptNode(encoded, options, nodeCrypto);
    }

    const webCrypto = requireWebCryptoModule();
    return decryptWeb(encoded, options, webCrypto);
};
