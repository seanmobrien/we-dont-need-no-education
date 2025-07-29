'use client';

import * as React from 'react';

import { NextAppProvider } from '@toolpad/core/nextjs';
import {
  DashboardLayout,
  DashboardSidebarPageItem,
} from '@toolpad/core/DashboardLayout';
import {
  Box,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  Stack,
} from '@mui/material';

import Sync from '@mui/icons-material/Sync';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DraftsIcon from '@mui/icons-material/Drafts';
import { NavigationItem, NavigationPageItem } from '@toolpad/core/AppProvider';
import KeyIcon from '@mui/icons-material/Key';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import CallToActionIcon from '@mui/icons-material/CallToAction';
import ReplyIcon from '@mui/icons-material/Reply';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import { Session } from 'next-auth';
import { EmailContextProvider } from '@/components/email-message/email-context';
import { ThemeSelector } from '@/components/theme/theme-selector';
import { useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import siteBuilder from '@/lib/site-util/url-builder';
import { Account } from '@toolpad/core/Account';



/**
 * Branding information for the dashboard layout.
 * @type {{ title: string; logo: React.ComponentType<object> }}
 */
const Branding = {
  title: 'Mystery Compliance Theater 2000',
  // eslint-disable-next-line @next/next/no-img-element
  logo: <><img
    src="/badge_40x40.png"
    alt="Mystery Compliance Theater 2000 Logo"
    style={{ width: '40px', height: '40px' }} /></>,
} as const;

/**
 * Props for CustomEmailPageItem component.
 * @typedef {Object} CustomEmailPageItemProps
 * @property {NavigationPageItem} item - The navigation item to render.
 * @property {boolean} mini - Whether the sidebar is in mini mode.
 * @property {string} emailId - The current email ID.
 */
/**
 * CustomEmailPageItem renders a navigation item for an email, including its children.
 * @param {CustomEmailPageItemProps} props
 * @returns {JSX.Element}
 */
const CustomEmailPageItem = React.memo(
  ({
    item: { children = [], ...item },
    mini,
    emailId,
  }: {
    item: NavigationPageItem;
    mini: boolean;
    emailId: string;
  }): React.JSX.Element => {
    return (
      <>
        {/* ...existing code... */}
        <ListItem
          sx={(theme) => ({
            color: theme.palette.primary.main,
            overflowX: 'hidden',
            paddingLeft: mini ? 0 : theme.spacing(1),
            paddingY: 0,
          })}
        >
          {mini ? (
            <IconButton
              aria-label="custom"
              sx={(theme) => ({
                color: theme.palette.secondary.main,
              })}
            >
              {item.icon!}
            </IconButton>
          ) : (
            <ListItemButton sx={{ paddingRight: 0 }}>
              <Link
                href={siteBuilder.messages.email(emailId).toString()}
                sx={(theme) => ({
                  color: theme.palette.secondary.main,
                  textDecoration: 'none',
                  width: 1,
                  display: 'flex',
                  alignItems: 'center',
                  paddingRight: 0,
                })}
              >
                <Box
                  sx={{
                    maxWidth: 40,
                    paddingRight: 0,
                  }}
                >
                  <ListItemIcon
                    sx={(theme) => ({
                      color: theme.palette.primary.main,
                    })}
                  >
                    {item.icon!}
                  </ListItemIcon>
                </Box>

                {item.title}
              </Link>
            </ListItemButton>
          )}
        </ListItem>
        <ListItem
          sx={(theme) => ({
            color: theme.palette.primary.main,
            overflowX: 'hidden',
            paddingLeft: mini ? 0 : theme.spacing(4),
            paddingY: 0,
            paddingRight: 0,
            width: 1,
          })}
        >
          <List
            sx={{
              padding: 0,
              margin: 0,
              width: 1,
            }}
          >
            {children.map((child, idx) => {
              const key =
                'segment' in child && child.segment ? child.segment : idx;
              return (
                <DashboardSidebarPageItem
                  item={child as NavigationPageItem}
                  key={key}
                ></DashboardSidebarPageItem>
              );
            })}
          </List>
        </ListItem>
        {/* ...existing code... */}
      </>
    );
  },
);
CustomEmailPageItem.displayName = 'CustomEmailPageItem';

/**
 * EmailDashboardToolbarAction renders the toolbar actions (theme selector and account).
 * @returns {JSX.Element}
 */
const EmailDashboardToolbarAction = React.memo((): React.JSX.Element => {
  return (
    <Stack direction="row">
      <ThemeSelector />
      <Account />
    </Stack>
  );
});
EmailDashboardToolbarAction.displayName = 'EmailDashboardToolbarAction';

/**
 * Slots for the dashboard layout, such as toolbar actions.
 * @type {{ toolbarActions: typeof EmailDashboardToolbarAction }}
 */
const stableDashboardSlots = {
  toolbarActions: EmailDashboardToolbarAction,
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
                segment: 'email-header',
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
      if (
        'segment' in item &&
        !!item.segment &&
        emailChildren.includes(item.segment)
      ) {
        return null;
      }
      if (item.title === 'View Email') {
        return (
          <CustomEmailPageItem item={item} mini={mini} emailId={emailId} />
        );
      }
      return <DashboardSidebarPageItem item={item} />;
    },
    [emailId],
  );

  return (
    <EmailContextProvider>
      <NextAppProvider
        navigation={dashboardNavigation}
        branding={Branding}
        session={session ?? null}
      >
        <DashboardLayout
          renderPageItem={renderPageItem}
          slots={stableDashboardSlots}
        >
          {children}
        </DashboardLayout>
      </NextAppProvider>
    </EmailContextProvider>
  );
};
