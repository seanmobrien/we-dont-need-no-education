import * as React from 'react';
import { PageContainer } from '@toolpad/core/PageContainer';
import { SessionProvider as _SessionProvider } from '@compliance-theater/auth-compat/runtime';
import { auth } from '@compliance-theater/auth/server';

import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';

// In Next.js 13+ (app directory), layout components can receive route parameters via the `params` prop.
// Your usage is correct if this file is in the /app/messages directory and you are using the app router.

const SessionProvider = _SessionProvider as React.ComponentType<{ session?: unknown; children?: React.ReactNode; }>;
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

