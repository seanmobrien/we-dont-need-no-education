import * as React from 'react';
import { notFound, unauthorized } from 'next/navigation';
import { Box } from '@mui/material';
import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout/email-dashboard-layout';
import { ChatHistory } from '@/components/chat/history';
import { extractParams } from '@/lib/nextjs-util';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { isUserAuthorized } from '@/lib/site-util/auth';


export const getChatDetails = async ({
  chatId,
  userId,
}: {
  chatId: string;
  userId: number;
}) => {
  const chat = await drizDbWithInit((db) =>
    db.query.chats.findFirst({
      columns: {
        id: true,
        userId: true,
        title: true,
      },
      where: (chat, { eq }) => eq(chat.id, chatId),
    }),
  );
  return chat &&
    (await isUserAuthorized({
      signedInUserId: userId,
      ownerUserId: chat.userId,
    }))
    ? {
        ok: true,
        title: !chat.title ? undefined : chat.title,
      }
    : {
        ok: false,
      };
};


const ChatDetailPage = async (req: {
  params: Promise<{ chatId: string }>;
}) => {
  const session = await auth();
  const userId = Number(session?.user?.id ?? 0);
  if (!userId) {
    unauthorized();
  }
  const { chatId } = await extractParams(req);
  const { ok, title } = await getChatDetails({ chatId, userId });
  if (!ok) {
    notFound();
  }

  return (
    <EmailDashboardLayout session={session}>
      <Box sx={{ p: 2 }}>
        <ChatHistory chatId={chatId} title={title} />
      </Box>
    </EmailDashboardLayout>
  );
}

export default ChatDetailPage;