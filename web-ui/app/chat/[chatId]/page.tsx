import * as React from 'react';
import { notFound } from 'next/navigation';
import { Box, Typography, Card, CardContent, Chip } from '@mui/material';
import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout/email-dashboard-layout';
import { query } from '@/lib/neondb';

interface ChatMessage {
  turnId: number;
  messageId: number;
  role: string;
  content: string | null;
  messageOrder: number;
  toolName: string | null;
}

interface ChatTurn {
  turnId: number;
  createdAt: string;
  completedAt: string | null;
  modelName: string | null;
  messages: ChatMessage[];
}

interface ChatDetails {
  id: string;
  title: string | null;
  createdAt: string;
  turns: ChatTurn[];
}

async function getChatDetails(chatId: string): Promise<ChatDetails | null> {
  try {
    // Get chat basic info
    const chatResult = await query(
      (sql) =>
        sql`SELECT id, title, created_at
        FROM chats 
        WHERE id = ${chatId}`,
    );

    if (chatResult.length === 0) {
      return null;
    }

    const chat = chatResult[0] as {
      id: string;
      title: string | null;
      created_at: string;
    };

    // Get chat turns and messages
    const turnsResult = await query(
      (sql) =>
        sql`SELECT 
          t.turn_id,
          t.created_at,
          t.completed_at,
          t.model_name,
          m.message_id,
          m.role,
          m.content,
          m.message_order,
          m.tool_name
        FROM chat_turns t
        LEFT JOIN chat_messages m ON t.chat_id = m.chat_id AND t.turn_id = m.turn_id
        WHERE t.chat_id = ${chatId}
        ORDER BY t.turn_id, m.message_order`,
    );

    // Group messages by turn
    const turnsMap = new Map<number, ChatTurn>();
    
    turnsResult.forEach((row: any) => {
      if (!turnsMap.has(row.turn_id)) {
        turnsMap.set(row.turn_id, {
          turnId: row.turn_id,
          createdAt: row.created_at,
          completedAt: row.completed_at,
          modelName: row.model_name,
          messages: [],
        });
      }

      if (row.message_id) {
        const turn = turnsMap.get(row.turn_id)!;
        turn.messages.push({
          turnId: row.turn_id,
          messageId: row.message_id,
          role: row.role,
          content: row.content,
          messageOrder: row.message_order,
          toolName: row.tool_name,
        });
      }
    });

    return {
      id: chat.id,
      title: chat.title,
      createdAt: chat.created_at,
      turns: Array.from(turnsMap.values()),
    };
  } catch (error) {
    console.error('Error fetching chat details:', error);
    return null;
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
          {chatDetails.turns.map((turn) => (
            <Card key={turn.turnId} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Chip 
                    label={`Turn ${turn.turnId}`} 
                    variant="outlined" 
                    size="small"
                    sx={{ mr: 2 }}
                  />
                  {turn.modelName && (
                    <Chip 
                      label={turn.modelName} 
                      variant="outlined" 
                      size="small"
                      color="primary"
                    />
                  )}
                </Box>
                
                {turn.messages.map((message) => (
                  <Box 
                    key={`${message.turnId}-${message.messageId}`}
                    sx={{ 
                      mb: 2, 
                      p: 2, 
                      bgcolor: message.role === 'user' ? 'action.hover' : 'background.paper',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Chip 
                        label={message.role} 
                        size="small"
                        color={message.role === 'user' ? 'secondary' : 'primary'}
                        sx={{ mr: 1 }}
                      />
                      {message.toolName && (
                        <Chip 
                          label={`Tool: ${message.toolName}`} 
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.content || '<no content>'}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          ))}
          
          {chatDetails.turns.length === 0 && (
            <Typography variant="body1" color="text.secondary">
              No messages found in this chat.
            </Typography>
          )}
        </Box>
      </Box>
    </EmailDashboardLayout>
  );
}