import { setupSession } from './shared';
import { log } from '@compliance-theater/logger/core';
import { decodeToken } from '../utilities';
import { getAccountTokens } from '../server/get-account-tokens';
import { createHash } from 'crypto';
import { LoggedError } from '@compliance-theater/logger';
const hashFromServer = async (input) => createHash('sha256').update(input).digest('hex');
export const session = async ({ session: sessionFromProps, token, }) => {
    const session = await setupSession({
        session: sessionFromProps,
        token,
        hash: hashFromServer,
    });
    if (!session?.user?.id) {
        return session;
    }
    try {
        const dbTokens = await getAccountTokens(session.user.id);
        if (dbTokens?.accessToken) {
            const expiresAt = dbTokens.expiresAt;
            if (expiresAt && Date.now() > expiresAt * 1000 && dbTokens.refreshToken) {
                log((l) => l.info('Session callback: Token expired in DB, refreshing...'));
                const { refreshAccessToken } = await import('../refresh-token');
                const { updateAccountTokens } = await import('../server/update-account-tokens');
                const tempToken = {
                    access_token: dbTokens.accessToken,
                    refresh_token: dbTokens.refreshToken,
                    expires_at: expiresAt,
                };
                const refreshed = await refreshAccessToken(tempToken);
                if (refreshed.error) {
                    session.error = refreshed.error;
                }
                else {
                    await updateAccountTokens(session.user.id, {
                        accessToken: refreshed.access_token,
                        refreshToken: refreshed.refresh_token,
                        expiresAt: Number(refreshed.expires_at ?? 0),
                        idToken: refreshed.idToken,
                    });
                    const decodedNew = await decodeToken({
                        token: refreshed.access_token,
                        verify: false,
                    });
                    if (decodedNew?.resource_access) {
                        session.resource_access = {
                            ...decodedNew.resource_access,
                            ...session.resource_access,
                        };
                    }
                }
            }
            else {
                if (!session.resource_access) {
                    const decoded = await decodeToken({
                        token: dbTokens.accessToken,
                        verify: false,
                    });
                    if (decoded?.resource_access) {
                        session.resource_access =
                            decoded.resource_access;
                    }
                }
            }
        }
    }
    catch (dbError) {
        LoggedError.isTurtlesAllTheWayDownBaby(dbError, {
            log: true,
            source: 'authjs:session.sync-db-tokens',
        });
    }
    return session;
};
//# sourceMappingURL=session-nodejs.js.map