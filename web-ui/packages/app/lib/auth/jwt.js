import { log } from '@compliance-theater/logger';
import { decodeToken } from './utilities';
export const jwt = async ({ token, user, account, }) => {
    if (account && user) {
        const sessionDuration = 2 * 60 * 60;
        token.expires_at = Math.floor(Date.now() / 1000) + sessionDuration;
    }
    if (user) {
        token.id = user.id;
        if ('account_id' in user && !!user.account_id) {
            token.account_id = user.account_id;
        }
        if (account?.access_token) {
            try {
                const accessTokenPayload = (await decodeToken({
                    token: account.access_token,
                    verify: true,
                }));
                if (accessTokenPayload?.account_id) {
                    if (!token.account_id) {
                        token.account_id = accessTokenPayload.account_id;
                    }
                }
                if (accessTokenPayload.resource_access) {
                    token.resource_access = {
                        ...accessTokenPayload.resource_access,
                        ...token.resource_access,
                    };
                }
            }
            catch (decodeError) {
                log((l) => l.warn('Failed to decode access_token JWT payload:', decodeError));
            }
        }
    }
    return token;
};
//# sourceMappingURL=jwt.js.map