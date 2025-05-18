'use client';

import * as React from 'react';

import { NextAppProvider } from '@toolpad/core/nextjs';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';

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
import { Session } from 'next-auth';
import { EmailContextProvider } from '@/components/email-message/email-context';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';

const Branding = {
  title: 'Sue the Schools',
};

export const EmailDashboardLayout = ({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) => {
  const { emailId } = useParams<{ emailId: string }>();

  console.log('Email ID in layout:', emailId ?? 'undefined');
  const dashboardNavigation = useMemo<NavigationItem[]>(() => {
    const viewEmailNavigation: NavigationItem[] = emailId
      ? [
          {
            segment: `messages/email/${emailId}`,
            title: 'View Email',
            icon: <DraftsIcon key="view-email-icon" />,
            children: [
              {
                segment: 'key-points',
                icon: <KeyIcon key="key-points-icon" />,
                title: 'Key Points',
              },
              {
                segment: 'notes',
                icon: <TextSnippetIcon key="notes-icon" />,
                title: 'Notes',
              },
              {
                segment: 'call-to-action',
                icon: <CallToActionIcon key="call-to-action-icon" />,
                title: 'Calls to Action',
              },
              {
                segment: 'call-to-action-response',
                icon: <ReplyIcon key="call-to-action-response-icon" />,
                title: 'Follow-up Activity',
              },
              {
                segment: 'violations',
                icon: <GppBadIcon key="violations-icon" />,
                title: 'Violations',
              },
              {
                segment: 'compliance-scores',
                icon: <AssuredWorkloadIcon key="compliance-scores-icon" />,
                title: 'Compliance',
              },
              {
                segment: 'header',
                icon: <PrivacyTipIcon key="header-icon" />,
                title: 'Headers',
              },
            ],
          },
        ]
      : [];
    return [
      { kind: 'header', title: 'Available Records' },
      {
        title: 'List Emails',
        icon: <DashboardIcon key="list-emails-icon" />,
        segment: 'messages',
      },
      ...viewEmailNavigation,
      { kind: 'divider' },
      { kind: 'header', title: 'Aquisition' },
      {
        segment: 'messages/import',
        title: 'Import Emails',
        icon: <Sync key="import-emails-icon" />,
      },
    ];
  }, [emailId]);

  return (
    <EmailContextProvider>
      <NextAppProvider
        navigation={dashboardNavigation}
        branding={Branding}
        session={session ?? null}
      >
        <DashboardLayout>{children}</DashboardLayout>
      </NextAppProvider>
    </EmailContextProvider>
  );
};
