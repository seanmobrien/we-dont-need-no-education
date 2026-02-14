import { LoggedError } from '@compliance-theater/logger';
import { decodeToken } from '../utilities';
export const setupSession = async ({ session: sessionFromProps, token, hash, }) => {
    const session = sessionFromProps;
    if (session && !session.user && token && (token.id || token.email)) {
        session.user = {};
    }
    if (session.user) {
        if (token.id) {
            session.user.id = String(token.id);
        }
        if (token.name && !session.user.name) {
            session.user.name = String(token.name);
        }
        if (token.email && !session.user.email) {
            session.user.email = String(token.email);
        }
        if (token.subject && !session.user.subject) {
            session.user.subject = String(token.subject);
        }
        if (token.account_id !== undefined) {
            session.user.account_id = token.account_id;
        }
        if (session.user.email) {
            const hashedEmail = await hash(session.user.email);
            if (hashedEmail) {
                session.user.hash = hashedEmail;
            }
        }
    }
    if (token.resource_access) {
        session.resource_access = {
            ...token.resource_access,
        };
    }
    else if (token.access_token) {
        try {
            const accessToken = await decodeToken({
                token: String(token.access_token),
                verify: false,
            });
            if (accessToken.resource_access) {
                session.resource_access = {
                    ...accessToken.resource_access,
                };
            }
        }
        catch (e) {
            LoggedError.isTurtlesAllTheWayDownBaby(e, {
                log: true,
                source: 'authjs:session.decode-access-token',
            });
        }
    }
    if (token.error) {
        session.error = token.error;
    }
    return session;
};
//# sourceMappingURL=shared.js.map