import * as React from 'react';
import Box from '@mui/material/Box';
import ChatList from '@/components/chat/list';
import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout/email-dashboard-layout'  ;

const Page = async () => {
  const session = await auth();
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
        <ChatList />
      </Box>
    </EmailDashboardLayout>
  );
}

export default Page;