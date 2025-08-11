import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { schema } from '@/lib/drizzle-db/schema';
import { eq, and } from 'drizzle-orm';
import { LoggedError } from '@/lib/react-util';
import type { ChatDetails, ChatTurn } from '@/lib/ai/chat';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';

/**
 * Handles GET request to fetch chat details by ID
 * 
 * @param req - The Next.js request object
 * @param params - Route parameters containing chatId
 * @returns JSON response with chat details or error
 */
export const GET = wrapRouteRequest(async (
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
): Promise<NextResponse> => {
  try {
    // Validate session authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - session required' },
        { status: 401 }
      );
    }

    const { chatId } = await params;

    const db = await drizDbWithInit();

    // Get chat basic info using drizzle
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
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    const chat = chatResult[0];

    // Get chat turns and messages using drizzle with joins
    const turnsAndMessagesResult = await db
      .select({
        // Turn fields
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
        // Message fields
        messageId: schema.chatMessages.messageId,
        role: schema.chatMessages.role,
        content: schema.chatMessages.content,
        messageOrder: schema.chatMessages.messageOrder,
        toolName: schema.chatMessages.toolName,
        functionCall: schema.chatMessages.functionCall,
        messageStatusId: schema.chatMessages.statusId,
        providerId: schema.chatMessages.providerId,
        messageMetadata: schema.chatMessages.metadata,
        toolInstanceId: schema.chatMessages.toolInstanceId,
        optimizedContent: schema.chatMessages.optimizedContent,
      })
      .from(schema.chatTurns)
      .leftJoin(
        schema.chatMessages,
        and(
          eq(schema.chatTurns.chatId, schema.chatMessages.chatId),
          eq(schema.chatTurns.turnId, schema.chatMessages.turnId)
        )
      )
      .where(eq(schema.chatTurns.chatId, chatId))
      .orderBy(schema.chatTurns.turnId, schema.chatMessages.messageOrder);

    // Group messages by turn
    const turnsMap = new Map<number, ChatTurn>();
    turnsAndMessagesResult.forEach((row: Record<string, unknown>) => {
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
          metadata: row.turnMetadata as Record<string, unknown>,
          messages: [],
        });
      }

      if (row.messageId) {
        const turn = turnsMap.get(Number(row.turnId))!;
        turn.messages.push({
          turnId: Number(row.turnId),
          messageId: Number(row.messageId),
          role: String(row.role),
          content: String(row.content),
          messageOrder: Number(row.messageOrder),
          toolName: String(row.toolName),
          functionCall: row.functionCall as Record<string, unknown> | null,
          statusId: Number(row.messageStatusId),
          providerId: String(row.providerId),
          metadata: row.messageMetadata as Record<string, unknown>,
          toolInstanceId: String(row.toolInstanceId),
          optimizedContent: row.optimizedContent as string | null,
        });
      }
    });

    const chatDetails: ChatDetails = {
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt ?? new Date().toISOString(),
      turns: Array.from(turnsMap.values()),
    };

    return NextResponse.json(chatDetails);
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      message: 'Error fetching chat details',
      context: { chatId: (await params).chatId }
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
});
