import * as React from 'react';
import { PageContainer } from '@toolpad/core/PageContainer';
import { SessionProvider } from 'next-auth/react';
import { auth } from '@compliance-theater/auth';

import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';

// In Next.js 13+ (app directory), layout components can receive route parameters via the `params` prop.
// Your usage is correct if this file is in the /app/messages directory and you are using the app router.

export default async function DashboardPagesLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ emailId?: string }>;
}) {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <EmailDashboardLayout session={session}>
        <PageContainer>{children}</PageContainer>
      </EmailDashboardLayout>
    </SessionProvider>
  );
}
