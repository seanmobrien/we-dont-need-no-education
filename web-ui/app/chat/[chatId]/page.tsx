import * as React from 'react';
import { notFound } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout/email-dashboard-layout';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { schema } from '@/lib/drizzle-db/schema';
import { eq, and } from 'drizzle-orm';
import { VirtualizedChatDisplay } from '@/components/chat';
import { StringCheckGrader } from 'openai/resources/graders/grader-models.mjs';

interface ChatMessage {
  turnId: number;
  messageId: number;
  role: string;
  content: string | null;
  messageOrder: number;
  toolName: string | null;
  // Additional message-level metadata fields
  functionCall: Record<string, unknown> | null;
  statusId: number;
  providerId: string | null;
  metadata: Record<string, unknown> | null;
  toolInstanceId: string | null;
  optimizedContent: string | null;
}

interface ChatTurn {
  turnId: number;
  createdAt: string;
  completedAt: string | null;
  modelName: string | null;
  messages: ChatMessage[];
  // Additional turn properties for optional display
  statusId: number;
  temperature: number | null;
  topP: number | null;
  latencyMs: number | null;
  warnings: string[] | null;
  errors: string[] | null;
  metadata: Record<string, unknown> | null;
}

interface ChatDetails {
  id: string;
  title: string | null;
  createdAt: string;
  turns: ChatTurn[];
}

async function getChatDetails(chatId: string): Promise<ChatDetails | null> {
  try {
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
      return null;
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
          createdAt: row.createdAt,
          completedAt: row.completedAt,
          modelName: row.modelName,
          statusId: row.turnStatusId,
          temperature: row.temperature,
          topP: row.topP,
          latencyMs: row.latencyMs,
          warnings: row.warnings,
          errors: row.errors,
          metadata: row.turnMetadata,
          messages: [],
        });
      }

      if (row.messageId) {
        const turn = turnsMap.get(row.turnId)!;
        turn.messages.push({
          turnId: row.turnId,
          messageId: row.messageId,
          role: row.role,
          content: row.content,
          messageOrder: row.messageOrder,
          toolName: row.toolName,
          functionCall: row.functionCall,
          statusId: row.messageStatusId,
          providerId: row.providerId,
          metadata: row.messageMetadata,
          toolInstanceId: row.toolInstanceId,
          optimizedContent: row.optimizedContent,
        });
      }
    });

    return {
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      turns: Array.from(turnsMap.values()),
    };
  } catch (error) {
    console.error('Error fetching chat details:', error);
    throw error;
  }
}

export default async function ChatDetailPage({
  params,
}: {
  params: { chatId: string };
}) {
  const session = await auth();
  const chatDetails = await getChatDetails(params.chatId);

  if (!chatDetails) {
    notFound();
  }

  return (
    <EmailDashboardLayout session={session}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h4" gutterBottom>
          {chatDetails.title || `Chat ${chatDetails.id.slice(-8)}`}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Created: {new Date(chatDetails.createdAt).toLocaleString()}
        </Typography>

        <Box sx={{ mt: 3 }}>
          <VirtualizedChatDisplay 
            turns={chatDetails.turns}
            height={800}
          />
        </Box>
      </Box>
    </EmailDashboardLayout>
  );
}
