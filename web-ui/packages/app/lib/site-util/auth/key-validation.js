import { log } from '@compliance-theater/logger';
import { SingletonProvider } from '@compliance-theater/typescript';
const KEY_VALIDATION_STORAGE_KEY = 'lastKeyValidation';
export const KEY_VALIDATION_INTERVAL = 2 * 60 * 60 * 1000;
export function isKeyValidationDue() {
    try {
        const lastValidationTime = SingletonProvider.Instance.get(KEY_VALIDATION_STORAGE_KEY);
        if (!lastValidationTime || isNaN(lastValidationTime)) {
            return true;
        }
        const now = Date.now();
        const timeSinceLastValidation = now - lastValidationTime;
        return timeSinceLastValidation >= KEY_VALIDATION_INTERVAL;
    }
    catch (error) {
        log((l) => l.warn('Failed to check key validation timing', { error }));
        return true;
    }
}
export function updateKeyValidationTimestamp() {
    try {
        SingletonProvider.Instance.set(KEY_VALIDATION_STORAGE_KEY, Date.now());
    }
    catch (error) {
        log((l) => l.warn('Failed to update key validation timestamp', { error }));
    }
}
async function exportPublicKeyToBase64(publicKey) {
    const exported = await crypto.subtle.exportKey('spki', publicKey);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}
export async function validateUserKeys(serverPublicKeys, getUserPublicKey) {
    try {
        const localPublicKey = await getUserPublicKey();
        if (!localPublicKey) {
            return {
                isValid: false,
                hasLocalKey: false,
                matchesServerKey: false,
                action: 'generate_key',
            };
        }
        const localPublicKeyBase64 = await exportPublicKeyToBase64(localPublicKey);
        const matchesServerKey = serverPublicKeys.some((serverKey) => serverKey === localPublicKeyBase64);
        if (matchesServerKey) {
            return {
                isValid: true,
                hasLocalKey: true,
                matchesServerKey: true,
                action: 'none',
            };
        }
        return {
            isValid: false,
            hasLocalKey: true,
            matchesServerKey: false,
            action: 'upload_key',
        };
    }
    catch (error) {
        log((l) => l.error('Key validation failed', {
            error,
            serverPublicKeys: serverPublicKeys.length,
        }));
        return {
            isValid: false,
            hasLocalKey: false,
            matchesServerKey: false,
            error: error instanceof Error ? error.message : 'Unknown validation error',
            action: 'retry',
        };
    }
}
export async function synchronizeKeys(generateKeyPair, exportPublicKeyForServer, uploadPublicKeyToServer) {
    try {
        log((l) => l.info('Starting key synchronization'));
        await generateKeyPair();
        const newPublicKeyBase64 = await exportPublicKeyForServer();
        if (!newPublicKeyBase64) {
            throw new Error('Failed to export new public key');
        }
        await uploadPublicKeyToServer({
            publicKey: newPublicKeyBase64,
        });
        updateKeyValidationTimestamp();
        log((l) => l.info('Key synchronization completed successfully'));
        return {
            success: true,
            newPublicKey: newPublicKeyBase64,
        };
    }
    catch (error) {
        log((l) => l.error('Key synchronization failed', { error }));
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown sync error',
        };
    }
}
export async function performKeyValidationWorkflow(serverPublicKeys, keyManagerMethods) {
    try {
        const validationResult = await validateUserKeys(serverPublicKeys, keyManagerMethods.getPublicKey);
        if (validationResult.isValid) {
            updateKeyValidationTimestamp();
            return { validated: true, synchronized: false };
        }
        if (validationResult.action === 'upload_key') {
            const publicKey = await keyManagerMethods.exportPublicKeyForServer();
            if (!publicKey) {
                return {
                    validated: false,
                    synchronized: false,
                    error: 'Failed to export public key for upload',
                };
            }
            await keyManagerMethods.uploadPublicKeyToServer({
                publicKey,
            });
        }
        if (validationResult.action === 'generate_key') {
            const syncResult = await synchronizeKeys(keyManagerMethods.generateKeyPair, keyManagerMethods.exportPublicKeyForServer, keyManagerMethods.uploadPublicKeyToServer);
            if (syncResult.success) {
                return { validated: true, synchronized: true };
            }
            else {
                return {
                    validated: false,
                    synchronized: false,
                    error: syncResult.error,
                };
            }
        }
        return {
            validated: false,
            synchronized: false,
            error: validationResult.error || 'Key validation failed',
        };
    }
    catch (error) {
        log((l) => l.error('Key validation workflow failed', { error }));
        return {
            validated: false,
            synchronized: false,
            error: error instanceof Error ? error.message : 'Unknown workflow error',
        };
    }
}
//# sourceMappingURL=key-validation.js.map