import * as React from 'react';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { PageContainer } from '@toolpad/core/PageContainer';

import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderIcon from '@mui/icons-material/Folder';
import Sync from '@mui/icons-material/Sync';
import { NextAppProvider } from '@toolpad/core/nextjs';
import { signIn, signOut, SessionProvider } from 'next-auth/react';
import { auth } from '@/auth';

export const NAVIGATION = [
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

const AUTHENTICATION = {
  signIn,
  signOut,
};
const BRANDING = {
  title: 'Sue the Schools',
};

export default async function DashboardPagesLayout(props: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <SessionProvider session={session}>
      <NextAppProvider
        navigation={NAVIGATION}
        branding={BRANDING}
        session={session}
        authentication={AUTHENTICATION}
      >
        <DashboardLayout>
          <PageContainer>{props.children}</PageContainer>
        </DashboardLayout>
      </NextAppProvider>
    </SessionProvider>
  );
}
