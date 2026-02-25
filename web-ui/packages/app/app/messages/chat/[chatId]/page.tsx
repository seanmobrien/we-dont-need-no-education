import * as React from 'react';
import Box from '@mui/material/Box';
import { auth } from '@compliance-theater/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout/email-dashboard-layout';
import { ChatHistory } from '@/components/ai/chat/history';
import { extractParams } from '@compliance-theater/nextjs/server/utils';
import { getChatDetails } from '@/lib/ai/chat/history';
import { notFound, unauthorized } from 'next/navigation';

/**
 * Server-rendered inner component that performs async auth/permission checks.
 * Returns either Access Denied UI or the dashboard content.
 */
const ChatDetailPage = async (req: { params: Promise<{ chatId: string }> }) => {
  const props = { session: await auth() };

  if (!props.session) {
    return unauthorized();
  }

  const { user: { id: userIdFromProps } = {} } = props.session;
  const userId = Number(userIdFromProps);
  if (!userId || isNaN(userId)) {
    return notFound();
  }

  const { chatId } = await extractParams(req);
  if (!chatId) {
    return notFound();
  }

  // Try direct id first
  const details = await getChatDetails({ chatId, userId });
  if (!details.ok) {
    return notFound();
  }

  // success
  return (
    <EmailDashboardLayout session={props.session}>
      <Box sx={{ p: 2 }}>
        <ChatHistory chatId={chatId} title={details.title} />
      </Box>
    </EmailDashboardLayout>
  );
};

export default ChatDetailPage;
