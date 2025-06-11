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
import ReplyIcon from '@mui/icons-material/Reply';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import { Session } from 'next-auth';
import { EmailContextProvider } from '@/components/email-message/email-context';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';

const Branding = {
  title: 'Mystery Compliance Theater 2000',
};

export const EmailDashboardLayout = ({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) => {
  const { emailId } = useParams<{ emailId: string }>();

  const dashboardNavigation = useMemo<NavigationItem[]>(() => {
    const viewEmailNavigation: NavigationItem[] = emailId
      ? [
          {
            segment: `messages/email/${emailId}`,
            title: 'View Email',
            icon: <DraftsIcon key="view-email-icon" />,
          },
          {
            segment: `messages/email/${emailId}/key-points`,
            icon: <KeyIcon key="key-points-icon" />,
            title: 'Key Points',
          },
          {
            segment: `messages/email/${emailId}/notes`,
            icon: <TextSnippetIcon key="notes-icon" />,
            title: 'Notes',
          },
          {
            segment: `messages/email/${emailId}/call-to-action`,
            icon: <CallToActionIcon key="call-to-action-icon" />,
            title: 'Calls to Action',
          },
          {
            segment: `messages/email/${emailId}/call-to-action-response`,
            icon: <ReplyIcon key="call-to-action-response-icon" />,
            title: 'Follow-up Activity',
          },
          {
            segment: `messages/email/${emailId}/email-header`,
            icon: <PrivacyTipIcon key="header-icon" />,
            title: 'Headers',
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
