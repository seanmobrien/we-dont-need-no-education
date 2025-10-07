import * as React from 'react';
import Box from '@mui/material/Box';
import EmailList from '/components/email-message/list';
import { auth } from '/auth';
import { EmailDashboardLayout } from '/components/email-message/dashboard-layout/email-dashboard-layout';

export default async function Page() {
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
        <EmailList />
      </Box>
    </EmailDashboardLayout>
  );
}
