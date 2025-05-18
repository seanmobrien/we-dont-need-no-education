import * as React from 'react';
import { PageContainer } from '@toolpad/core/PageContainer';
import { SessionProvider } from 'next-auth/react';
import { auth } from '@/auth';

import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import { extractParams } from '@/lib/nextjs-util';

// In Next.js 13+ (app directory), layout components can receive route parameters via the `params` prop.
// Your usage is correct if this file is in the /app/messages directory and you are using the app router.

export default async function DashboardPagesLayout({
  children,
  ...pageProps
}: {
  children: React.ReactNode;
  params: Promise<{ emailId?: string }>;
}) {
  const session = await auth();
  const { emailId } = await extractParams(pageProps);

  return (
    <SessionProvider session={session}>
      <EmailDashboardLayout session={session} emailId={emailId}>
        <PageContainer>{children}</PageContainer>
      </EmailDashboardLayout>
    </SessionProvider>
  );
}
