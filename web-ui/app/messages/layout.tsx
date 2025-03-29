import * as React from 'react';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { PageContainer } from '@toolpad/core/PageContainer';
import { NextAppProvider } from '@toolpad/core/nextjs';
import { SessionProvider } from 'next-auth/react';
import { auth, signIn, signOut } from '@/auth';

import Sync from '@mui/icons-material/Sync';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DraftsIcon from '@mui/icons-material/Drafts';
import { NavigationItem } from '@toolpad/core/AppProvider';
import KeyIcon from '@mui/icons-material/Key';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import CallToActionIcon from '@mui/icons-material/CallToAction';
import GppBadIcon from '@mui/icons-material/GppBad';
import ReplyIcon from '@mui/icons-material/Reply';
import AssuredWorkloadIcon from '@mui/icons-material/AssuredWorkload';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';

const DashboardNavigation: NavigationItem[] = [
  { kind: 'header', title: 'Available Records' },
  {
    title: 'List Emails',
    icon: <DashboardIcon />,
    segment: 'messages',
  },
  {
    segment: 'messages/email',
    title: 'View Email',
    icon: <DraftsIcon />,
    pattern: 'email/:emailId',
    children: [
      {
        segment: 'key-points',
        icon: <KeyIcon />,
        title: 'Key Points',
        pattern: 'messages/email/:emailId/key-points',
      },
      {
        segment: 'messages/email/:emailId/notes',
        icon: <TextSnippetIcon />,
        title: 'Notes',
      },
      {
        segment: 'messages/email/:emailId/call-to-action',
        icon: <CallToActionIcon />,
        title: 'Calls to Action',
      },
      {
        segment: 'messages/email/:emailId/call-to-action-response',
        icon: <ReplyIcon />,
        title: 'Follow-up Activity',
      },
      {
        segment: 'messages/email/:emailId/violations',
        icon: <GppBadIcon />,
        title: 'Violations',
      },
      {
        segment: 'messages/email/:emailId/compliance-scores',
        icon: <AssuredWorkloadIcon />,
        title: 'Compliance',
      },
      {
        segment: 'messages/email/:emailId/header',
        icon: <PrivacyTipIcon />,
        title: 'Headers',
      },
    ],
  },

  { kind: 'divider' },
  { kind: 'header', title: 'Aquisition' },
  {
    segment: 'messages/import',
    title: 'Import Emails',
    icon: <Sync />,
  },
];
const Branding = {
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
