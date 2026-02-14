import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { schema } from '@compliance-theater/database/orm';
import { eq, and } from 'drizzle-orm';
import { LoggedError } from '@compliance-theater/logger';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
export const dynamic = 'force-dynamic';
export const GET = wrapRouteRequest(async (req, { params }) => {
    const { chatId } = await params;
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized - session required' }, { status: 401 });
        }
        const db = await drizDbWithInit();
        const chatResult = await db
            .select({
            id: schema.chats.id,
            title: schema.chats.title,
            createdAt: schema.chats.createdAt,
        })
            .from(schema.chats)
            .where(eq(schema.chats.id, chatId))
            .limit(1);
        if (chatResult.length === 0) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }
        const chat = chatResult[0];
        const turnsAndMessagesResult = await db
            .select({
            turnId: schema.chatTurns.turnId,
            createdAt: schema.chatTurns.createdAt,
            completedAt: schema.chatTurns.completedAt,
            modelName: schema.chatTurns.modelName,
            turnStatusId: schema.chatTurns.statusId,
            temperature: schema.chatTurns.temperature,
            topP: schema.chatTurns.topP,
            latencyMs: schema.chatTurns.latencyMs,
            warnings: schema.chatTurns.warnings,
            errors: schema.chatTurns.errors,
            turnMetadata: schema.chatTurns.metadata,
            messageId: schema.chatMessages.messageId,
            role: schema.chatMessages.role,
            content: schema.chatMessages.content,
            messageOrder: schema.chatMessages.messageOrder,
            toolName: schema.chatMessages.toolName,
            functionCall: schema.chatMessages.functionCall,
            toolResult: schema.chatMessages.toolResult,
            messageStatusId: schema.chatMessages.statusId,
            providerId: schema.chatMessages.providerId,
            messageMetadata: schema.chatMessages.metadata,
            toolInstanceId: schema.chatMessages.toolInstanceId,
            optimizedContent: schema.chatMessages.optimizedContent,
        })
            .from(schema.chatTurns)
            .leftJoin(schema.chatMessages, and(eq(schema.chatTurns.chatId, schema.chatMessages.chatId), eq(schema.chatTurns.turnId, schema.chatMessages.turnId)))
            .where(eq(schema.chatTurns.chatId, chatId))
            .orderBy(schema.chatTurns.turnId, schema.chatMessages.messageOrder);
        const turnsMap = new Map();
        turnsAndMessagesResult.forEach((row) => {
            if (!turnsMap.has(Number(row.turnId))) {
                turnsMap.set(Number(row.turnId), {
                    turnId: Number(row.turnId),
                    createdAt: String(row.createdAt),
                    completedAt: String(row.completedAt),
                    modelName: String(row.modelName),
                    statusId: Number(row.turnStatusId),
                    temperature: Number(row.temperature),
                    topP: Number(row.topP),
                    latencyMs: Number(row.latencyMs),
                    warnings: Array.isArray(row.warnings) ? row.warnings : [],
                    errors: Array.isArray(row.errors) ? row.errors : [],
                    metadata: row.turnMetadata,
                    messages: [],
                });
            }
            if (row.messageId) {
                const turn = turnsMap.get(Number(row.turnId));
                turn.messages.push({
                    turnId: Number(row.turnId),
                    messageId: Number(row.messageId),
                    role: String(row.role),
                    content: String(row.content),
                    messageOrder: Number(row.messageOrder),
                    toolName: String(row.toolName),
                    functionCall: row.functionCall,
                    toolResult: row.toolResult,
                    statusId: Number(row.messageStatusId),
                    providerId: String(row.providerId),
                    metadata: row.messageMetadata,
                    toolInstanceId: String(row.toolInstanceId),
                    optimizedContent: row.optimizedContent,
                });
            }
        });
        const chatDetails = {
            id: chat.id,
            title: chat.title,
            createdAt: chat.createdAt ?? new Date().toISOString(),
            turns: Array.from(turnsMap.values()),
        };
        return NextResponse.json(chatDetails);
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            message: 'Error fetching chat details',
            context: { chatId },
        });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}, { buildFallback: { id: 'not-enabled', title: 'Wait for build to complete' } });
//# sourceMappingURL=route.js.map