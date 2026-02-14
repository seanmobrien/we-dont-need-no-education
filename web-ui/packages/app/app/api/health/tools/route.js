import { auth } from '@/auth';
import { setupDefaultTools } from '@/lib/ai/mcp/providers';
import { wrapRouteRequest } from '@/lib/nextjs-util/server';
import { NextResponse } from 'next/server';
import { getMem0EnabledFlag } from '@/lib/ai/mcp/tool-flags';
const getExpectedProviderCount = async () => {
    const base = 2;
    const mem0 = await getMem0EnabledFlag();
    return base + (mem0.value ? 1 : 0);
};
const toolProviderFactory = async ({ req, user, }) => setupDefaultTools({
    user,
    writeEnabled: false,
    req,
    chatHistoryId: 'health-check',
    memoryEnabled: true,
});
export const GET = wrapRouteRequest(async (req) => {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ status: 401, message: 'Unauthorized' }, { status: 401 });
    }
    const toolProviders = await toolProviderFactory({
        req,
        chatHistoryId: 'health-check',
        user: session.user,
        sessionId: 'test-session',
    });
    const tools = Array.from(new Set(Object.keys(toolProviders.tools)));
    if (!toolProviders.isHealthy) {
        return NextResponse.json({ status: 'error', message: 'No tools available' }, { status: 200 });
    }
    let status, message;
    const totalProviders = toolProviders.providers.length;
    const expectedProviders = await getExpectedProviderCount();
    if (totalProviders < expectedProviders) {
        status = 'warning';
        message = `Only ${totalProviders} of ${expectedProviders} expected providers available`;
    }
    else if (tools.length <= 5) {
        status = 'warning';
        message = `Limited toolset available.`;
    }
    else {
        status = 'ok';
        message = 'All systems operational';
    }
    return NextResponse.json({ status, message, tools }, { status: 200 });
});
//# sourceMappingURL=route.js.map