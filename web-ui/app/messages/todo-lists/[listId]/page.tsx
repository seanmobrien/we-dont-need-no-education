import * as React from 'react';
import Box from '@mui/material/Box';
import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout/email-dashboard-layout';
import TodoItemsGrid from '@/components/todo/todo-items-grid';

type Props = {
  params: Promise<{ listId: string }>;
};

export default async function Page({ params }: Props) {
  const session = await auth();
  const { listId } = await params;

  return (
    <EmailDashboardLayout session={session}>
      <Box
        sx={{
          width: '100%',
          '& > :not(style)': {
            m: 1,
          },
        }}
      >
        <TodoItemsGrid listId={listId} />
      </Box>
    </EmailDashboardLayout>
  );
}
