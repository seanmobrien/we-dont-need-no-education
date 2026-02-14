import { NextResponse } from 'next/server';
import { wrapRouteRequest, extractParams } from '@/lib/nextjs-util/server/utils';
import { getTodoManager } from '@/lib/ai/tools/todo/todo-manager';
export const dynamic = 'force-dynamic';
export const GET = wrapRouteRequest(async (_req, withParams) => {
    const { listId } = await extractParams(withParams);
    if (!listId) {
        return NextResponse.json({ error: 'List ID is required' }, { status: 400 });
    }
    const todoManager = await getTodoManager();
    const list = await todoManager.getTodoList(listId, {});
    if (!list) {
        return NextResponse.json({ error: 'Todo list not found' }, { status: 404 });
    }
    return NextResponse.json({ data: list }, { status: 200 });
});
//# sourceMappingURL=route.js.map