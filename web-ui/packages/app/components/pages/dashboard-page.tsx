import * as React from 'react';
import { PageContainer } from '@toolpad/core/PageContainer';
import { SessionProvider as _SessionProvider } from '@compliance-theater/auth-compat/runtime';
import { auth } from '@compliance-theater/auth/server';

import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import Box from '@mui/material/Box';

const SessionProvider = _SessionProvider as React.ComponentType<{ session?: unknown; children?: React.ReactNode; }>;
const StablePageBoxSx = {
  width: '100%',
  '& > :not(style)': {
    m: 1,
  },
};

const DashboardPage = async ({ children }: React.PropsWithChildren<object>) => {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <EmailDashboardLayout session={session}>
        <PageContainer>
          <Box sx={StablePageBoxSx}>{children}</Box>
        </PageContainer>
      </EmailDashboardLayout>
    </SessionProvider>
  );
};

export default DashboardPage;

