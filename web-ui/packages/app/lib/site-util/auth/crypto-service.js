import { createCipheriv, createDecipheriv, createPrivateKey, createPublicKey, generateKeyPairSync, hkdfSync, publicEncrypt, privateDecrypt, randomBytes, diffieHellman, } from 'node:crypto';
export class CryptoService {
    static ALG_ENV = 'AUTH_CRYPTO_ALG';
    static RSA_PUBLIC_ENV = 'CRYPTO_KEYS_RSA_4096_PUBLIC';
    static RSA_PRIVATE_ENV = 'CRYPTO_KEYS_RSA_4096_PRIVATE';
    static EC_PUBLIC_ENV = 'CRYPTO_KEYS_EC_P521_PUBLIC';
    static EC_PRIVATE_ENV = 'CRYPTO_KEYS_EC_P521_PRIVATE';
    static BASE64_KEYPREFIX = 'LS0tL';
    async encrypt(plain) {
        const alg = await this.getAlgorithm();
        const data = Buffer.from(plain, 'utf8');
        if (alg === 'RSA') {
            const pubPem = await this.getRsaPublicKey();
            if (!pubPem)
                throw new Error('CryptoService: RSA public key missing');
            const pub = createPublicKey(pubPem);
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
            };
            return Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');
        }
        const recPubPem = await this.getEcPublicKey();
        if (!recPubPem)
            throw new Error('CryptoService: EC public key missing');
        const recPub = createPublicKey(recPubPem);
        const { privateKey: ephPriv, publicKey: ephPub } = generateKeyPairSync('ec', {
            namedCurve: 'secp521r1',
        });
        const shared = diffieHellman({ privateKey: ephPriv, publicKey: recPub });
        const salt = randomBytes(16);
        const keyBuf = hkdfSync('sha256', shared, salt, Buffer.from('ECIES-P521', 'utf8'), 32);
        const key = Buffer.isBuffer(keyBuf)
            ? keyBuf
            : Buffer.from(keyBuf);
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
        };
        return Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');
    }
    async decrypt(encoded) {
        const obj = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
        if (obj.alg === 'RSA-OAEP-256+AES-256-GCM') {
            const payload = obj;
            const privPem = await this.getRsaPrivateKey();
            if (!privPem)
                throw new Error('CryptoService: RSA private key missing');
            const priv = createPrivateKey(privPem);
            const cek = privateDecrypt({ key: priv, oaepHash: 'sha256' }, Buffer.from(payload.cek, 'base64'));
            const iv = Buffer.from(payload.iv, 'base64');
            const tag = Buffer.from(payload.tag, 'base64');
            const ct = Buffer.from(payload.ct, 'base64');
            const plain = this.aesGcmDecrypt(cek, iv, ct, tag);
            return plain.toString('utf8');
        }
        if (obj.alg === 'ECIES-P521+AES-256-GCM') {
            const payload = obj;
            const recPrivPem = await this.getEcPrivateKey();
            if (!recPrivPem)
                throw new Error('CryptoService: EC private key missing');
            const recPriv = createPrivateKey(recPrivPem);
            const epkPem = Buffer.from(payload.epk, 'base64').toString('utf8');
            const epk = createPublicKey(epkPem);
            const shared = diffieHellman({ privateKey: recPriv, publicKey: epk });
            const salt = Buffer.from(payload.salt, 'base64');
            const keyBuf = hkdfSync('sha256', shared, salt, Buffer.from('ECIES-P521', 'utf8'), 32);
            const key = Buffer.isBuffer(keyBuf)
                ? keyBuf
                : Buffer.from(keyBuf);
            const iv = Buffer.from(payload.iv, 'base64');
            const tag = Buffer.from(payload.tag, 'base64');
            const ct = Buffer.from(payload.ct, 'base64');
            const plain = this.aesGcmDecrypt(key, iv, ct, tag);
            return plain.toString('utf8');
        }
        throw new Error('CryptoService: unsupported envelope algorithm');
    }
    aesGcmEncrypt(key, iv, data) {
        const cipher = createCipheriv('aes-256-gcm', key, iv);
        const ct = Buffer.concat([cipher.update(data), cipher.final()]);
        const tag = cipher.getAuthTag();
        return { ct, tag };
    }
    aesGcmDecrypt(key, iv, ct, tag) {
        const decipher = createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(ct), decipher.final()]);
    }
    async getAlgorithm() {
        const v = process.env[CryptoService.ALG_ENV]?.toUpperCase();
        return v === 'EC' ? 'EC' : 'RSA';
    }
    async getRsaPublicKey() {
        return this.unwrapKey(process.env[CryptoService.RSA_PUBLIC_ENV]);
    }
    async getRsaPrivateKey() {
        return this.unwrapKey(process.env[CryptoService.RSA_PRIVATE_ENV]);
    }
    async getEcPublicKey() {
        return this.unwrapKey(process.env[CryptoService.EC_PUBLIC_ENV]);
    }
    async getEcPrivateKey() {
        return this.unwrapKey(process.env[CryptoService.EC_PRIVATE_ENV]);
    }
    unwrapKey(key) {
        if (!key || !key.startsWith(CryptoService.BASE64_KEYPREFIX)) {
            return key;
        }
        return Buffer.from(key, 'base64').toString('ascii');
    }
}
export default CryptoService;
//# sourceMappingURL=crypto-service.js.map