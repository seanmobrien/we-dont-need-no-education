import * as React from 'react';
import { notFound } from 'next/navigation';
import { Box, Typography } from '@mui/material';
import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout/email-dashboard-layout';
import { VirtualizedChatDisplay } from '@/components/chat';
import { headers } from 'next/headers';

interface ChatMessage {
  turnId: number;
  messageId: number;
  role: string;
  content: string | null;
  messageOrder: number;
  toolName: string | null;
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

/**
 * Fetches chat details from the API route
 */
async function getChatDetails(chatId: string): Promise<ChatDetails | null> {
  try {
    const headersList = await headers();
    const host = headersList.get('host');
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    
    const response = await fetch(`${baseUrl}/api/ai/chat/history/${chatId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies for authentication
        'Cookie': headersList.get('cookie') || '',
      },
      cache: 'no-store', // Always fetch fresh data
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const chatDetails: ChatDetails = await response.json();
    return chatDetails;
  } catch (error) {
    console.error('Error fetching chat details:', error);
    throw error;
  }
}

export default async function ChatDetailPage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const session = await auth();
  const chatDetails = await getChatDetails((await params).chatId);

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
