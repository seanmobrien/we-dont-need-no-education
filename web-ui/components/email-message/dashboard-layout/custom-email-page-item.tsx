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

import * as React from 'react';
import { DashboardSidebarPageItem } from '@toolpad/core/DashboardLayout';
import { NavigationPageItem } from '@toolpad/core/AppProvider';
import siteBuilder from '@/lib/site-util/url-builder';
import type { CustomEmailPageItemProps } from './types';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import { Theme } from '@mui/material/styles';



const stableActiveText = (
  theme: Theme & { palette?: { warning?: { main?: string } } },
) => ({
  color: theme?.palette?.warning?.main,
});

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
export const CustomEmailPageItem = React.memo(
  ({
    item: { children = [], ...item },
    mini,
    pathname,
    emailId,
  }: CustomEmailPageItemProps): React.JSX.Element => {
    const itemId = `navmenu-email-${item.title?.toLocaleLowerCase()?.replaceAll(' ', '-')}`;
    console.log(itemId);
    return (
      <>        
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
              data-id={itemId}
              sx={(theme) => ({
                color: theme.palette.secondary.main,
              })}
            >
              {item.icon!}
            </IconButton>
          ) : (
            <ListItemButton sx={{ paddingRight: 0 }} >
              <Link
              data-id={itemId}
                href={String(emailId 
                  ? siteBuilder.messages.email(emailId)
                  : `/${item.segment ?? ''}`)}
                sx={(theme) => ({
                  color: theme.palette.warning.main,
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
                      color: theme.palette.text.primary,
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
            color: theme.palette.text.primary,
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
              const sx = typeof key === 'string' && pathname?.endsWith(key) ? stableActiveText : undefined;
              return (
                <Box key={key} sx={sx}>
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
