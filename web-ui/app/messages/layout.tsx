import * as React from 'react';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { PageContainer } from '@toolpad/core/PageContainer';
import { NextAppProvider } from '@toolpad/core/nextjs';
import { SessionProvider } from 'next-auth/react';
import { auth, signIn, signOut } from '@/auth';

import Sync from '@mui/icons-material/Sync';
import DashboardIcon from '@mui/icons-material/Dashboard';

export const Authentication = {
  signIn,
  signOut,
};

export const DashboardNavigation = [
  {
    title: 'Dashboard',
    icon: <DashboardIcon />,
    segment: 'messages',
  },
  {
    segment: 'messages/import',
    title: 'Import Emails',
    icon: <Sync />,
  },
];
export const Branding = {
  title: 'Sue the Schools',
};

export default async function DashboardPagesLayout(props: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <SessionProvider session={session}>
      <NextAppProvider
        navigation={DashboardNavigation}
        branding={Branding}
        session={session}
      >
        <DashboardLayout>
          <PageContainer>{props.children}</PageContainer>
        </DashboardLayout>
      </NextAppProvider>
    </SessionProvider>
  );
}
