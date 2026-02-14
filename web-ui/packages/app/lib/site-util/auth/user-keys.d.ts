export declare const signData: (data: string) => Promise<string>;
export declare const getUserPublicKeyForServer: (props?: {
    publicKey?: CryptoKey | undefined;
}) => Promise<string | null>;
export declare const initializeUserKeys: () => Promise<void>;
export declare const validateUserKeysAgainstServer: (serverKeys: string[]) => Promise<boolean>;
export declare const hasValidLocalKeys: () => Promise<boolean>;
export declare const generateUserKeyPair: () => Promise<{
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}>;
export declare const getUserPublicKey: () => Promise<CryptoKey | null>;
export declare const getUserPrivateKey: () => Promise<CryptoKey | null>;
//# sourceMappingURL=user-keys.d.ts.map