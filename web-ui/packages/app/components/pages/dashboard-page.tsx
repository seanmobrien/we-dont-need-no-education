import * as React from 'react';
import { PageContainer } from '@toolpad/core/PageContainer';
import { SessionProvider } from '@compliance-theater/auth/client';
import { auth } from '@compliance-theater/auth/server';

import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import Box from '@mui/material/Box';

const StablePageBoxSx = {
  width: '100%',
  '& > :not(style)': {
    m: 1,
  },
};

const DashboardPage = async ({ children }: React.PropsWithChildren<object>) => {
  const session = await auth();

  return (
    <SessionProvider>
      <EmailDashboardLayout session={session}>
        <PageContainer>
          <Box sx={StablePageBoxSx}>{children}</Box>
        </PageContainer>
      </EmailDashboardLayout>
    </SessionProvider>
  );
};

export default DashboardPage;

