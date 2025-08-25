'use client';

import { NextAppProvider } from '@toolpad/core/nextjs';
import {
  DashboardLayout,
  DashboardSidebarPageItem,
} from '@toolpad/core/DashboardLayout';

import Sync from '@mui/icons-material/Sync';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DraftsIcon from '@mui/icons-material/Drafts';
import ChatIcon from '@mui/icons-material/Chat';
import BarChartIcon from '@mui/icons-material/BarChart';
import { NavigationItem, NavigationPageItem } from '@toolpad/core/AppProvider';
import KeyIcon from '@mui/icons-material/Key';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import CallToActionIcon from '@mui/icons-material/CallToAction';
import ReplyIcon from '@mui/icons-material/Reply';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import { Session } from 'next-auth';
import { EmailContextProvider } from '@/components/email-message/email-context';
import { useCallback, useMemo } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useTheme } from '@/lib/themes/provider';

// Import extracted components
import { CustomEmailPageItem } from './custom-email-page-item';
import { EmailDashboardToolbarAction } from './email-dashboard-toolbar-action';
import { Branding } from './branding';
import { NotificationsProvider } from '@toolpad/core';
import { KeyRefreshNotifyWrapper } from '@/components/auth/key-refresh-notify/wrapper';
import ServerSafeErrorManager from '@/components/error-boundaries/ServerSafeErrorManager';



/**
 * Slots for the dashboard layout, such as toolbar actions.
 * @type {{ toolbarActions: typeof EmailDashboardToolbarAction }}
 */
const stableDashboardSlots = {
  toolbarActions: EmailDashboardToolbarAction,
};
const stableDashboardSx = {
  '& > .MuiDrawer-root .MuiToolbar-gutters': {
    minHeight: '82px',
  },
  '& > .MuiBox-root > .MuiToolbar-gutters': {
    minHeight: '82px',
  },
};

/**
 * Props for EmailDashboardLayout component.
 * @typedef {Object} EmailDashboardLayoutProps
 * @property {React.ReactNode} children - The child components to render inside the layout.
 * @property {Session | null} session - The current user session.
 */
/**
 * EmailDashboardLayout is the main layout component for the email dashboard pages.
 * @param {EmailDashboardLayoutProps} props
 * @returns {JSX.Element}
 */
export const EmailDashboardLayout = ({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}): React.JSX.Element => {
  const { emailId } = useParams<{ emailId: string }>();
  const pathname = usePathname();
  const { theme } = useTheme();
  const dashboardNavigation = useMemo<NavigationItem[]>(() => {
    const isChatPage = pathname?.startsWith('/messages/chat');
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
              segment: 'email-header',
              icon: <PrivacyTipIcon key="header-icon" />,
              title: 'Headers',
            },
          ],
        },
      ]
    : [];    
    const chatNavigation: NavigationItem[] = [
      {
        title: 'Chat History',
        icon: <ChatIcon key="chats-icon" />, 
        segment: 'messages/chat', 
        children: isChatPage
          ? [
          {
            segment: 'stats',
            icon: <BarChartIcon key="statistics-icon" />,
            title: 'View chat statistics',
          },
        ] : []     
      },      
    ];

    return [
      { kind: 'header', title: 'Available Records' },
      {
        title: 'List Emails',
        icon: <DashboardIcon key="list-emails-icon" />,
        segment: 'messages',
      },
      ...viewEmailNavigation,
      { kind: 'divider' },
      { kind: 'header', title: 'Chat' },
      ...chatNavigation,
      { kind: 'divider' },
      { kind: 'header', title: 'Acquisition' },
      {
        segment: 'messages/import',
        title: 'Import Emails',
        icon: <Sync key="import-emails-icon" />,
      },
    ];
  }, [emailId, pathname]);
  /**
   * Renders a navigation page item in the sidebar.
   * @param {NavigationPageItem} item - The navigation item to render.
   * @param {{ mini: boolean }} options - Sidebar options.
   * @returns {JSX.Element | null}
   */
  const renderPageItem = useCallback(
    (item: NavigationPageItem, { mini }: { mini: boolean }): React.JSX.Element | null => {
      const emailChildren = [
        'key-points',
        'notes',
        'call-to-action',
        'call-to-action-response',
        'email-header',
      ];
      const dynamicMenus = ['View Email', 'Chat History'];
      if (
        'segment' in item &&
        !!item.segment &&
        emailChildren.includes(item.segment)
      ) {
        return null;
      }
      if (dynamicMenus.includes(item.title ?? '')) {
        return (
          <CustomEmailPageItem item={item} mini={mini} emailId={emailId} data-id={`navmenu-email-${item.segment}`} pathname={pathname} />
        );
      }
      return <DashboardSidebarPageItem item={item} />;
    },
    [emailId, pathname],
  );
  return (
    <EmailContextProvider>
      <ServerSafeErrorManager />      
      <NextAppProvider
        theme={theme}
        navigation={dashboardNavigation}
        branding={Branding}
        session={session ?? null}
      >
        <DashboardLayout
          renderPageItem={renderPageItem}
          slots={stableDashboardSlots}
          sx={stableDashboardSx}
        >
          <KeyRefreshNotifyWrapper />
          <NotificationsProvider>{children}</NotificationsProvider>
        </DashboardLayout>
      </NextAppProvider>
    </EmailContextProvider>
  );
};
