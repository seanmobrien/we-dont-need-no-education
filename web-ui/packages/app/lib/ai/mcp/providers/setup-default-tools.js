import { toolProviderSetFactory } from './tool-provider-factory';
import { env } from '@compliance-theater/env';
import { forAdmin, fromUserId as fromUser, } from '@/lib/auth/impersonation/impersonation-factory';
import { encode, getToken } from '@auth/core/jwt';
import { getMem0EnabledFlag, getStreamingTransportFlag } from '../tool-flags';
export const getMcpClientHeaders = ({ req, chatHistoryId, }) => {
    const ret = {
        ...(chatHistoryId ? { 'x-chat-history-id': chatHistoryId } : {}),
    };
    const sessionCookie = req.cookies?.get('authjs.session-token')?.value ?? '';
    if (sessionCookie.length > 0) {
        ret.Cookie = `authjs.session-token=${sessionCookie}`;
    }
    return ret;
};
export const setupDefaultTools = async ({ writeEnabled, req, chatHistoryId, user, memoryEnabled = true, }) => {
    const options = [];
    const defaultHeaders = {
        ...(chatHistoryId ? { 'x-chat-history-id': chatHistoryId } : {}),
    };
    const globalMem0Enabled = await getMem0EnabledFlag();
    if (req) {
        const token = await getToken({
            req,
            secret: env('AUTH_SECRET'),
        });
        const encoded = token
            ? await encode({
                token,
                secret: env('AUTH_SECRET'),
                maxAge: 60 * 60,
                salt: 'bearer-token',
            })
            : null;
        const streamingTransport = await getStreamingTransportFlag();
        const url = new URL(`/api/ai/tools/${streamingTransport.value ? 'mcp' : 'sse'}`, env('NEXT_PUBLIC_HOSTNAME'));
        const sessionTokenKey = (url.protocol === 'https:' ? '__Secure-' : '') + 'authjs.session-token';
        const sessionToken = req.cookies?.get(sessionTokenKey)?.value;
        options.push({
            allowWrite: writeEnabled,
            url: url.toString(),
            headers: async () => ({
                ...defaultHeaders,
                ...(encoded ? { Authorization: `Bearer ${encoded}` } : {}),
                ...(sessionToken
                    ? { Cookie: `${sessionTokenKey}=${sessionToken}` }
                    : {}),
            }),
        });
    }
    if (memoryEnabled && globalMem0Enabled.value) {
        const impersonation = await (user ? fromUser({ user }) : forAdmin());
        if (!impersonation) {
            throw new Error('Impersonation context is required for memory tool setup');
        }
        options.push({
            allowWrite: true,
            sse: true,
            headers: async () => ({
                ...defaultHeaders,
                'cache-control': 'no-cache, no-transform',
                'content-encoding': 'none',
                Authorization: `Bearer ${impersonation ? await impersonation.getImpersonatedToken() : ''}`,
            }),
            url: `${env('MEM0_API_HOST')}/mcp/${env('MEM0_PROJECT_ID')}/sse`,
        });
    }
    return await toolProviderSetFactory(options);
};
//# sourceMappingURL=setup-default-tools.js.map