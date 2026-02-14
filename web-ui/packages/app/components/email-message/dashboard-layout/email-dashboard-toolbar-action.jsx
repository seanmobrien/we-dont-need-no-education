import * as React from 'react';
import Stack from '@mui/material/Stack';
import { ThemeSelector } from '@compliance-theater/themes';
import { Account } from '@toolpad/core/Account';
export const EmailDashboardToolbarAction = React.memo(() => {
    return (<Stack direction="row" spacing={1} alignItems="center">
      <ThemeSelector />
      <Account />
    </Stack>);
});
EmailDashboardToolbarAction.displayName = 'EmailDashboardToolbarAction';
//# sourceMappingURL=email-dashboard-toolbar-action.jsx.map