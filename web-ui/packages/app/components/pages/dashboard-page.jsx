import * as React from 'react';
import { PageContainer } from '@toolpad/core/PageContainer';
import { SessionProvider } from 'next-auth/react';
import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import Box from '@mui/material/Box';
const StablePageBoxSx = {
    width: '100%',
    '& > :not(style)': {
        m: 1,
    },
};
const DashboardPage = async ({ children }) => {
    const session = await auth();
    return (<SessionProvider session={session}>
      <EmailDashboardLayout session={session}>
        <PageContainer>
          <Box sx={StablePageBoxSx}>{children}</Box>
        </PageContainer>
      </EmailDashboardLayout>
    </SessionProvider>);
};
export default DashboardPage;
//# sourceMappingURL=dashboard-page.jsx.map