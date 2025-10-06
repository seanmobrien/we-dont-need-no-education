import * as React from 'react';
import { notFound, unauthorized } from 'next/navigation';
import { Box } from '@mui/material';
import { auth } from '/auth';
import { EmailDashboardLayout } from '/components/email-message/dashboard-layout/email-dashboard-layout';
import { ChatHistory } from '/components/chat/history';
import { extractParams } from '/lib/nextjs-util/utils';
import { getChatDetails } from '/lib/ai/chat/history';

const ChatDetailPage = async (req: { params: Promise<{ chatId: string }> }) => {
  const session = await auth();
  const userId = Number(session?.user?.id ?? 0);
  if (!userId) {
    unauthorized();
  }
  let { chatId } = await extractParams(req);
  let { ok, title } = await getChatDetails({ chatId, userId });
  if (!ok) {
    chatId = decodeURIComponent(chatId);
    const { ok: okDecoded, title: titleDecoded } = await getChatDetails({
      chatId,
      userId,
    });
    ok = okDecoded;
    if (ok) {
      title = titleDecoded;
    } else {
      notFound();
    }
  }

  return (
    <EmailDashboardLayout session={session}>
      <Box sx={{ p: 2 }}>
        <ChatHistory chatId={chatId} title={title} />
      </Box>
    </EmailDashboardLayout>
  );
};

export default ChatDetailPage;
