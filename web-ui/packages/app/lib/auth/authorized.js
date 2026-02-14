import { extractToken, KnownScopeValues, KnownScopeIndex } from './utilities';
import { unauthorizedServiceResponse } from '@/lib/nextjs-util/server/unauthorized-service-response';
import { log } from '@compliance-theater/logger';
export const authorized = async ({ auth, request, }) => {
    if (request) {
        const { nextUrl } = request;
        const publicFolders = ['/static/', '/.well-known/'];
        const publicPages = ['/', '/privacy'];
        if (publicFolders.some((folder) => nextUrl.pathname.startsWith(folder))) {
            return true;
        }
        if (publicPages.includes(nextUrl.pathname)) {
            return true;
        }
        if (auth && auth.user) {
            if (auth.expires) {
                const expiresAt = new Date(auth.expires).getTime();
                if (Date.now() > expiresAt) {
                    log((l) => l.warn('Session has expired', { expiresAt, now: Date.now(), auth }));
                    return unauthorizedServiceResponse({
                        req: request,
                        scopes: [
                            KnownScopeValues[KnownScopeIndex.ToolRead],
                            KnownScopeValues[KnownScopeIndex.ToolReadWrite],
                        ],
                    });
                }
            }
            return true;
        }
        const token = await extractToken(request);
        if (token) {
            if (token.exp) {
                if (Date.now() > token.exp) {
                    log((l) => l.warn('Token has expired', {
                        expiresAt: token.exp,
                        now: Date.now(),
                        token,
                    }));
                    return unauthorizedServiceResponse({
                        req: request,
                        scopes: [
                            KnownScopeValues[KnownScopeIndex.ToolRead],
                            KnownScopeValues[KnownScopeIndex.ToolReadWrite],
                        ],
                    });
                }
            }
            return true;
        }
        if (nextUrl.pathname.startsWith('/api/') && !auth) {
            return unauthorizedServiceResponse({
                req: request,
                scopes: [
                    KnownScopeValues[KnownScopeIndex.ToolRead],
                    KnownScopeValues[KnownScopeIndex.ToolReadWrite],
                ],
            });
        }
    }
    return !!auth;
};
//# sourceMappingURL=authorized.js.map