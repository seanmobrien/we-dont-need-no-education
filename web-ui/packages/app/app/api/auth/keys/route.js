import { NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { auth } from '@/auth';
import { drizDb, schema } from '@compliance-theater/database/orm';
import { log, LoggedError } from '@compliance-theater/logger';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
const UploadKeyRequestSchema = z.object({
    publicKey: z.string().min(1, 'Public key is required'),
    expirationDate: z.string().datetime().optional(),
});
function validatePublicKeyFormat(publicKeyBase64) {
    try {
        const decoded = atob(publicKeyBase64);
        if (decoded.length < 50) {
            return false;
        }
        const uint8Array = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
            uint8Array[i] = decoded.charCodeAt(i);
        }
        if (uint8Array[0] !== 0x30) {
            return false;
        }
        return true;
    }
    catch {
        return false;
    }
}
export const POST = wrapRouteRequest(async (req) => {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        const userId = typeof session.user.id === 'number'
            ? session.user.id
            : parseInt(session.user.id, 10);
        if (isNaN(userId)) {
            return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
        }
        let requestBody;
        try {
            const rawBody = await req.json();
            requestBody = UploadKeyRequestSchema.parse(rawBody);
        }
        catch (error) {
            log((l) => l.warn('Invalid key upload request', { error, userId }));
            return NextResponse.json({ success: false, error: 'Invalid request format' }, { status: 400 });
        }
        if (!validatePublicKeyFormat(requestBody.publicKey)) {
            return NextResponse.json({ success: false, error: 'Invalid public key format' }, { status: 400 });
        }
        const existingKey = await drizDb().query.userPublicKeys.findFirst({
            where: (keys, { eq, and, isNull, gte, or }) => and(eq(keys.userId, userId), eq(keys.publicKey, requestBody.publicKey), or(isNull(keys.expirationDate), gte(keys.expirationDate, new Date().toISOString()))),
        });
        if (existingKey) {
            log((l) => l.info('Public key already exists for user', {
                userId,
                keyId: existingKey.id,
            }));
            return NextResponse.json({
                success: true,
                message: 'Public key already registered',
                keyId: existingKey.id,
            });
        }
        const expirationDate = requestBody.expirationDate
            ? new Date(requestBody.expirationDate)
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        const [insertedKey] = await drizDb()
            .insert(schema.userPublicKeys)
            .values({
            userId,
            publicKey: requestBody.publicKey,
            effectiveDate: new Date().toISOString(),
            expirationDate: expirationDate.toISOString(),
        })
            .returning({
            id: schema.userPublicKeys.id,
            effectiveDate: schema.userPublicKeys.effectiveDate,
            expirationDate: schema.userPublicKeys.expirationDate,
        });
        log((l) => l.info('New public key registered', {
            userId,
            keyId: insertedKey.id,
            effectiveDate: insertedKey.effectiveDate,
            expirationDate: insertedKey.expirationDate,
        }));
        return NextResponse.json({
            success: true,
            message: 'Public key registered successfully',
            keyId: insertedKey.id,
            effectiveDate: insertedKey.effectiveDate,
            expirationDate: insertedKey.expirationDate,
        });
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'POST /api/auth/keys',
            message: 'Failed to upload public key',
            critical: false,
        });
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
});
export const GET = wrapRouteRequest(async () => {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
        }
        const userId = typeof session.user.id === 'number'
            ? session.user.id
            : parseInt(session.user.id, 10);
        if (isNaN(userId)) {
            return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
        }
        const userKeys = await drizDb().query.userPublicKeys.findMany({
            where: (keys, { eq, and, isNull, gte, or }) => and(eq(keys.userId, userId), or(isNull(keys.expirationDate), gte(keys.expirationDate, new Date().toISOString()))),
            columns: {
                id: true,
                publicKey: true,
                effectiveDate: true,
                expirationDate: true,
                createdAt: true,
            },
            orderBy: (keys, { desc }) => [desc(keys.effectiveDate)],
        });
        return NextResponse.json({
            success: true,
            keys: userKeys,
            count: userKeys.length,
        });
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'GET /api/auth/keys',
            message: 'Failed to retrieve public keys',
            critical: false,
        });
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
});
//# sourceMappingURL=route.js.map