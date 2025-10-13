import * as React from 'react';
import { Box } from '@mui/material';
import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout/email-dashboard-layout';
import { ChatHistory } from '@/components/chat/history';
import { extractParams } from '@/lib/nextjs-util/utils';
import { getChatDetails } from '@/lib/ai/chat/history';
import { notFound, unauthorized } from 'next/navigation';

/**
 * Server-rendered inner component that performs async auth/permission checks.
 * Returns either Access Denied UI or the dashboard content.
 */
const ChatDetailPage = async (req: {
  url: string;
  params: Promise<{ chatId: string }>;
}) => {
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
