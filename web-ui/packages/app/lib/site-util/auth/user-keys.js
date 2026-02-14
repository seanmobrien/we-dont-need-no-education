import { LoggedError } from '@compliance-theater/logger';
class UserKeyManager {
    static DB_NAME = 'UserKeyStore';
    static DB_VERSION = 1;
    static STORE_NAME = 'keys';
    static KEY_ID = 'userSigningKey';
    static async openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME);
                }
            };
        });
    }
    static async generateKeyPair() {
        if (!window.crypto?.subtle) {
            throw new Error('Web Crypto API not available. Requires HTTPS context.');
        }
        const keyPair = await crypto.subtle.generateKey({
            name: 'ECDSA',
            namedCurve: 'P-256',
        }, false, ['sign', 'verify']);
        const db = await this.openDB();
        const transaction = db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        await new Promise((resolve, reject) => {
            const request = store.put({
                publicKey: keyPair.publicKey,
                privateKey: keyPair.privateKey,
                created: new Date().toISOString(),
            }, this.KEY_ID);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
        return keyPair;
    }
    static async getPrivateKey() {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            return new Promise((resolve) => {
                const request = store.get(this.KEY_ID);
                request.onsuccess = () => {
                    const result = request.result;
                    resolve(result?.privateKey || null);
                };
                request.onerror = () => resolve(null);
            });
        }
        catch {
            return null;
        }
    }
    static async getPublicKey() {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            return new Promise((resolve) => {
                const request = store.get(this.KEY_ID);
                request.onsuccess = () => {
                    const result = request.result;
                    resolve(result?.publicKey || null);
                };
                request.onerror = () => resolve(null);
            });
        }
        catch {
            return null;
        }
    }
    static async exportPublicKeyForServer({ publicKey, } = {}) {
        const key = publicKey ?? (await this.getPublicKey());
        if (!key)
            return null;
        const exported = await crypto.subtle.exportKey('spki', key);
        return btoa(String.fromCharCode(...new Uint8Array(exported)));
    }
    static async ensureKeyPair() {
        const privateKey = await this.getPrivateKey();
        if (!privateKey) {
            await this.generateKeyPair();
        }
    }
    static async validateAgainstServerKeys(serverKeys) {
        try {
            const localPublicKey = await this.getPublicKey();
            if (!localPublicKey) {
                return false;
            }
            const localPublicKeyBase64 = await this.exportPublicKeyToBase64(localPublicKey);
            return serverKeys.includes(localPublicKeyBase64);
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                message: 'Failed to validate against server keys',
                context: { serverKeys },
            });
            return false;
        }
    }
    static async exportPublicKeyToBase64(publicKey) {
        const exported = await crypto.subtle.exportKey('spki', publicKey);
        return btoa(String.fromCharCode(...new Uint8Array(exported)));
    }
    static async hasValidKeys() {
        try {
            const publicKey = await this.getPublicKey();
            const privateKey = await this.getPrivateKey();
            return publicKey !== null && privateKey !== null;
        }
        catch {
            return false;
        }
    }
}
export const signData = async (data) => {
    await UserKeyManager.ensureKeyPair();
    const privateKey = await UserKeyManager.getPrivateKey();
    if (!privateKey) {
        throw new Error('Failed to retrieve user private key');
    }
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const signature = await crypto.subtle.sign({
        name: 'ECDSA',
        hash: 'SHA-256',
    }, privateKey, dataBuffer);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
};
export const getUserPublicKeyForServer = async (props) => {
    return await UserKeyManager.exportPublicKeyForServer(props);
};
export const initializeUserKeys = async () => {
    await UserKeyManager.ensureKeyPair();
};
export const validateUserKeysAgainstServer = async (serverKeys) => {
    return await UserKeyManager.validateAgainstServerKeys(serverKeys);
};
export const hasValidLocalKeys = async () => {
    return await UserKeyManager.hasValidKeys();
};
export const generateUserKeyPair = async () => {
    return await UserKeyManager.generateKeyPair();
};
export const getUserPublicKey = async () => {
    return await UserKeyManager.getPublicKey();
};
export const getUserPrivateKey = async () => {
    return await UserKeyManager.getPrivateKey();
};
//# sourceMappingURL=user-keys.js.map