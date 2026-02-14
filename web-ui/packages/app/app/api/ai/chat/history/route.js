import { NextResponse } from 'next/server';
import { log, LoggedError } from '@compliance-theater/logger';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { schema } from '@compliance-theater/database/orm';
import { selectForGrid, } from '@/lib/components/mui/data-grid/queryHelpers';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import { lte, inArray } from 'drizzle-orm/sql';
import { getAccessibleUserIds } from '@/lib/auth/resources/case-file';
const NEVER_USE_USER_ID = -942370932;
const getColumnFromName = (columnName, { columnTurns, columnMessages, columnTokens, }) => {
    switch (columnName) {
        case 'id':
            return schema.chats.id;
        case 'title':
            return schema.chats.title;
        case 'user_id':
            return schema.chats.userId;
        case 'created_at':
            return schema.chats.createdAt;
        case 'chat_metadata':
            return schema.chats.metadata;
        case 'total_tokens':
            return columnTokens;
        case 'total_messages':
            return columnMessages;
        case 'total_turns':
            return columnTurns;
        default:
            return undefined;
    }
};
const recordMapper = (record) => ({
    id: String(record.id),
    title: record.title != null ? String(record.title) : null,
    userId: Number(record.userId),
    createdAt: String(record.createdAt),
    chatMetadata: typeof record.chatMetadata === 'string'
        ? JSON.parse(record.chatMetadata)
        : record.chatMetadata,
    totalTokens: Number(record.totalTokens) || 0,
    totalMessages: Number(record.totalMessages) || 0,
    totalTurns: Number(record.totalTurns) || 0,
});
const columnMap = {
    chatMetadata: 'chat_metadata',
    createdAt: 'created_at',
    id: 'id',
    title: 'title',
    totalTokens: 'total_tokens',
    totalMessages: 'total_messages',
    totalTurns: 'total_turns',
    userId: 'user_id',
};
export const GET = wrapRouteRequest(async (req) => {
    try {
        const url = new URL(req.url);
        const viewType = url.searchParams.get('viewType') || 'user';
        const isSystemView = viewType === 'system';
        const accessibleUsers = (await getAccessibleUserIds(req)) ?? [
            NEVER_USE_USER_ID,
        ];
        const result = await drizDbWithInit((db) => {
            const query = db
                .select({
                id: schema.chats.id,
                title: schema.chats.title,
                userId: schema.chats.userId,
                createdAt: schema.chats.createdAt,
                chatMetadata: schema.chats.metadata,
                totalTokens: schema.chats.allTheTokens,
                totalMessages: schema.chats.allTheMessages,
                totalTurns: schema.chats.allTheTurns,
            })
                .from(schema.chats);
            const filteredQuery = isSystemView
                ? query.where(lte(schema.chats.userId, 0))
                : query.where(inArray(schema.chats.userId, accessibleUsers));
            return selectForGrid({
                req,
                query: filteredQuery,
                getColumn: (c) => getColumnFromName(c, {
                    columnTokens: schema.chats.allTheTokens,
                    columnMessages: schema.chats.allTheMessages,
                    columnTurns: schema.chats.allTheTurns,
                }),
                columnMap,
                recordMapper,
                defaultSort: [{ field: 'created_at', sort: 'desc' }],
            });
        });
        log((l) => l.verbose({
            msg: `[[AUDIT]] - Chat history list (${viewType} view) ${result.results.length} matches:`,
            resultset: result.results.map((x) => x.id),
            viewType,
        }));
        return NextResponse.json(result);
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'GET chat history',
        });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}, { buildFallback: { rows: [], rowCount: 0 } });
export const dynamic = 'force-dynamic';
//# sourceMappingURL=route.js.map