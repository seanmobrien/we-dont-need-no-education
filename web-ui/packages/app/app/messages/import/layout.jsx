import * as React from 'react';
import { PageContainer } from '@toolpad/core/PageContainer';
import { SessionProvider } from 'next-auth/react';
import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
export default async function DashboardPagesLayout({ children, }) {
    const session = await auth();
    return (<SessionProvider session={session}>
      <EmailDashboardLayout session={session}>
        <PageContainer>{children}</PageContainer>
      </EmailDashboardLayout>
    </SessionProvider>);
}
//# sourceMappingURL=layout.jsx.map