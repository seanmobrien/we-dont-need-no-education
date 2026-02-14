export declare const KEY_VALIDATION_INTERVAL: number;
export interface KeyValidationResult {
    isValid: boolean;
    hasLocalKey: boolean;
    matchesServerKey: boolean;
    error?: string;
    action: 'none' | 'generate_key' | 'upload_key' | 'retry';
}
export interface KeySyncResult {
    success: boolean;
    newPublicKey?: string;
    error?: string;
}
export declare function isKeyValidationDue(): boolean;
export declare function updateKeyValidationTimestamp(): void;
export declare function validateUserKeys(serverPublicKeys: string[], getUserPublicKey: () => Promise<CryptoKey | null>): Promise<KeyValidationResult>;
export declare function synchronizeKeys(generateKeyPair: () => Promise<{
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}>, exportPublicKeyForServer: () => Promise<string | null>, uploadPublicKeyToServer: ({ publicKey, }: {
    publicKey: string;
}) => Promise<void>): Promise<KeySyncResult>;
export declare function performKeyValidationWorkflow(serverPublicKeys: string[], keyManagerMethods: {
    getPublicKey: () => Promise<CryptoKey | null>;
    generateKeyPair: () => Promise<{
        publicKey: CryptoKey;
        privateKey: CryptoKey;
    }>;
    exportPublicKeyForServer: () => Promise<string | null>;
    uploadPublicKeyToServer: ({ publicKey, }: {
        publicKey: string;
    }) => Promise<void>;
}): Promise<{
    validated: boolean;
    synchronized: boolean;
    error?: string;
}>;
//# sourceMappingURL=key-validation.d.ts.map