import { memo, useMemo } from 'react';
import { DashboardSidebarPageItem } from '@toolpad/core/DashboardLayout';
import siteBuilder from '@/lib/site-util/url-builder';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import NextLink from 'next/link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Tooltip from '@mui/material/Tooltip';
import { getLastPathSegment } from './url-utils';
const stableSx = {
    activeText: {
        color: 'warning.main',
    },
    primaryText: {
        color: 'text.primary',
    },
    rootItemBase: {
        color: 'primary.main',
        overflowX: 'hidden',
        paddingY: 0,
    },
    rootItemPadMini: { pl: 0 },
    rootItemPadFull: { pl: 1 },
    childContainerBase: {
        color: 'text.primary',
        overflowX: 'hidden',
        paddingY: 0,
        paddingRight: 0,
        width: 1,
    },
    childPadMini: { pl: 0 },
    childPadFull: { pl: 4 },
    secondaryIcon: {
        color: 'secondary.main',
    },
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
    },
    listReset: {
        padding: 0,
        margin: 0,
        width: 1,
    },
    listItemButton: { pr: 0 },
    iconBox: { maxWidth: 40, pr: 0 },
};
export const CustomEmailPageItem = memo(({ item: { children = [], ...item }, mini, pathname, emailId, }) => {
    const itemId = `navmenu-email-${item.title?.toLocaleLowerCase()?.replaceAll(' ', '-')}`;
    const parentHref = emailId && (item.title === 'View Email' || item.title === 'Email')
        ? siteBuilder.messages.email(emailId)
        : `/${item.segment ?? ''}`;
    const lastSegment = useMemo(() => getLastPathSegment(pathname), [pathname]);
    return (<>
        <ListItem sx={[
            stableSx.rootItemBase,
            mini ? stableSx.rootItemPadMini : stableSx.rootItemPadFull,
        ]}>
          {mini ? (item.icon ? (<Tooltip title={item.title ?? 'Open'} placement="right" describeChild arrow>
                <IconButton aria-label={item.title ?? 'Open'} data-id={itemId} sx={stableSx.secondaryIcon}>
                  {item.icon}
                </IconButton>
              </Tooltip>) : null) : (<ListItemButton sx={stableSx.listItemButton}>
              <Link data-id={itemId} component={NextLink} href={parentHref.toString()} aria-current={pathname.toString() === parentHref.toString()
                ? 'page'
                : undefined} sx={stableSx.link}>
                {item.icon ? (<Box sx={stableSx.iconBox}>
                    <ListItemIcon sx={stableSx.primaryText}>
                      {item.icon}
                    </ListItemIcon>
                  </Box>) : null}

                {item.title}
              </Link>
            </ListItemButton>)}
        </ListItem>
        <ListItem sx={[
            stableSx.childContainerBase,
            mini ? stableSx.childPadMini : stableSx.childPadFull,
        ]}>
          <List sx={stableSx.listReset} aria-label={item.title ? `${item.title} sections` : 'Email sections'}>
            {children.map((child, idx) => {
            const key = 'segment' in child && child.segment ? child.segment : idx;
            const childSegment = typeof key === 'string' ? key : undefined;
            const cleanPath = String(pathname ?? '')
                .split('?')[0]
                .split('#')[0];
            const isActive = !!childSegment &&
                (lastSegment === childSegment ||
                    cleanPath.endsWith(`/${childSegment}`));
            const sx = isActive ? stableSx.activeText : undefined;
            return (<Box key={key} sx={sx} data-active={isActive ? 'true' : undefined}>
                  <DashboardSidebarPageItem item={child}/>
                </Box>);
        })}
          </List>
        </ListItem>
      </>);
});
CustomEmailPageItem.displayName = 'CustomEmailPageItem';
//# sourceMappingURL=custom-email-page-item.jsx.map