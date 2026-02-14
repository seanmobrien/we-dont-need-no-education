import { wrapRouteRequest } from '@/lib/nextjs-util/server';
import { isKeyOf } from '@compliance-theater/typescript';
import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';
import { NextResponse } from 'next/server';
const HealthActionValues = ['reset-globals'];
class ResetGlobalsStrategy {
    async execute() {
        SingletonProvider.Instance.clear();
        return NextResponse.json({
            status: 'ok',
            message: 'Global singletons cleared.',
        });
    }
}
const strategyRegistry = {
    'reset-globals': new ResetGlobalsStrategy(),
};
export const POST = wrapRouteRequest(async (req) => {
    const body = (await req.json());
    if (!body || !body.action) {
        return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }
    let strategy = undefined;
    if (isKeyOf(body.action, HealthActionValues)) {
        strategy = strategyRegistry[body.action];
    }
    if (!strategy) {
        return NextResponse.json({ error: `Invalid action: ${body.action}` }, { status: 400 });
    }
    return strategy.execute();
});
//# sourceMappingURL=route.js.map