import type { User } from '@compliance-theater/auth-compat';

export type AuthenticatedUserLike = Pick<User, 'id'>;

export type UserSigningKeyRecord = {
    id: number;
    publicKey: string;
    effectiveDate: string;
    expirationDate: string | null;
    createdAt: string | null;
};

export type UserSigningKeyUploadRequest = {
    userId: number;
    publicKey: string;
    expirationDate?: string;
};

export type UserSigningKeyUploadResult = {
    success: true;
    message: string;
    keyId: number;
    effectiveDate: string;
    expirationDate: string | null;
};

export type IUserSigningKeysService = {
    getKeys: {
        (user: AuthenticatedUserLike): Promise<UserSigningKeyRecord[]>;
        (userId: number | string): Promise<UserSigningKeyRecord[]>;
    };
    getUploadRequest: {
        (
            user: AuthenticatedUserLike,
            request: Pick<Request, 'json'>,
        ): Promise<UserSigningKeyUploadRequest>;
        (
            userId: number | string,
            request: Pick<Request, 'json'>,
        ): Promise<UserSigningKeyUploadRequest>;
    };
    processKeyRequest: (
        request: UserSigningKeyUploadRequest,
    ) => Promise<UserSigningKeyUploadResult>;
};