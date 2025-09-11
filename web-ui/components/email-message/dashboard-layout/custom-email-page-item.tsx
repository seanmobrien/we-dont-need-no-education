/**
 * @fileoverview Custom Email Page Item Component for Email Dashboard Layout
 *
 * This module provides the CustomEmailPageItem component used in the email dashboard
 * navigation sidebar. It renders email-specific navigation items with their children,
 * supporting both mini and full sidebar modes.
 *
 * @module components/email-message/dashboard-layout/custom-email-page-item
 * @version 1.0.0
 * @since 2025-07-19
 */

import { memo, useMemo } from 'react';
import { DashboardSidebarPageItem } from '@toolpad/core/DashboardLayout';
import { NavigationPageItem } from '@toolpad/core/AppProvider';
import siteBuilder from '@/lib/site-util/url-builder';
import type { CustomEmailPageItemProps } from './types';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import type { SxProps, Theme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import { getLastPathSegment, normalizePath } from '@/lib/react-util/url';

const stableSx = {
  activeText: {
    color: 'warning.main',
  } satisfies SxProps<Theme>,
  primaryText: {
    color: 'text.primary',
  } satisfies SxProps<Theme>,
  rootItemBase: {
    color: 'primary.main',
    overflowX: 'hidden',
    paddingY: 0,
  } satisfies SxProps<Theme>,
  rootItemPadMini: { pl: 0 } satisfies SxProps<Theme>,
  rootItemPadFull: { pl: 1 } satisfies SxProps<Theme>,
  childContainerBase: {
    color: 'text.primary',
    overflowX: 'hidden',
    paddingY: 0,
    paddingRight: 0,
    width: 1,
  } satisfies SxProps<Theme>,
  childPadMini: { pl: 0 } satisfies SxProps<Theme>,
  childPadFull: { pl: 4 } satisfies SxProps<Theme>,
  secondaryIcon: {
    color: 'secondary.main',
  } satisfies SxProps<Theme>,
  link: {
    color: 'warning.main',
    textDecoration: 'none',
    width: 1,
    display: 'flex',
    alignItems: 'center',
    paddingRight: 0,
    '&:hover': { textDecoration: 'underline' },
    '&:focusVisible': {
      outline: '2px solid',
      outlineColor: 'primary.main',
      outlineOffset: 2,
    },
  } satisfies SxProps<Theme>,
  listReset: {
    padding: 0,
    margin: 0,
    width: 1,
  } satisfies SxProps<Theme>,
  listItemButton: { pr: 0 } satisfies SxProps<Theme>,
  iconBox: { maxWidth: 40, pr: 0 } satisfies SxProps<Theme>,
} as const;

/**
 * CustomEmailPageItem renders a navigation item for an email, including its children.
 *
 * @description This component creates a specialized navigation item in the email dashboard
 * sidebar that can display email-specific information and child navigation items.
 * It supports both mini (icon-only) and full sidebar modes, and handles the hierarchical
 * display of email navigation items.
 *
 * @component
 * @param props - The properties for the custom email page item
 * @param props.item - The navigation page item containing title, icon, and children
 * @param props.mini - Whether the sidebar is in mini (collapsed) mode
 * @param props.emailId - The ID of the email for generating navigation links
 * @returns A React element representing the custom email page item
 *
 * @example
 * ```tsx
 * <CustomEmailPageItem
 *   item={{
 *     title: 'View Email',
 *     icon: <DraftsIcon />,
 *     children: [
 *       { title: 'Key Points', segment: 'key-points', icon: <KeyIcon /> },
 *       { title: 'Notes', segment: 'notes', icon: <TextSnippetIcon /> }
 *     ]
 *   }}
 *   mini={false}
 *   emailId="email-123"
 * />
 * ```
 */
export const CustomEmailPageItem = memo(
  ({
    item: { children = [], ...item },
    mini,
    pathname,
    emailId,
  }: CustomEmailPageItemProps): React.JSX.Element => {
    const itemId = `navmenu-email-${item.title?.toLocaleLowerCase()?.replaceAll(' ', '-')}`;
    const parentHref = String(
      emailId && (item.title === 'View Email' || item.title === 'Email') ? siteBuilder.messages.email(emailId) : `/${item.segment ?? ''}`,
    );
    const lastSegment = useMemo(() => getLastPathSegment(pathname), [pathname]);
    return (
      <>
        <ListItem
          sx={[
            stableSx.rootItemBase,
            mini ? stableSx.rootItemPadMini : stableSx.rootItemPadFull,
          ]}
        >
          {mini ? (
            item.icon ? (
              <Tooltip
                title={item.title ?? 'Open'}
                placement="right"
                describeChild
                arrow
              >
                <IconButton
                  aria-label={item.title ?? 'Open'}
                  data-id={itemId}
                  sx={stableSx.secondaryIcon}
                >
                  {item.icon}
                </IconButton>
              </Tooltip>
            ) : null
          ) : (
            <ListItemButton sx={stableSx.listItemButton}>
              <Link
                data-id={itemId}
                component={NextLink}
                href={parentHref}
                aria-current={
                  normalizePath(pathname ?? '') === normalizePath(parentHref)
                    ? 'page'
                    : undefined
                }
                sx={stableSx.link}
              >
                {item.icon ? (
                  <Box sx={stableSx.iconBox}>
                    <ListItemIcon sx={stableSx.primaryText}>
                      {item.icon}
                    </ListItemIcon>
                  </Box>
                ) : null}

                {item.title}
              </Link>
            </ListItemButton>
          )}
        </ListItem>
        <ListItem
          sx={[
            stableSx.childContainerBase,
            mini ? stableSx.childPadMini : stableSx.childPadFull,
          ]}
        >
          <List
            sx={stableSx.listReset}
            aria-label={
              item.title ? `${item.title} sections` : 'Email sections'
            }
          >
            {children.map((child, idx) => {
              const key =
                'segment' in child && child.segment ? child.segment : idx;
              const childSegment = typeof key === 'string' ? key : undefined;
              const cleanPath = (pathname ?? '').split('?')[0].split('#')[0];
              const isActive =
                !!childSegment &&
                (lastSegment === childSegment ||
                  cleanPath.endsWith(`/${childSegment}`));
              const sx = isActive ? stableSx.activeText : undefined;
              return (
                <Box
                  key={key}
                  sx={sx}
                  data-active={isActive ? 'true' : undefined}
                >
                  <DashboardSidebarPageItem
                    item={child as NavigationPageItem}
                  />
                </Box>
              );
            })}
          </List>
        </ListItem>
      </>
    );
  },
);

CustomEmailPageItem.displayName = 'CustomEmailPageItem';
