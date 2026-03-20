import { drizDb, schema } from '@compliance-theater/database/orm';
import { log } from '@compliance-theater/logger';
import { ApiRequestError } from '@compliance-theater/send-api-request';
import type {
    AuthenticatedUserLike,
    IUserSigningKeysService,
    UserSigningKeyRecord,
    UserSigningKeyUploadRequest,
    UserSigningKeyUploadResult,
} from '@compliance-theater/types';
import { z } from 'zod';

const UploadKeyRequestSchema = z.object({
    publicKey: z.string().min(1, 'Public key is required'),
    expirationDate: z.string().datetime().optional(),
});

const jsonErrorResponse = (status: number, error: string): Response => {
    return Response.json(
        { success: false, error },
        { status },
    );
};

const normalizeUserId = (
    userOrId: AuthenticatedUserLike | number | string,
): number => {
    const rawUserId =
        typeof userOrId === 'object' && userOrId !== null
            ? userOrId.id
            : userOrId;
    const userId =
        typeof rawUserId === 'number'
            ? rawUserId
            : parseInt(String(rawUserId), 10);

    if (Number.isNaN(userId)) {
        throw new ApiRequestError(
            'Invalid user ID',
            jsonErrorResponse(400, 'Invalid user ID'),
        );
    }

    return userId;
};

const validatePublicKeyFormat = (publicKeyBase64: string): boolean => {
    try {
        const decoded = atob(publicKeyBase64);

        if (decoded.length < 50) {
            return false;
        }

        const uint8Array = new Uint8Array(decoded.length);
        for (let index = 0; index < decoded.length; index++) {
            uint8Array[index] = decoded.charCodeAt(index);
        }

        return uint8Array[0] === 0x30;
    } catch {
        return false;
    }
};

export const userSigningKeysService: IUserSigningKeysService = {
    getKeys: async (
        userOrId: AuthenticatedUserLike | number | string,
    ): Promise<UserSigningKeyRecord[]> => {
        const userId = normalizeUserId(userOrId);

        return await drizDb().query.userPublicKeys.findMany({
            where: (keys, { eq, and, isNull, gte, or }) =>
                and(
                    eq(keys.userId, userId),
                    or(
                        isNull(keys.expirationDate),
                        gte(keys.expirationDate, new Date().toISOString()),
                    ),
                ),
            columns: {
                id: true,
                publicKey: true,
                effectiveDate: true,
                expirationDate: true,
                createdAt: true,
            },
            orderBy: (keys, { desc }) => [desc(keys.effectiveDate)],
        });
    },
    getUploadRequest: async (
        userOrId: AuthenticatedUserLike | number | string,
        request: Pick<Request, 'json'>,
    ): Promise<UserSigningKeyUploadRequest> => {
        const userId = normalizeUserId(userOrId);

        try {
            const rawBody = await request.json();
            const parsedBody = UploadKeyRequestSchema.parse(rawBody);

            if (!validatePublicKeyFormat(parsedBody.publicKey)) {
                throw new ApiRequestError(
                    'Invalid public key format',
                    jsonErrorResponse(400, 'Invalid public key format'),
                );
            }

            return {
                userId,
                publicKey: parsedBody.publicKey,
                ...(parsedBody.expirationDate
                    ? { expirationDate: parsedBody.expirationDate }
                    : {}),
            };
        } catch (error) {
            if (ApiRequestError.isApiRequestError(error)) {
                throw error;
            }

            log((logger) =>
                logger.warn('Invalid key upload request', { error, userId }),
            );
            throw new ApiRequestError(
                'Invalid request format',
                jsonErrorResponse(400, 'Invalid request format'),
            );
        }
    },
    processKeyRequest: async (
        request: UserSigningKeyUploadRequest,
    ): Promise<UserSigningKeyUploadResult> => {
        const existingKey = await drizDb().query.userPublicKeys.findFirst({
            where: (keys, { eq, and, isNull, gte, or }) =>
                and(
                    eq(keys.userId, request.userId),
                    eq(keys.publicKey, request.publicKey),
                    or(
                        isNull(keys.expirationDate),
                        gte(keys.expirationDate, new Date().toISOString()),
                    ),
                ),
        });

        if (existingKey) {
            log((logger) =>
                logger.info('Public key already exists for user', {
                    userId: request.userId,
                    keyId: existingKey.id,
                }),
            );
            return {
                success: true,
                message: 'Public key already registered',
                keyId: existingKey.id,
                effectiveDate: existingKey.effectiveDate,
                expirationDate: existingKey.expirationDate,
            };
        }

        const expirationDate = request.expirationDate
            ? new Date(request.expirationDate)
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        const [insertedKey] = await drizDb()
            .insert(schema.userPublicKeys)
            .values({
                userId: request.userId,
                publicKey: request.publicKey,
                effectiveDate: new Date().toISOString(),
                expirationDate: expirationDate.toISOString(),
            })
            .returning();

        log((logger) =>
            logger.info('New public key registered', {
                userId: request.userId,
                keyId: insertedKey.id,
                effectiveDate: insertedKey.effectiveDate,
                expirationDate: insertedKey.expirationDate,
            }),
        );

        return {
            success: true,
            message: 'Public key registered successfully',
            keyId: insertedKey.id,
            effectiveDate: insertedKey.effectiveDate,
            expirationDate: insertedKey.expirationDate,
        };
    },
};